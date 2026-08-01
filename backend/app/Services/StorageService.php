<?php

namespace App\Services;

use App\Models\File as FileModel;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageService
{
    private const BLOCKED_EXTENSIONS = ['exe', 'bat', 'sh', 'php', 'phtml', 'phar', 'cgi', 'pl'];

    public function upload(UploadedFile $file, User $user, ?int $folderId = null): FileModel
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException("File extension .{$extension} is restricted for security.");
        }

        $size = $file->getSize();

        if (!$user->hasAvailableQuota($size)) {
            throw new \RuntimeException("Storage quota exceeded. Available quota is insufficient for this file.");
        }

        $uuid = (string) Str::uuid();
        $storedName = "{$uuid}.{$extension}";
        $storageDir = "users/{$user->id}";

        $path = $file->storeAs($storageDir, $storedName, 'local');

        $fileRecord = FileModel::create([
            'uuid' => $uuid,
            'user_id' => $user->id,
            'folder_id' => $folderId,
            'name' => $file->getClientOriginalName(),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'extension' => $extension ?: 'bin',
            'size' => $size,
            'storage_path' => $path,
            'checksum' => hash_file('sha256', $file->getRealPath()),
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

        // Decrement user's used storage
        $fileRecord->user->decrement('used_storage', $fileRecord->size);
    }
}
