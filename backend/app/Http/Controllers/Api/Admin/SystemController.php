<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use App\Models\File as FileModel;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\SystemSetting;

class SystemController extends Controller
{
    public function health(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $database = $this->checkDatabase();
        $storage = $this->checkStorage();
        $queue = $this->checkQueue();
        $backup = $this->checkBackup();
        $antivirus = $this->checkAntivirus();
        $api = $this->checkApiMetrics();
        $quotaAlertPercent = (int) (SystemSetting::where('key', 'quota_alert_percent')->value('value') ?: 80);
        $usersAtRisk = \App\Models\User::query()
            ->whereRaw('(used_storage / NULLIF(storage_quota, 0)) >= ?', [$quotaAlertPercent / 100])
            ->count();

        $checks = [
            'database' => $database,
            'storage' => $storage,
            'quota' => [
                'status' => $usersAtRisk > 0 ? 'warning' : 'healthy',
                'message' => $usersAtRisk > 0
                    ? "{$usersAtRisk} user(s) are above {$quotaAlertPercent}% quota usage."
                    : "All users are below {$quotaAlertPercent}% quota usage.",
                'at_risk_users' => $usersAtRisk,
            ],
            'queue' => $queue,
            'backup' => $backup,
            'antivirus' => $antivirus,
            'api' => $api,
        ];

        $hasFailure = collect($checks)->contains(fn (array $check) => $check['status'] === 'down');

        return response()->json([
            'status' => $hasFailure ? 'down' : (collect($checks)->contains(fn (array $check) => $check['status'] === 'warning') ? 'warning' : 'healthy'),
            'checked_at' => now()->toISOString(),
            'checks' => $checks,
        ]);
    }

