<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Crypt;

class SettingsController extends Controller
{
    public function __construct(private ActivityLogService $logService) {}
    private const DEFAULTS = [
        'app_name' => 'Cloud NL',
        'max_upload_mb' => '512',
        'share_expiry_days' => '30',
        'allowed_extensions' => 'jpg,jpeg,png,webp,gif,heic,heif,pdf,txt,doc,docx,xls,xlsx,zip',
        'default_quota_gb' => '100',
        'quota_alert_percent' => '80',
        'share_require_password' => '0',
        'share_max_downloads' => '0',
        'trash_retention_days' => '30',
        'notify_on_share' => '1',
        'notify_on_upload_failure' => '1',
        'maintenance_mode' => '0',
        'maintenance_message' => 'Cloud NL is temporarily under maintenance.',
        'google_oauth_enabled' => '0',
        'google_drive_enabled' => '0',
        'google_client_id' => '',
        'google_login_redirect_uri' => '',
        'google_drive_redirect_uri' => '',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $stored = SystemSetting::query()->pluck('value', 'key')->all();
        $settings = array_merge(self::DEFAULTS, $stored);
        unset($settings['google_client_secret_encrypted'], $settings['google_drive_token_encrypted']);
        $settings['google_client_secret_configured'] = (bool) ($stored['google_client_secret_encrypted'] ?? false);
        $settings['google_drive_connected'] = (bool) ($stored['google_drive_token_encrypted'] ?? false);
        return response()->json(['settings' => $settings]);
    }

    public function branding(): JsonResponse
    {
        $appName = SystemSetting::where('key', 'app_name')->value('value') ?: self::DEFAULTS['app_name'];
        return response()->json($this->brandingPayload($appName));
    }

    public function uploadAsset(Request $request, string $asset): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(in_array($asset, ['logo', 'favicon', 'pwa_icon'], true), 404);
        $data = $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096']]);
        $key = $asset.'_path';
        $oldPath = SystemSetting::where('key', $key)->value('value');
        $path = $data['file']->store('branding', 'public');
        SystemSetting::updateOrCreate(['key' => $key], ['value' => $path]);
        if ($oldPath && str_starts_with($oldPath, 'branding/')) Storage::disk('public')->delete($oldPath);
        $this->logService->log($request->user(), 'update_branding_asset', 'system', ucfirst(str_replace('_', ' ', $asset)), null, $request);
        return response()->json(['message' => 'Branding asset updated successfully.', 'branding' => $this->brandingPayload()]);
    }

    public function removeAsset(Request $request, string $asset): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(in_array($asset, ['logo', 'favicon', 'pwa_icon'], true), 404);
        $key = $asset.'_path';
        $path = SystemSetting::where('key', $key)->value('value');
        if ($path && str_starts_with($path, 'branding/')) Storage::disk('public')->delete($path);
        SystemSetting::where('key', $key)->delete();
        $this->logService->log($request->user(), 'reset_branding_asset', 'system', ucfirst(str_replace('_', ' ', $asset)), null, $request);
        return response()->json(['message' => 'Branding asset reset successfully.', 'branding' => $this->brandingPayload()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $before = SystemSetting::query()->pluck('value', 'key')->all();
        $data = $request->validate([
            'app_name' => ['required', 'string', 'max:80'],
            'max_upload_mb' => ['required', 'integer', 'min:1', 'max:5120'],
            'share_expiry_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'allowed_extensions' => ['required', 'string', 'max:1000'],
            'default_quota_gb' => ['required', 'integer', 'min:1', 'max:1024'],
            'quota_alert_percent' => ['required', 'integer', 'min:50', 'max:100'],
            'share_require_password' => ['required', 'in:0,1'],
            'share_max_downloads' => ['required', 'integer', 'min:0', 'max:10000'],
            'trash_retention_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'notify_on_share' => ['required', 'in:0,1'],
            'notify_on_upload_failure' => ['required', 'in:0,1'],
            'maintenance_mode' => ['required', 'in:0,1'],
            'maintenance_message' => ['required', 'string', 'max:255'],
            'google_oauth_enabled' => ['required', 'in:0,1'],
            'google_drive_enabled' => ['required', 'in:0,1'],
            'google_client_id' => ['nullable', 'string', 'max:255'],
            'google_client_secret' => ['nullable', 'string', 'max:500'],
            'google_login_redirect_uri' => ['nullable', 'url', 'max:500'],
            'google_drive_redirect_uri' => ['nullable', 'url', 'max:500'],
        ]);
        $extensions = collect(explode(',', strtolower($data['allowed_extensions'])))
            ->map(fn (string $extension) => preg_replace('/[^a-z0-9]+/', '', trim($extension)))
            ->filter()->unique()->values()->implode(',');
        $data['allowed_extensions'] = $extensions;
        if (filled($data['google_client_secret'] ?? null)) {
            SystemSetting::updateOrCreate(['key' => 'google_client_secret_encrypted'], ['value' => Crypt::encryptString($data['google_client_secret'])]);
        }
        unset($data['google_client_secret']);
        foreach ($data as $key => $value) {
            $oldValue = (string) ($before[$key] ?? self::DEFAULTS[$key] ?? '');
            $newValue = (string) $value;
            SystemSetting::updateOrCreate(['key' => $key], ['value' => $newValue]);
            if ($oldValue !== $newValue) {
                $this->logService->log($request->user(), 'update_system_setting', 'system', "{$key}: {$oldValue} → {$newValue}", null, $request);
            }
        }
        $this->logService->log($request->user(), 'update_system_settings', 'system', 'System Settings', null, $request);
        $saved = array_merge(self::DEFAULTS, $data);
        $saved['google_client_secret_configured'] = (bool) SystemSetting::where('key', 'google_client_secret_encrypted')->value('value');
        $saved['google_drive_connected'] = (bool) SystemSetting::where('key', 'google_drive_token_encrypted')->value('value');
        return response()->json(['message' => 'System settings updated successfully.', 'settings' => $saved]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Unauthorized admin access');
    }

    private function brandingPayload(?string $appName = null): array
    {
        $appName ??= SystemSetting::where('key', 'app_name')->value('value') ?: self::DEFAULTS['app_name'];
        $paths = SystemSetting::query()->whereIn('key', ['logo_path', 'favicon_path', 'pwa_icon_path'])->pluck('value', 'key');
        $url = fn (?string $path, ?string $fallback = null) => $path === 'default:logo.png'
            ? '/logo.png'
            : ($path ? request()->getSchemeAndHttpHost().'/storage/'.ltrim($path, '/') : $fallback);
        return [
            'app_name' => $appName,
            'logo_url' => $url($paths->get('logo_path'), '/logo.png'),
            'favicon_url' => $url($paths->get('favicon_path'), '/logo.png'),
            'pwa_icon_url' => $url($paths->get('pwa_icon_path'), '/logo.png'),
        ];
    }
}
