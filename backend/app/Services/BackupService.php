<?php

namespace App\Services;

use App\Models\File as FileModel;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class BackupService
{
    public function run(): array
    {
        $backupDisk = config('backups.disk', 'backups');
        $sourceDisk = config('filesystems.default', 'local');
        $directory = now()->format('Y-m-d_H-i-s');
        $backupStorage = Storage::disk($backupDisk);
        $sourceStorage = Storage::disk($sourceDisk);
        $backupStorage->makeDirectory($directory . '/files');
        $totalBytes = 0;
        $fileCount = 0;

        foreach ($sourceStorage->allFiles() as $path) {
            $stream = $sourceStorage->readStream($path);
            if ($stream === false) throw new RuntimeException("Unable to read storage file: {$path}");
            $backupStorage->put($directory . '/files/' . $path, $stream);
            if (is_resource($stream)) fclose($stream);
            $fileCount++;
            $totalBytes += (int) $sourceStorage->size($path);
        }

        $backupStorage->put($directory . '/metadata.json', json_encode([
            'created_at' => now()->toISOString(),
            'users' => User::all()->makeHidden(['password', 'remember_token'])->toArray(),
            'folders' => Folder::withTrashed()->get()->toArray(),
            'files' => FileModel::withTrashed()->get()->toArray(),
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        $databaseStatus = $this->backupDatabase($backupStorage, $directory);
        $this->pruneOldBackups($backupStorage);

        return ['backup' => $directory, 'files' => $fileCount, 'bytes' => $totalBytes, 'database' => $databaseStatus];
    }

    public function restore(string $directory): array
    {
        $backupDisk = Storage::disk(config('backups.disk', 'backups'));
        abort_unless($backupDisk->exists($directory . '/database.sqlite'), 422, 'This backup does not contain a SQLite database.');

        // Always create a safety point before replacing the active database/files.
        $safety = $this->run()['backup'];
        $databasePath = config('database.connections.sqlite.database');
        if (!is_string($databasePath) || !is_file($databasePath)) throw new RuntimeException('Active SQLite database was not found.');
        if (!copy($databasePath, $backupDisk->path($safety . '/database-before-restore.sqlite'))) throw new RuntimeException('Unable to create restore safety copy.');

        $sourceDisk = Storage::disk(config('filesystems.default', 'local'));
        foreach ($sourceDisk->allFiles() as $path) $sourceDisk->delete($path);
        foreach ($backupDisk->allFiles($directory . '/files') as $backupPath) {
            $relativePath = substr($backupPath, strlen($directory . '/files/'));
            $stream = $backupDisk->readStream($backupPath);
            if ($stream === false) throw new RuntimeException("Unable to read backup file: {$backupPath}");
            $sourceDisk->put($relativePath, $stream);
            if (is_resource($stream)) fclose($stream);
        }

        if (!copy($backupDisk->path($directory . '/database.sqlite'), $databasePath)) throw new RuntimeException('Unable to restore SQLite database.');
        DB::purge(config('database.default'));
        return ['restored' => $directory, 'safety_backup' => $safety];
    }

    private function backupDatabase($backupStorage, string $directory): string
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite') {
            $backupStorage->put($directory . '/database.json', json_encode([
                'status' => 'metadata-only',
                'reason' => "Database driver '{$connection}' requires a native dump tool.",
            ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            return 'metadata-only';
        }

        $databasePath = config('database.connections.sqlite.database');
        if (!is_string($databasePath) || !is_file($databasePath)) throw new RuntimeException('SQLite database file was not found.');
        if (!copy($databasePath, $backupStorage->path($directory . '/database.sqlite'))) throw new RuntimeException('Unable to copy SQLite database.');
        return 'sqlite';
    }

    private function pruneOldBackups($backupStorage): void
    {
        $retention = max(1, (int) config('backups.retention', 7));
        collect($backupStorage->directories())->sortDesc()->values()->slice($retention)
            ->each(fn (string $directory) => $backupStorage->deleteDirectory($directory));
    }
}
