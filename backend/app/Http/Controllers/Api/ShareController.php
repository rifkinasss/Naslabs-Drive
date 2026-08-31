<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\FileShare;
use App\Models\Folder;
use App\Models\FolderShare;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\StorageService;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ShareController extends Controller
{
    public function __construct(private StorageService $storageService, private ActivityLogService $logService) {}

    public function folderActivity(Request $request): JsonResponse
    {
        $activities = $request->user()->activityLogs()->whereIn('action', ['shared_upload', 'shared_download', 'shared_preview', 'shared_rename', 'shared_delete', 'shared_create_folder'])->latest()->limit(50)->get();
        return response()->json(['activities' => $activities]);
    }

    public function userSearch(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) return response()->json(['users' => []]);
        $users = User::query()->where('id', '!=', $request->user()->id)
            ->where('is_drive_enabled', true)
            ->where(fn ($q) => $q->where('email', 'like', "%{$query}%")->orWhere('name', 'like', "%{$query}%"))
            ->orderBy('name')->limit(8)->get(['id', 'name', 'email']);
        return response()->json(['users' => $users]);
    }

    public function folderIndex(Request $request): JsonResponse
    {
        $shares = FolderShare::with('folder')->where('created_by', $request->user()->id)->latest()->get()->map(fn (FolderShare $share) => [
            'id' => $share->id,
            'folder_uuid' => $share->folder?->uuid,
            'token' => $share->token,
            'folder_name' => $share->folder?->name,
            'expires_at' => $share->expires_at,
            'permission' => $share->permission,
            'visibility' => $share->visibility,
            'recipients' => $share->recipients()->with('user:id,name,email')->get()->map(fn ($recipient) => $recipient->user),
            'available' => $share->isAvailable(),
            'created_at' => $share->created_at,
        ]);
        return response()->json(['shares' => $shares]);
    }

    public function folderStore(Request $request, string $uuid): JsonResponse
    {
        $request->merge(['visibility' => $request->input('visibility', 'public'), 'permission' => $request->input('permission', 'viewer')]);
        $shareExpiryDays = (int) (SystemSetting::where('key', 'share_expiry_days')->value('value') ?: 30);
        $requirePassword = SystemSetting::where('key', 'share_require_password')->value('value') === '1';
        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:4', 'max:72'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'permission' => ['required', 'in:viewer,editor'],
            'visibility' => ['required', 'in:public,restricted'],
            'recipients' => ['required_if:visibility,restricted', 'array', 'min:1'],
            'recipients.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);
        if ($requirePassword && empty($validated['password'])) return response()->json(['message' => 'A password is required for shared links.'], 422);
        $folder = Folder::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        $share = FolderShare::create([
            'folder_id' => $folder->id,
            'created_by' => $request->user()->id,
            'token' => Str::random(64),
            'visibility' => $validated['visibility'],
            'password' => !empty($validated['password']) ? Hash::make($validated['password']) : null,
            'expires_at' => $validated['expires_at'] ?? now()->addDays($shareExpiryDays),
            'permission' => $validated['permission'],
        ]);
        if ($validated['visibility'] === 'restricted') {
            $share->recipients()->createMany(collect($validated['recipients'])->map(fn ($userId) => ['user_id' => $userId])->all());
        }
        $this->logService->log($request->user(), 'share_created', 'folder', $folder->name, $folder->id, $request);
        return response()->json(['share' => [
            'token' => $share->token,
            'folder_name' => $folder->name,
            'expires_at' => $share->expires_at,
            'permission' => $share->permission,
            'visibility' => $share->visibility,
        ]], 201);
    }

    public function folderDestroy(Request $request, string $token): JsonResponse
    {
        FolderShare::where('token', $token)->where('created_by', $request->user()->id)->firstOrFail()->delete();
        return response()->json(['message' => 'Folder share link revoked.']);
    }

    public function updateFolderShare(Request $request, string $uuid, int $shareId): JsonResponse
    {
        $data = $request->validate(['permission' => ['required', 'in:viewer,editor']]);
        $share = FolderShare::where('id', $shareId)->where('created_by', $request->user()->id)->whereHas('folder', fn ($q) => $q->where('uuid', $uuid))->firstOrFail();
        $share->update($data);
        return response()->json(['message' => 'Folder share updated.', 'permission' => $share->permission]);
    }

    public function removeFolderRecipient(Request $request, string $uuid, int $shareId, int $userId): JsonResponse
    {
        $share = FolderShare::where('id', $shareId)->where('created_by', $request->user()->id)->whereHas('folder', fn ($q) => $q->where('uuid', $uuid))->firstOrFail();
        $deleted = $share->recipients()->where('user_id', $userId)->delete();
        abort_if(!$deleted, 404, 'Recipient not found.');
        return response()->json(['message' => 'Recipient access removed.']);
    }

    public function folderInfo(string $token): JsonResponse
    {
        $share = FolderShare::with('folder')->where('token', $token)->firstOrFail();
        if ($share->visibility === 'restricted') {
            $user = Auth::guard('sanctum')->user();
            abort_unless($user && $share->recipients()->where('user_id', $user->id)->exists(), 403, 'This folder is shared with specific accounts only.');
        }
        return response()->json([
            'folder_name' => $share->folder->name,
            'requires_password' => (bool) $share->password,
            'available' => $share->isAvailable(),
            'expires_at' => $share->expires_at,
            'permission' => $share->permission,
            'visibility' => $share->visibility,
        ]);
    }

    public function folderContents(Request $request, string $token): JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token);
        $folder = $share->folder;
        if ($request->filled('folder_uuid')) {
            $target = Folder::where('uuid', $request->string('folder_uuid')->toString())->firstOrFail();
            abort_unless($this->isWithinSharedFolder($target, $folder), 403, 'Folder is outside this share.');
            $folder = $target;
        }
        return response()->json([
            'folder_name' => $folder->name,
            'current_folder_uuid' => $folder->uuid,
            'parent_uuid' => $folder->parent_id === $share->folder_id ? null : $folder->parent?->uuid,
            'permission' => $share->permission,
            'folders' => $folder->children()->orderBy('name')->get(['uuid', 'name', 'color', 'created_at']),
            'files' => $folder->files()->orderBy('name')->get(['uuid', 'name', 'original_name', 'mime_type', 'size', 'created_at']),
        ]);
    }

    public function folderDownloadFile(Request $request, string $token, string $uuid): BinaryFileResponse|JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token);
        $file = FileModel::where('uuid', $uuid)->where('user_id', $share->created_by)->firstOrFail();
        abort_unless($file->folder_id && $this->isWithinSharedFolder($file->folder, $share->folder), 403, 'File is outside this share.');
        if (!Storage::disk('local')->exists($file->storage_path)) return response()->json(['message' => 'Physical file not found.'], 404);
        $this->logService->log($share->creator, 'shared_download', 'shared_file', $file->name, $file->id, $request);
        return response()->download(Storage::disk('local')->path($file->storage_path), $file->original_name, [
            'Content-Type' => $file->mime_type,
            'Accept-Ranges' => 'bytes',
        ]);
    }

    public function folderPreviewFile(Request $request, string $token, string $uuid): BinaryFileResponse|JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token);
        $file = FileModel::where('uuid', $uuid)->where('user_id', $share->created_by)->firstOrFail();
        abort_unless($file->folder_id && $this->isWithinSharedFolder($file->folder, $share->folder), 403, 'File is outside this share.');
        if (!Storage::disk('local')->exists($file->storage_path)) return response()->json(['message' => 'Physical file not found.'], 404);
        $this->logService->log($share->creator, 'shared_preview', 'shared_file', $file->name, $file->id, $request);
        return response()->file(Storage::disk('local')->path($file->storage_path), ['Content-Type' => $file->mime_type, 'Content-Disposition' => 'inline; filename="' . $file->original_name . '"', 'Accept-Ranges' => 'bytes']);
    }

    public function folderUpload(Request $request, string $token): JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token, true);
        $request->validate(['file' => ['required', 'file', 'max:524288']]);
        $folder = $share->folder;
        if ($request->filled('folder_uuid')) {
            $target = Folder::where('uuid', $request->string('folder_uuid')->toString())->firstOrFail();
            abort_unless($this->isWithinSharedFolder($target, $folder), 403, 'Folder is outside this share.');
            $folder = $target;
        }
        try {
            $file = $this->storageService->upload($request->file('file'), $share->creator, $folder->id);
            $this->logService->log($share->creator, 'shared_upload', 'shared_file', $file->name, $file->id, $request);
            return response()->json(['message' => 'File uploaded to shared folder.', 'file' => $file], 201);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function folderCreate(Request $request, string $token): JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token, true);
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'folder_uuid' => ['nullable', 'string'], 'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/']]);
        $parent = $share->folder;
        if (!empty($data['folder_uuid'])) {
            $parent = Folder::where('uuid', $data['folder_uuid'])->firstOrFail();
            abort_unless($this->isWithinSharedFolder($parent, $share->folder), 403, 'Folder is outside this share.');
        }
        $folder = Folder::create(['user_id' => $share->created_by, 'parent_id' => $parent->id, 'name' => $data['name'], 'color' => $data['color'] ?? '#3B82F6']);
        $this->logService->log($share->creator, 'shared_create_folder', 'shared_folder', $folder->name, $folder->id, $request);
        return response()->json(['message' => 'Folder created in shared folder.', 'folder' => $folder], 201);
    }

    public function folderRenameFile(Request $request, string $token, string $uuid): JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token, true);
        $request->validate(['name' => ['required', 'string', 'max:255']]);
        $file = $share->folder->files()->where('uuid', $uuid)->firstOrFail();
        $file->update(['name' => $request->string('name')->toString()]);
        $this->logService->log($share->creator, 'shared_rename', 'shared_file', $file->name, $file->id, $request);
        return response()->json(['message' => 'Shared file renamed.', 'file' => $file->fresh()]);
    }

    public function folderDeleteFile(Request $request, string $token, string $uuid): JsonResponse
    {
        $share = $this->authorizedFolderShare($request, $token, true);
        $file = $share->folder->files()->where('uuid', $uuid)->firstOrFail();
        $file->delete();
        $this->logService->log($share->creator, 'shared_delete', 'shared_file', $file->name, $file->id, $request);
        return response()->json(['message' => 'Shared file moved to Trash.']);
    }

    private function authorizedFolderShare(Request $request, string $token, bool $editor = false): FolderShare
    {
        $share = FolderShare::with(['folder', 'creator'])->where('token', $token)->firstOrFail();
        abort_unless($share->isAvailable(), 410, 'This folder share link has expired.');
        if ($share->visibility === 'restricted') {
            $user = Auth::guard('sanctum')->user();
            abort_unless($user && $share->recipients()->where('user_id', $user->id)->exists(), 403, 'This folder is shared with specific accounts only.');
        }
        abort_unless(!$share->password || Hash::check((string) $request->input('password'), $share->password), 403, 'Invalid share password.');
        if ($editor) abort_unless($share->permission === 'editor', 403, 'This share is view-only.');
        return $share;
    }

    private function isWithinSharedFolder(Folder $folder, Folder $root): bool
    {
        $current = $folder;
        while ($current) {
            if ($current->is($root)) return true;
            $current = $current->parent;
        }
        return false;
    }
    public function index(Request $request): JsonResponse
    {
        $shares = FileShare::with('file')
            ->where('created_by', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (FileShare $share) => [
                'id' => $share->id,
                'file_uuid' => $share->file?->uuid,
                'token' => $share->token,
                'url' => url('/share/' . $share->token),
                'file_name' => $share->file?->name,
                'expires_at' => $share->expires_at,
                'max_downloads' => $share->max_downloads,
                'download_count' => $share->download_count,
                'available' => $share->isAvailable(),
                'visibility' => $share->visibility,
                'permission' => $share->permission,
                'recipients' => $share->recipients()->with('user:id,name,email')->get()->map(fn ($recipient) => $recipient->user),
                'created_at' => $share->created_at,
            ]);

        return response()->json(['shares' => $shares]);
    }

    public function received(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $files = FileShare::with(['file', 'creator'])->where('visibility', 'restricted')->whereHas('recipients', fn ($q) => $q->where('user_id', $userId))->latest()->get()->map(fn ($share) => ['token' => $share->token, 'url' => url('/share/' . $share->token), 'name' => $share->file?->name, 'kind' => 'file', 'permission' => $share->permission, 'shared_by' => $share->creator?->name, 'expires_at' => $share->expires_at, 'available' => $share->isAvailable()]);
        $folders = FolderShare::with(['folder', 'creator'])->where('visibility', 'restricted')->whereHas('recipients', fn ($q) => $q->where('user_id', $userId))->latest()->get()->map(fn ($share) => ['token' => $share->token, 'url' => url('/folder-share/' . $share->token), 'name' => $share->folder?->name, 'kind' => 'folder', 'permission' => $share->permission, 'shared_by' => $share->creator?->name, 'expires_at' => $share->expires_at, 'available' => $share->isAvailable()]);
        return response()->json(['shares' => $files->concat($folders)->values()]);
    }

    public function store(Request $request, string $uuid): JsonResponse
    {
        $request->merge(['visibility' => $request->input('visibility', 'public'), 'permission' => $request->input('permission', 'viewer')]);
        $shareExpiryDays = (int) (SystemSetting::where('key', 'share_expiry_days')->value('value') ?: 30);
        $requirePassword = SystemSetting::where('key', 'share_require_password')->value('value') === '1';
        $configuredMaxDownloads = (int) (SystemSetting::where('key', 'share_max_downloads')->value('value') ?: 0);
        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:4', 'max:72'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'max_downloads' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'visibility' => ['required', 'in:public,restricted'],
            'permission' => ['required', 'in:viewer,editor'],
            'recipients' => ['required_if:visibility,restricted', 'array', 'min:1'],
            'recipients.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);
        if ($requirePassword && empty($validated['password'])) return response()->json(['message' => 'A password is required for shared links.'], 422);
        $file = FileModel::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        $share = FileShare::create([
            'file_id' => $file->id,
            'created_by' => $request->user()->id,
            'token' => Str::random(64),
            'visibility' => $validated['visibility'],
            'permission' => $validated['permission'],
            'password' => !empty($validated['password']) ? Hash::make($validated['password']) : null,
            'expires_at' => $validated['expires_at'] ?? now()->addDays($shareExpiryDays),
            'max_downloads' => $validated['max_downloads'] ?? ($configuredMaxDownloads > 0 ? $configuredMaxDownloads : null),
        ]);
        if ($validated['visibility'] === 'restricted') {
            abort_if(in_array($request->user()->id, $validated['recipients'], true), 422, 'You cannot share a file with yourself.');
            $share->recipients()->createMany(collect($validated['recipients'])->map(fn ($userId) => ['user_id' => $userId])->all());
        }
        $this->logService->log($request->user(), 'share_created', 'file', $file->name, $file->id, $request);

        return response()->json(['share' => [
            'token' => $share->token,
            'url' => url('/share/' . $share->token),
            'file_name' => $file->name,
            'expires_at' => $share->expires_at,
            'max_downloads' => $share->max_downloads,
            'visibility' => $share->visibility,
            'permission' => $share->permission,
            'recipients' => $share->recipients()->with('user:id,name,email')->get()->map(fn ($recipient) => $recipient->user),
        ]], 201);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $share = FileShare::where('token', $token)->where('created_by', $request->user()->id)->firstOrFail();
        $share->delete();
        return response()->json(['message' => 'Share link revoked.']);
    }

    public function updateFileShare(Request $request, string $uuid, int $shareId): JsonResponse
    {
        $data = $request->validate(['permission' => ['required', 'in:viewer,editor']]);
        $share = FileShare::where('id', $shareId)->where('created_by', $request->user()->id)->whereHas('file', fn ($q) => $q->where('uuid', $uuid))->firstOrFail();
        $share->update($data);
        return response()->json(['message' => 'File share updated.', 'permission' => $share->permission]);
    }

    public function removeFileRecipient(Request $request, string $uuid, int $shareId, int $userId): JsonResponse
    {
        $share = FileShare::where('id', $shareId)->where('created_by', $request->user()->id)->whereHas('file', fn ($q) => $q->where('uuid', $uuid))->firstOrFail();
        $deleted = $share->recipients()->where('user_id', $userId)->delete();
        abort_if(!$deleted, 404, 'Recipient not found.');
        return response()->json(['message' => 'Recipient access removed.']);
    }

    public function info(string $token): JsonResponse
    {
        $share = FileShare::with('file')->where('token', $token)->firstOrFail();
        abort_unless($this->canAccessFileShare($share), 403, 'This file is shared with specific accounts only.');
        return response()->json([
            'file_name' => $share->file->name,
            'mime_type' => $share->file->mime_type,
            'size' => $share->file->size,
            'created_at' => $share->file->created_at,
            'requires_password' => (bool) $share->password,
            'available' => $share->isAvailable(),
            'expires_at' => $share->expires_at,
            'visibility' => $share->visibility,
            'permission' => $share->permission,
        ]);
    }

    public function download(Request $request, string $token): StreamedResponse|JsonResponse
    {
        $share = FileShare::with('file')->where('token', $token)->firstOrFail();
        abort_unless($this->canAccessFileShare($share), 403, 'This file is shared with specific accounts only.');
        if (!$share->isAvailable()) return response()->json(['message' => 'This share link has expired or reached its download limit.'], 410);
        if ($share->password && !Hash::check((string) $request->input('password'), $share->password)) {
            return response()->json(['message' => 'Invalid share password.'], 403);
        }
        $file = $share->file;
        if (!Storage::disk('local')->exists($file->storage_path)) return response()->json(['message' => 'Physical file not found.'], 404);
        $share->increment('download_count');
        $this->logService->log($share->creator, 'shared_download', 'shared_file', $file->name, $file->id, $request);
        return Storage::disk('local')->download($file->storage_path, $file->original_name);
    }

    public function preview(Request $request, string $token): StreamedResponse|JsonResponse
    {
        $share = FileShare::with('file')->where('token', $token)->firstOrFail();
        abort_unless($this->canAccessFileShare($share), 403, 'This file is shared with specific accounts only.');
        if (!$share->isAvailable()) return response()->json(['message' => 'This share link has expired.'], 410);
        if ($share->password && !Hash::check((string) $request->input('password'), $share->password)) return response()->json(['message' => 'Invalid share password.'], 403);
        $file = $share->file;
        if (!Storage::disk('local')->exists($file->storage_path)) return response()->json(['message' => 'Physical file not found.'], 404);
        $this->logService->log($share->creator, 'shared_preview', 'shared_file', $file->name, $file->id, $request);
        return Storage::disk('local')->response($file->storage_path, $file->original_name, ['Content-Type' => $file->mime_type, 'Content-Disposition' => 'inline; filename="' . $file->original_name . '"']);
    }

    private function canAccessFileShare(FileShare $share): bool
    {
        if (($share->visibility ?? 'public') === 'public') return true;
        $user = Auth::guard('sanctum')->user();
        return (bool) ($user && $share->recipients()->where('user_id', $user->id)->exists());
    }
}
