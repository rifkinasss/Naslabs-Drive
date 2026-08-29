<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BackupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $disk = Storage::disk(config('backups.disk', 'backups'));
        $backups = collect($disk->directories())->sortDesc()->map(function (string $directory) use ($disk) {
            $files = $disk->allFiles($directory);
            return ['name' => $directory, 'files' => count($files), 'bytes' => (int) collect($files)->sum(fn (string $file) => $disk->size($file))];
        })->values();
        return response()->json(['backups' => $backups]);
    }

    public function run(Request $request, BackupService $backupService): JsonResponse
    {
        $this->authorizeAdmin($request);
        try {
            return response()->json(['message' => 'Backup completed successfully.', 'result' => $backupService->run()]);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Backup failed. Check the server logs for details.'], 500);
        }
    }

    public function destroy(Request $request, string $name): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(preg_match('/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/', $name) === 1, 422, 'Invalid backup name.');
        $disk = Storage::disk(config('backups.disk', 'backups'));
        abort_unless($disk->directoryExists($name), 404, 'Backup not found.');
        $disk->deleteDirectory($name);
        return response()->json(['message' => 'Backup deleted successfully.']);
    }

    public function restore(Request $request, string $name, BackupService $backupService): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(preg_match('/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/', $name) === 1, 422, 'Invalid backup name.');
        $disk = Storage::disk(config('backups.disk', 'backups'));
        abort_unless($disk->directoryExists($name), 404, 'Backup not found.');
        try {
            $result = $backupService->restore($name);
            return response()->json(['message' => 'Backup restored successfully.', 'result' => $result]);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Restore failed. Check the server logs for details.'], 500);
        }
    }

    public function preview(Request $request, string $name): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(preg_match('/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/', $name) === 1, 422, 'Invalid backup name.');
        $disk = Storage::disk(config('backups.disk', 'backups'));
        abort_unless($disk->exists($name . '/metadata.json'), 404, 'Backup manifest not found.');
        $metadata = json_decode($disk->get($name . '/metadata.json'), true, 512, JSON_THROW_ON_ERROR);
        $files = $disk->allFiles($name . '/files');
        return response()->json([
            'name' => $name,
            'created_at' => $metadata['created_at'] ?? null,
            'users' => count($metadata['users'] ?? []),
            'folders' => count($metadata['folders'] ?? []),
            'files' => count($metadata['files'] ?? []),
            'storage_files' => count($files),
            'storage_bytes' => (int) collect($files)->sum(fn (string $file) => $disk->size($file)),
            'database' => $disk->exists($name . '/database.sqlite') ? 'sqlite' : ($metadata['database']['status'] ?? 'metadata-only'),
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Unauthorized admin access');
    }
}
