<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\Folder;
use App\Services\ActivityLogService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use ZipArchive;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private ActivityLogService $logService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5242880'], // System Settings enforces the configured limit.
            'folder_uuid' => ['nullable', 'string', 'exists:folders,uuid'],
            'conflict' => ['nullable', 'in:replace,keep_both,skip'],
        ]);

        $user = $request->user();
        $folderId = null;

        if ($request->folder_uuid) {
            $folder = Folder::where('user_id', $user->id)
                ->where('uuid', $request->folder_uuid)
                ->firstOrFail();
            $folderId = $folder->id;
        }

        try {
            $fileRecord = $this->storageService->upload($request->file('file'), $user, $folderId, $request->input('conflict', 'replace'));

            $this->logService->log($user, 'upload', 'file', $fileRecord->name, $fileRecord->id, $request);

            return response()->json([
                'message' => 'File uploaded successfully',
                'file' => $fileRecord,
            ], 201);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function resumableStart(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'size' => ['required', 'integer', 'min:1', 'max:5368709120'], 'total_chunks' => ['required', 'integer', 'min:1', 'max:1024'], 'folder_uuid' => ['nullable', 'string'], 'conflict' => ['nullable', 'in:replace,keep_both,skip']]);
        $maxUploadMb = (int) (\App\Models\SystemSetting::where('key', 'max_upload_mb')->value('value') ?: 512);
        abort_if($data['size'] > ($maxUploadMb * 1024 * 1024), 422, "This file exceeds the {$maxUploadMb} MB upload limit.");
        $folderId = null;
        if (!empty($data['folder_uuid'])) $folderId = Folder::where('user_id', $request->user()->id)->where('uuid', $data['folder_uuid'])->firstOrFail()->id;
        $id = (string) \Illuminate\Support\Str::uuid();
        Cache::put('cloud-upload:' . $id, ['user_id' => $request->user()->id, 'folder_id' => $folderId, 'name' => $data['name'], 'size' => $data['size'], 'conflict' => $data['conflict'] ?? 'replace', 'total_chunks' => $data['total_chunks'], 'chunks' => []], now()->addHours(2));
        return response()->json(['upload_id' => $id]);
    }

    public function resumableChunk(Request $request, string $uploadId): JsonResponse
    {
        $data = $request->validate(['chunk' => ['required', 'file', 'max:16384'], 'index' => ['required', 'integer', 'min:0']]);
        $key = 'cloud-upload:' . $uploadId; $meta = Cache::get($key);
        abort_unless($meta && $meta['user_id'] === $request->user()->id && $data['index'] < $meta['total_chunks'], 404, 'Upload session not found.');
        $path = 'uploads/tmp/' . $uploadId . '-' . $data['index'] . '.part';
        $request->file('chunk')->storeAs('uploads/tmp', $uploadId . '-' . $data['index'] . '.part', 'local');
        $meta['chunks'][(int) $data['index']] = $path; Cache::put($key, $meta, now()->addHours(2));
        return response()->json(['received' => count($meta['chunks']), 'total' => $meta['total_chunks']]);
    }

    public function resumableCancel(Request $request, string $uploadId): JsonResponse
    {
        $key = 'cloud-upload:' . $uploadId;
        $meta = Cache::get($key);
        abort_unless($meta && $meta['user_id'] === $request->user()->id, 404, 'Upload session not found.');
        foreach ($meta['chunks'] as $part) Storage::disk('local')->delete($part);
        Cache::forget($key);
        return response()->json(['message' => 'Upload canceled.']);
    }

    public function resumableComplete(Request $request, string $uploadId): JsonResponse
    {
        $key = 'cloud-upload:' . $uploadId; $meta = Cache::get($key);
        abort_unless($meta && $meta['user_id'] === $request->user()->id, 404, 'Upload session not found.');
        abort_unless(count($meta['chunks']) === $meta['total_chunks'], 422, 'Upload is incomplete.');
        $assembled = 'uploads/tmp/' . $uploadId . '-complete'; $absolute = Storage::disk('local')->path($assembled); $handle = fopen($absolute, 'wb');
        for ($index = 0; $index < $meta['total_chunks']; $index++) { $part = Storage::disk('local')->path($meta['chunks'][$index]); $input = fopen($part, 'rb'); stream_copy_to_stream($input, $handle); fclose($input); }
        fclose($handle);
        $uploaded = new \Illuminate\Http\UploadedFile($absolute, $meta['name'], mime_content_type($absolute) ?: 'application/octet-stream', null, true);
        try { $file = $this->storageService->upload($uploaded, $request->user(), $meta['folder_id'], $meta['conflict'] ?? 'replace'); } finally { Storage::disk('local')->delete($assembled); foreach ($meta['chunks'] as $part) Storage::disk('local')->delete($part); Cache::forget($key); }
        return response()->json(['message' => 'Resumable upload completed.', 'file' => $file], 201);
    }

    public function download(Request $request, string $uuid): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        if (!Storage::disk('local')->exists($file->storage_path)) {
            return response()->json(['message' => 'Physical file not found'], 404);
        }

        $this->logService->log($user, 'download', 'file', $file->name, $file->id, $request);

        return Storage::disk('local')->download($file->storage_path, $file->original_name);
    }

    public function downloadZip(Request $request): BinaryFileResponse|JsonResponse
    {
        $validated = $request->validate(['uuids' => ['required', 'array', 'min:1', 'max:100'], 'uuids.*' => ['string']]);
        $files = FileModel::where('user_id', $request->user()->id)->whereIn('uuid', $validated['uuids'])->get();
        if ($files->isEmpty()) return response()->json(['message' => 'No files selected.'], 422);
        $zipPath = storage_path('app/cloud-files-' . Str::uuid() . '.zip');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($files as $file) {
            if (Storage::disk('local')->exists($file->storage_path)) $zip->addFile(Storage::disk('local')->path($file->storage_path), $file->original_name);
        }
        $zip->close();
        return response()->download($zipPath, 'cloud-nl-files.zip')->deleteFileAfterSend(true);
    }

    public function preview(Request $request, string $uuid): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        if (!Storage::disk('local')->exists($file->storage_path)) {
            return response()->json(['message' => 'Physical file not found'], 404);
        }

        return Storage::disk('local')->response($file->storage_path, $file->original_name, [
            'Content-Type' => $file->mime_type,
            'Content-Disposition' => 'inline; filename="' . $file->original_name . '"',
            'Cache-Control' => 'private, max-age=86400, immutable',
        ]);
    }

    public function rename(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $file->update(['name' => $request->name]);

        $this->logService->log($user, 'rename', 'file', $file->name, $file->id, $request);

        return response()->json([
            'message' => 'File renamed successfully',
            'file' => $file,
        ]);
    }

    public function updateTags(Request $request, string $uuid): JsonResponse
    {
        $validated = $request->validate(['tags' => ['array', 'max:10'], 'tags.*' => ['string', 'max:30']]);
        $file = FileModel::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        $tags = collect($validated['tags'] ?? [])->map(fn (string $tag) => trim($tag))->filter()->unique()->values()->all();
        $file->update(['tags' => $tags]);
        return response()->json(['message' => 'File tags updated successfully', 'file' => $file->fresh()]);
    }

    public function move(Request $request, string $uuid): JsonResponse
    {
        $request->validate(['parent_uuid' => ['nullable', 'string']]);
        $user = $request->user();
        $file = FileModel::where('user_id', $user->id)->where('uuid', $uuid)->firstOrFail();
        $folderId = null;

        if ($request->filled('parent_uuid')) {
            $folderId = Folder::where('user_id', $user->id)
                ->where('uuid', $request->parent_uuid)
                ->firstOrFail()->id;
        }

        $file->update(['folder_id' => $folderId]);
        $this->logService->log($user, 'move', 'file', $file->name, $file->id, $request);

        return response()->json(['message' => 'File moved successfully', 'file' => $file]);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $user = $request->user();
        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $file->delete();

        $this->logService->log($user, 'delete', 'file', $file->name, $file->id, $request);

        return response()->json(['message' => 'File moved to Trash']);
    }
}
