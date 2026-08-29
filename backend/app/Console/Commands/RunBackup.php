<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class RunBackup extends Command
{
    protected $signature = 'cloud:backup';
    protected $description = 'Back up Cloud files, metadata, and database';

    public function handle(BackupService $backupService): int
    {
        try {
            $result = $backupService->run();
            $this->info("Backup {$result['backup']} completed.");
            $this->line("Files: {$result['files']} | Bytes: {$result['bytes']} | Database: {$result['database']}");
            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error('Backup failed: ' . $exception->getMessage());
            return self::FAILURE;
        }
    }
}
