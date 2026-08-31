<?php

namespace App\Services;

use App\Models\File as FileModel;
use App\Models\User;
use App\Models\SystemSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageService
{
    private const BLOCKED_EXTENSIONS = ['exe', 'com', 'bat', 'cmd', 'sh', 'bash', 'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'cgi', 'pl', 'py', 'rb', 'jar', 'class'];
    private const BLOCKED_MIMES = ['application/x-php', 'text/x-php', 'application/x-httpd-php', 'application/x-executable', 'application/x-sh', 'application/x-msdownload'];

    public function upload(UploadedFile $file, User $user, ?int $folderId = null, string $conflict = 'replace'): FileModel
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $extension = preg_replace('/[^a-z0-9]+/', '', $extension) ?: 'bin';
        $mimeType = strtolower((string) ($file->getMimeType() ?: 'application/octet-stream'));

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true) || in_array($mimeType, self::BLOCKED_MIMES, true)) {
            throw new \InvalidArgumentException("File extension .{$extension} is restricted for security.");
        }

        $size = (int) $file->getSize();
        $scan = app(AntivirusService::class)->scan((string) $file->getRealPath());

        $settings = SystemSetting::query()->whereIn('key', ['max_upload_mb', 'allowed_extensions'])->pluck('value', 'key');
        $maxUploadMb = (int) ($settings->get('max_upload_mb') ?: 512);
        if ($size > ($maxUploadMb * 1024 * 1024)) {
            throw new \RuntimeException("This file exceeds the {$maxUploadMb} MB upload limit.");
        }

        $allowedExtensions = collect(explode(',', (string) ($settings->get('allowed_extensions') ?: 'jpg,jpeg,png,webp,gif,heic,heif,pdf,txt,doc,docx,xls,xlsx,zip')))
            ->map(fn (string $value) => strtolower(trim($value)))->filter()->all();
        if (!in_array($extension, $allowedExtensions, true)) {
            throw new \InvalidArgumentException("File extension .{$extension} is not allowed by the current upload policy.");
        }

        if (!$user->hasAvailableQuota($size)) {
            throw new \RuntimeException("Storage quota exceeded. Available quota is insufficient for this file.");
        }

        $originalName = $file->getClientOriginalName();
        $originalName = basename(str_replace('\\', '/', $originalName));
        $originalName = trim((string) preg_replace('/[\\x00-\\x1F\\x7F]/u', '', $originalName));
        if ($originalName === '') throw new \InvalidArgumentException('A valid file name is required.');

        $existing = FileModel::where('user_id', $user->id)
            ->where('folder_id', $folderId)
            ->where('name', $originalName)
            ->first();

        if ($existing && $conflict === 'skip') return $existing;
        if ($existing && $conflict === 'keep_both') {
            $extensionWithDot = $extension ? '.' . $extension : '';
            $base = pathinfo($originalName, PATHINFO_FILENAME);
            $counter = 1;
            do { $originalName = $base . ' (' . $counter++ . ')' . $extensionWithDot; } while (FileModel::where('user_id', $user->id)->where('folder_id', $folderId)->where('name', $originalName)->exists());
            $existing = null;
        }

        $uuid = (string) Str::uuid();
        $storedName = "{$uuid}.{$extension}";
        $storageDir = "users/{$user->id}";
        $path = $file->storeAs($storageDir, $storedName, 'local');

        if ($existing) {
            $existing->versions()->create([
                'created_by' => $user->id,
                'version' => ((int) $existing->versions()->max('version')) + 1,
                'name' => $existing->name,
                'mime_type' => $existing->mime_type,
                'extension' => $existing->extension,
                'size' => $existing->size,
                'storage_path' => $existing->storage_path,
                'checksum' => $existing->checksum,
                'scan_status' => $existing->scan_status,
                'scan_message' => $existing->scan_message,
                'scanned_at' => $existing->scanned_at,
            ]);
            $existing->update([
                'original_name' => $originalName,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size' => $size,
                'storage_path' => $path,
                'checksum' => hash_file('sha256', $file->getRealPath()),
                'scan_status' => $scan['status'],
                'scan_message' => $scan['message'],
                'scanned_at' => now(),
            ]);
            $user->increment('used_storage', $size);
            return $existing->fresh();
        }

        $fileRecord = FileModel::create([
            'uuid' => $uuid,
            'user_id' => $user->id,
            'folder_id' => $folderId,
            'name' => $originalName,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'extension' => $extension,
            'size' => $size,
            'storage_path' => $path,
            'checksum' => hash_file('sha256', $file->getRealPath()),
            'scan_status' => $scan['status'],
            'scan_message' => $scan['message'],
            'scanned_at' => now(),
        ]);

        // Increment user's used storage
        $user->increment('used_storage', $size);

        return $fileRecord;
    }

    public function deletePhysicalFile(FileModel $fileRecord): void
    {
        if (Storage::disk('local')->exists($fileRecord->storage_path)) {
            Storage::disk('local')->delete($fileRecord->storage_path);
        }

        foreach ($fileRecord->versions as $version) {
            if (Storage::disk('local')->exists($version->storage_path)) {
                Storage::disk('local')->delete($version->storage_path);
            }
        }

        // Decrement user's used storage
        $fileRecord->user->decrement('used_storage', $fileRecord->size + $fileRecord->versions()->sum('size'));
    }
}
