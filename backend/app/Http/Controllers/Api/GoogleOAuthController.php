<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\GoogleOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Services\StorageService;
use Google\Service\Oauth2;
use Google\Service\Drive;

class GoogleOAuthController extends Controller
{
    public function __construct(private GoogleOAuthService $google) {}

    public function redirect(Request $request, string $mode = 'login'): RedirectResponse
    {
        abort_unless(in_array($mode, ['login', 'drive', 'user-drive'], true), 404);
        if ($mode === 'login') abort_unless($this->google->isEnabled('google_oauth_enabled'), 404);
        if ($mode === 'drive') abort_unless($request->user()?->isAdmin(), 403);
        if ($mode === 'user-drive') abort_unless($request->user(), 401);
        $state = Str::random(64);
        Cache::put('google_oauth:' . $state, ['mode' => $mode, 'user_id' => $request->user()?->id], now()->addMinutes(10));
        return redirect()->away($this->google->client($mode)->createAuthUrl());
    }

    public function callback(Request $request): RedirectResponse|JsonResponse
    {
        $state = (string) $request->query('state');
        $stateData = Cache::pull('google_oauth:' . $state);
        abort_unless(is_array($stateData), 403, 'Invalid or expired Google OAuth state.');
        if ($request->filled('error')) return redirect($this->frontendUrl() . ($stateData['mode'] === 'drive' ? '/admin/settings?google_drive=denied' : ($stateData['mode'] === 'user-drive' ? '/profile?google_drive=denied' : '/login?google=denied')));

        $mode = $stateData['mode'];
        $client = $this->google->client($mode);
        $token = $client->fetchAccessTokenWithAuthCode((string) $request->query('code'));
        if (isset($token['error'])) return redirect($this->frontendUrl() . ($mode === 'drive' ? '/admin/settings?google_drive=error' : '/login?google=error'));

        if ($mode === 'drive') {
            $this->google->storeDriveToken($token);
            SystemSetting::updateOrCreate(['key' => 'google_drive_enabled'], ['value' => '1']);
            return redirect($this->frontendUrl() . '/admin/settings?google_drive=connected');
        }

        if ($mode === 'user-drive') {
            $user = User::find($stateData['user_id']);
            abort_unless($user, 401);
            $this->google->storeUserDriveToken($user, $token);
            return redirect($this->frontendUrl() . '/profile?google_drive=connected');
        }

        $client->setAccessToken($token);
        $googleUser = (new Oauth2($client))->userinfo->get();
        $user = User::where('email', strtolower((string) $googleUser->email))->first();
        if (!$user || !$user->is_drive_enabled) return redirect($this->frontendUrl() . '/login?google=account_not_found');
        $ticket = Str::random(64);
        Cache::put('google_login_ticket:' . $ticket, ['user_id' => $user->id], now()->addMinute());
        return redirect($this->frontendUrl() . '/login/google-callback?ticket=' . urlencode($ticket));
    }

    public function exchangeLoginTicket(Request $request): JsonResponse
    {
        $ticket = $request->validate(['ticket' => ['required', 'string', 'size:64']])['ticket'];
        $data = Cache::pull('google_login_ticket:' . $ticket);
        $user = is_array($data) ? User::find($data['user_id']) : null;
        if (!$user || !$user->is_drive_enabled) return response()->json(['message' => 'Google sign-in ticket is invalid or expired.'], 422);
        return response()->json(['token' => $user->createToken('drive-token')->plainTextToken, 'user' => $this->payload($user, $request)]);
    }

    public function driveStatus(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        return response()->json(['configured' => $this->google->isEnabled('google_drive_enabled'), 'connected' => (bool) SystemSetting::where('key', 'google_drive_token_encrypted')->value('value')]);
    }

    public function driveRedirectUrl(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        return response()->json(['url' => $this->google->client('drive')->createAuthUrl()]);
    }

    public function disconnectDrive(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        SystemSetting::whereIn('key', ['google_drive_token_encrypted', 'google_drive_enabled'])->delete();
        return response()->json(['message' => 'Google Drive disconnected.']);
    }

    public function driveFiles(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $service = new Drive($this->google->driveClient());
        $files = $service->files->listFiles(['q' => "'root' in parents and trashed = false", 'pageSize' => 50, 'orderBy' => 'name', 'fields' => 'files(id,name,mimeType,size,modifiedTime,webViewLink)']);
        return response()->json(['files' => collect($files->getFiles())->map(fn ($file) => ['id' => $file->getId(), 'name' => $file->getName(), 'mime_type' => $file->getMimeType(), 'size' => (int) ($file->getSize() ?? 0), 'modified_at' => $file->getModifiedTime(), 'web_url' => $file->getWebViewLink()])->values()]);
    }