    public function storage(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) return response()->json(['message' => 'Unauthorized admin access'], 403);
        $users = User::query()->orderByDesc('used_storage')->get(['id', 'name', 'email', 'used_storage', 'storage_quota'])->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'used_storage' => $user->used_storage,
            'storage_quota' => $user->storage_quota,
            'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
        ])->values();
        $files = FileModel::with('user:id,name,email')->orderByDesc('size')->limit(20)->get()->map(fn ($file) => [
            'uuid' => $file->uuid,
            'name' => $file->name,
            'size' => $file->size,
            'mime_type' => $file->mime_type,
            'user' => $file->user?->name ?? 'Unknown',
            'storage_exists' => Storage::disk('local')->exists($file->storage_path),
        ]);
        $orphanedFiles = FileModel::with('user:id,name,email')->whereNotNull('storage_path')->get()->filter(fn ($file) => !Storage::disk('local')->exists($file->storage_path));
        return response()->json([
            'largest_files' => $files,
            'orphaned_records' => $orphanedFiles->count(),
            'orphaned_files' => $orphanedFiles->map(fn ($file) => ['uuid' => $file->uuid, 'name' => $file->name, 'size' => $file->size, 'user' => $file->user?->name])->values(),
            'by_user' => $users,
            'total_used_storage' => $users->sum('used_storage'),
            'total_allocated_storage' => $users->sum('storage_quota'),
        ]);
    }

    public function cleanupStorage(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) return response()->json(['message' => 'Unauthorized admin access'], 403);
        $request->validate(['confirm' => ['accepted']]);
        $removed = 0;
        $bytes = 0;
        FileModel::with(['user', 'versions'])->whereNotNull('storage_path')->get()->filter(fn ($file) => !Storage::disk('local')->exists($file->storage_path))->each(function ($file) use (&$removed, &$bytes) {
            $versionBytes = (int) $file->versions->sum('size');
            $bytes += (int) $file->size + $versionBytes;
            $file->user?->decrement('used_storage', (int) $file->size + $versionBytes);
            $file->versions()->delete();
            $file->forceDelete();
            $removed++;
        });
        return response()->json(['message' => 'Orphaned records cleaned up.', 'removed' => $removed, 'bytes_reclaimed' => $bytes]);
    }

    public function analytics(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $since = now()->subDays(30);
        $byType = FileModel::selectRaw("COALESCE(NULLIF(mime_type, ''), 'unknown') as type, COUNT(*) as count, SUM(size) as bytes")
            ->where('created_at', '>=', $since)->groupBy('mime_type')->orderByDesc('bytes')->limit(8)->get();
        $daily = ActivityLog::where('created_at', '>=', $since)->get()->groupBy(fn ($log) => optional($log->created_at)->format('Y-m-d'));
        $activityByDay = collect(range(29, 0))->map(function (int $daysAgo) use ($daily) {
            $date = now()->subDays($daysAgo)->format('Y-m-d');
            return ['date' => $date, 'events' => $daily->get($date, collect())->count()];
        })->values();
        return response()->json([
            'period_days' => 30,
            'new_users' => User::where('created_at', '>=', $since)->count(),
            'uploads' => ActivityLog::where('action', 'upload')->where('created_at', '>=', $since)->count(),
            'downloads' => ActivityLog::where('action', 'download')->where('created_at', '>=', $since)->count(),
            'events' => ActivityLog::where('created_at', '>=', $since)->count(),
            'by_type' => $byType,
            'activity_by_day' => $activityByDay,
        ]);
    }

    private function checkDatabase(): array
    {
        try {
            DB::select('select 1');

            return ['status' => 'healthy', 'message' => 'Database connection is operational.'];
        } catch (\Throwable) {
            return ['status' => 'down', 'message' => 'Database connection is unavailable.'];
        }
    }

    private function checkStorage(): array
    {
        $disk = config('filesystems.default');
        $root = config("filesystems.disks.{$disk}.root");

        if ($disk === 'local' && (!is_string($root) || !is_dir($root))) {
            return ['status' => 'down', 'message' => 'Local storage directory is unavailable.'];
        }

        $freeBytes = $root && is_string($root) && is_dir($root) ? disk_free_space($root) : null;
        $message = $freeBytes !== false && $freeBytes !== null
            ? 'Storage is available with ' . $this->formatBytes((int) $freeBytes) . ' free.'
            : 'Storage disk is configured and available.';

        return [
            'status' => 'healthy',
            'message' => $message,
            'disk' => $disk,
            'free_bytes' => $freeBytes === false ? null : $freeBytes,
        ];
    }

    private function checkQueue(): array
    {
        try {
            if (!Schema::hasTable('jobs')) return ['status' => 'warning', 'message' => 'Queue table is not configured.', 'pending' => 0];
            $pending = DB::table('jobs')->count();
            return ['status' => $pending > 100 ? 'warning' : 'healthy', 'message' => $pending > 100 ? "{$pending} queued jobs are waiting." : "Queue is operational with {$pending} pending job(s).", 'pending' => $pending];
        } catch (\Throwable) { return ['status' => 'down', 'message' => 'Queue status is unavailable.', 'pending' => null]; }
    }

    private function checkBackup(): array
    {
        try {
            $files = Storage::disk('backups')->files();
            $latest = collect($files)->sort()->last();
            return $latest
                ? ['status' => 'healthy', 'message' => 'Latest backup: ' . basename($latest), 'latest' => basename($latest)]
                : ['status' => 'warning', 'message' => 'No backup has been created yet.', 'latest' => null];
        } catch (\Throwable) { return ['status' => 'down', 'message' => 'Backup disk is unavailable.', 'latest' => null]; }
    }

    private function checkAntivirus(): array
    {
        if (!config('antivirus.enabled')) return ['status' => 'warning', 'message' => 'Antivirus scanning is disabled.', 'enabled' => false, 'clean' => 0, 'unavailable' => 0];
        $clean = FileModel::where('scan_status', 'clean')->count();
        $unavailable = FileModel::whereIn('scan_status', ['unavailable', 'pending'])->count();
        return ['status' => $unavailable > 0 && config('antivirus.required') ? 'warning' : 'healthy', 'message' => "{$clean} clean file(s), {$unavailable} awaiting or unavailable scan(s).", 'enabled' => true, 'clean' => $clean, 'unavailable' => $unavailable];
    }

    private function checkApiMetrics(): array
    {
        $prefix = 'cloud:metrics:api:' . now()->format('Y-m-d');
        $requests = (int) \Illuminate\Support\Facades\Cache::get($prefix . ':requests', 0);
        $errors = (int) \Illuminate\Support\Facades\Cache::get($prefix . ':errors', 0);
        $duration = (int) \Illuminate\Support\Facades\Cache::get($prefix . ':duration_ms', 0);
        $errorRate = $requests > 0 ? round(($errors / $requests) * 100, 2) : 0;
        $averageLatency = $requests > 0 ? round($duration / $requests, 1) : 0;
        return [
            'status' => $errorRate >= 5 ? 'warning' : 'healthy',
            'message' => "Average latency {$averageLatency} ms · error rate {$errorRate}% today.",
            'requests' => $requests,
            'errors' => $errors,
            'error_rate' => $errorRate,
            'average_latency_ms' => $averageLatency,
        ];
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) return $bytes . ' B';
        $units = ['KB', 'MB', 'GB', 'TB'];
        $value = $bytes;
        foreach ($units as $unit) {
            $value /= 1024;
            if ($value < 1024) return round($value, 1) . ' ' . $unit;
        }

        return round($value, 1) . ' PB';
    }
}
