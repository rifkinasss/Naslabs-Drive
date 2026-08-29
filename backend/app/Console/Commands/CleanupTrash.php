<?php

namespace App\Console\Commands;

use App\Models\File;
use App\Models\Folder;
use App\Services\StorageService;
use App\Models\SystemSetting;
use Illuminate\Console\Command;

class CleanupTrash extends Command
{
    protected $signature = 'cloud:cleanup-trash {--days= : Delete items older than this many days}';
    protected $description = 'Permanently delete items that have been in Trash too long';

    public function handle(StorageService $storageService): int
    {
        $days = (int) ($this->option('days') ?: (SystemSetting::where('key', 'trash_retention_days')->value('value') ?: 30));
        $before = now()->subDays($days);
        $files = File::onlyTrashed()->where('deleted_at', '<=', $before)->get();
        foreach ($files as $file) {
            $storageService->deletePhysicalFile($file);
            $file->forceDelete();
        }
        $folders = Folder::onlyTrashed()->where('deleted_at', '<=', $before)->get();
        $folders->each->forceDelete();
        $this->info("Cleaned {$files->count()} files and {$folders->count()} folders from Trash.");
        return self::SUCCESS;
    }
}