    public function importDriveFile(Request $request, string $googleId, StorageService $storage): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $service = new Drive($this->google->driveClient());
        $remote = $service->files->get($googleId, ['fields' => 'id,name,mimeType,size']);
        abort_if(str_starts_with((string) $remote->getMimeType(), 'application/vnd.google-apps.'), 422, 'Google Workspace files must be exported to a supported format first.');
        $response = $service->files->get($googleId, ['alt' => 'media']);
        $contents = is_string($response) ? $response : $response->getBody()->getContents();
        $tmp = tempnam(sys_get_temp_dir(), 'cloud-drive-');
        if ($tmp === false || file_put_contents($tmp, $contents) === false) abort(500, 'Unable to prepare the Google Drive file.');
        try {
            $uploaded = new UploadedFile($tmp, basename((string) $remote->getName()), (string) ($remote->getMimeType() ?: 'application/octet-stream'), null, true);
            $file = $storage->upload($uploaded, $request->user(), null, 'keep_both');
        } finally {
            @unlink($tmp);
        }
        return response()->json(['message' => 'Google Drive file imported.', 'file' => $file], 201);
    }

    public function exportFile(Request $request, string $uuid): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $file = \App\Models\File::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        abort_unless(Storage::disk('local')->exists($file->storage_path), 422, 'The local file is not available.');
        $service = new Drive($this->google->driveClient());
        $stream = Storage::disk('local')->readStream($file->storage_path);
        abort_unless($stream !== false, 422, 'Unable to read the local file.');
        try {
            $created = $service->files->create(new \Google\Service\Drive\DriveFile(['name' => $file->name]), ['data' => stream_get_contents($stream), 'mimeType' => $file->mime_type ?: 'application/octet-stream', 'uploadType' => 'multipart', 'fields' => 'id,name,webViewLink']);
        } finally {
            if (is_resource($stream)) fclose($stream);
        }
        return response()->json(['message' => 'File exported to Google Drive.', 'file' => ['id' => $created->getId(), 'name' => $created->getName(), 'web_url' => $created->getWebViewLink()]]);
    }

    public function userDriveStatus(Request $request): JsonResponse
    {
        return response()->json(['connected' => (bool) $request->user()->google_drive_token_encrypted]);
    }

    public function userDriveRedirectUrl(Request $request): JsonResponse
    {
        return response()->json(['url' => $this->google->client('drive')->createAuthUrl()]);
    }

    public function disconnectUserDrive(Request $request): JsonResponse
    {
        $request->user()->forceFill(['google_drive_token_encrypted' => null])->save();
        return response()->json(['message' => 'Your Google Drive has been disconnected.']);
    }

    public function exportUserFile(Request $request, string $uuid): JsonResponse
    {
        $file = \App\Models\File::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        abort_unless(Storage::disk('local')->exists($file->storage_path), 422, 'The local file is not available.');
        $service = new Drive($this->google->userDriveClient($request->user()));
        $stream = Storage::disk('local')->readStream($file->storage_path);
        abort_unless($stream !== false, 422, 'Unable to read the local file.');
        $targetMime = match (strtolower((string) $file->extension)) {
            'docx' => 'application/vnd.google-apps.document',
            'xlsx' => 'application/vnd.google-apps.spreadsheet',
            'pptx' => 'application/vnd.google-apps.presentation',
            default => $file->mime_type ?: 'application/octet-stream',
        };
        $targetName = in_array(strtolower((string) $file->extension), ['docx', 'xlsx', 'pptx'], true)
            ? pathinfo($file->name, PATHINFO_FILENAME)
            : $file->name;
        try {
            $created = $service->files->create(new \Google\Service\Drive\DriveFile(['name' => $targetName]), ['data' => stream_get_contents($stream), 'mimeType' => $targetMime, 'uploadType' => 'multipart', 'fields' => 'id,name,webViewLink']);
        } finally { if (is_resource($stream)) fclose($stream); }
        return response()->json(['message' => 'A copy was created in your Google Drive.', 'file' => ['id' => $created->getId(), 'name' => $created->getName(), 'web_url' => $created->getWebViewLink()]]);
    }

    private function frontendUrl(): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:3001'), '/');
    }

    private function payload(User $user, Request $request): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'avatar_url' => $user->avatar_path ? $request->getSchemeAndHttpHost() . '/storage/' . ltrim($user->avatar_path, '/') : null, 'role' => $user->role, 'created_at' => $user->created_at, 'drive' => ['storage_quota' => $user->storage_quota, 'used_storage' => $user->used_storage, 'available_storage' => max(0, $user->storage_quota - $user->used_storage), 'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1), 'is_drive_enabled' => $user->is_drive_enabled]];
    }
}
