# 09 — Storage Architecture

## Overview
File fisik disimpan menggunakan **Laravel Filesystem** dengan disk `local` (private — tidak bisa diakses publik). Metadata file (nama, ukuran, MIME, path) disimpan di PostgreSQL. Seluruh akses file harus melalui authenticated API endpoint.

---

## Strategi Penyimpanan

### Prinsip Utama
1. **Metadata di DB, File di Disk** — database hanya menyimpan path dan info file; konten fisik ada di filesystem
2. **Private by Default** — file tidak bisa diakses langsung via URL; hanya via endpoint download yang ter-autentikasi
3. **UUID sebagai nama file di disk** — nama asli file disimpan di DB (`drive_files.name`), nama fisik di disk menggunakan UUID untuk menghindari konflik dan path traversal attack
4. **Per-user directory** — setiap user punya direktori terpisah

---

## Struktur Direktori Storage

```
storage/
└── app/
    └── private/
        └── users/
            ├── 1/                          # user_id = 1
            │   ├── 550e8400-e29b-41d4-a716-446655440000.pdf
            │   ├── 7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg
            │   └── a3bb189e-8bf9-3888-9912-ace4e6543002.mp4
            ├── 2/
            │   └── ...
            └── {user_id}/
                └── {uuid}.{extension}
```

**Storage path yang disimpan di DB:**
```
users/1/550e8400-e29b-41d4-a716-446655440000.pdf
```

**Cara akses:**
```php
Storage::disk('local')->path($file->storage_path)
Storage::disk('local')->get($file->storage_path)
```

---

## Path Generation

```php
// StorageService.php
private function generatePath(int $userId, string $extension): string
{
    $uuid = Str::uuid()->toString();
    return "users/{$userId}/{$uuid}.{$extension}";
}
```

---

## Upload Flow (Backend Detail)

```
POST /api/v1/drive/files/upload
        │
UploadFileRequest::validate()
├── files[]: required, array
├── files.*: file, max:102400 (100MB), mimes:tidak ada exe/sh/bat/php
└── folder_id: nullable, exists:drive_folders,id
        │
FileController@upload()
        │
FileService@upload(User $user, array $files, ?int $folderId)
        │
        ├── Foreach $files as $uploadedFile:
        │       │
        │       ├── 1. Cek kuota: usedStorage() + $uploadedFile->getSize() > quota?
        │       │         └── Throw StorageQuotaExceededException (507)
        │       │
        │       ├── 2. Validasi MIME & ekstensi tambahan
        │       │         └── StorageService@validateMime()
        │       │
        │       ├── 3. Generate storage path
        │       │         └── "users/{user_id}/{uuid}.{ext}"
        │       │
        │       ├── 4. Simpan file ke disk
        │       │         └── Storage::disk('local')->putFileAs(
        │       │               "users/{$user->id}",
        │       │               $uploadedFile,
        │       │               "{$uuid}.{$ext}"
        │       │             )
        │       │
        │       ├── 5. Simpan metadata ke DB
        │       │         └── DriveFile::create([
        │       │               'user_id'      => $user->id,
        │       │               'folder_id'    => $folderId,
        │       │               'name'         => $uploadedFile->getClientOriginalName(),
        │       │               'storage_path' => $path,
        │       │               'mime_type'    => $uploadedFile->getMimeType(),
        │       │               'extension'    => $uploadedFile->getClientOriginalExtension(),
        │       │               'size'         => $uploadedFile->getSize(),
        │       │             ])
        │       │
        │       └── 6. Log aktivitas
        │                 └── ActivityService@log($user, 'upload', 'file', $file->id, $file->name)
        │
└── Return Collection<DriveFile>
```

---

## Download Flow

```php
// FileController@download()
public function download(Request $request, string $uuid): StreamedResponse
{
    $file = DriveFile::whereUuid($uuid)
                     ->whereUserId($request->user()->id)
                     ->whereNull('deleted_at')
                     ->firstOrFail();

    $this->authorize('download', $file);  // Policy check

    // Log download
    $this->activity->log($request->user(), 'download', 'file', $file->id, $file->name);

    return Storage::disk('local')->download(
        $file->storage_path,
        $file->name,         // Nama asli untuk Content-Disposition header
        ['Content-Type' => $file->mime_type]
    );
}
```

---

## Delete (Soft & Hard)

### Soft Delete (ke Trash)
```php
// FileService@trash()
public function trash(User $user, DriveFile $file): void
{
    $file->delete();  // SoftDeletes trait: isi deleted_at

    // File fisik TIDAK dihapus — masih ada di storage
    // Hanya metadata yang di-soft-delete
}
```

### Hard Delete (dari Trash)
```php
// TrashService@forceDelete()
public function forceDelete(User $user, string $uuid, string $type): void
{
    if ($type === 'file') {
        $file = DriveFile::onlyTrashed()
                         ->whereUuid($uuid)
                         ->whereUserId($user->id)
                         ->firstOrFail();

        // 1. Hapus file fisik dari storage
        Storage::disk('local')->delete($file->storage_path);

        // 2. Hapus record dari DB (permanent)
        $file->forceDelete();

        // 3. Log
        $this->activity->log($user, 'permanent_delete', 'file', $file->id, $file->name);
    }
    // ... handle folder juga
}
```

---

## Storage Quota Enforcement

```php
// FileService (private method)
private function assertQuota(User $user, int $additionalBytes): void
{
    $setting = $user->driveSetting;
    $used = DriveFile::whereUserId($user->id)
                     ->whereNull('deleted_at')
                     ->sum('size');

    if (($used + $additionalBytes) > $setting->storage_quota) {
        throw new StorageQuotaExceededException(
            "Insufficient storage. Available: " . 
            Number::fileSize($setting->storage_quota - $used)
        );
    }
}
```

> **Catatan:** File di Trash **masih dihitung** sebagai storage terpakai sampai dihapus permanen. Ini mendorong user untuk membersihkan trash mereka.

---

## Validasi File

### MIME Type Validation
```php
// StorageService@validateMime()
public function validateMime(string $mimeType, string $extension): void
{
    $blockedMimes = config('drive.blocked_mimes');
    $blockedExtensions = config('drive.blocked_extensions');

    if (in_array($mimeType, $blockedMimes)) {
        throw new \InvalidArgumentException("File type '{$mimeType}' is not allowed.");
    }

    if (in_array(strtolower($extension), $blockedExtensions)) {
        throw new \InvalidArgumentException("File extension '.{$extension}' is not allowed.");
    }
}
```

### Laravel Form Request Validation
```php
// UploadFileRequest
public function rules(): array
{
    $maxKB = config('drive.max_file_size', 102400);
    return [
        'files'   => ['required', 'array', 'min:1', 'max:10'],
        'files.*' => [
            'file',
            "max:{$maxKB}",
            'mimetypes:' . implode(',', $this->getAllowedMimes()),
        ],
        'folder_id' => ['nullable', 'integer', Rule::exists('drive_folders', 'id')->where('user_id', auth()->id())],
    ];
}
```

---

## Future: MinIO/S3 Migration (Phase 5)

Migrasi ke MinIO hanya butuh perubahan di:
1. `config/filesystems.php` — tambahkan disk `s3`
2. `.env` — set `FILESYSTEM_DISK=s3` + MinIO credentials
3. `StorageService` — ganti `'local'` dengan `config('drive.disk')`
4. Download method — gunakan pre-signed URL sebagai alternatif streaming

Karena sudah menggunakan Laravel Filesystem abstraction, tidak ada perubahan di service/controller layer.

```php
// config/filesystems.php (future)
'disks' => [
    's3' => [
        'driver'   => 's3',
        'key'      => env('MINIO_ACCESS_KEY'),
        'secret'   => env('MINIO_SECRET_KEY'),
        'region'   => env('MINIO_REGION', 'us-east-1'),
        'bucket'   => env('MINIO_BUCKET'),
        'url'      => env('MINIO_URL'),
        'endpoint' => env('MINIO_ENDPOINT'),
        'use_path_style_endpoint' => true,  // Wajib untuk MinIO
    ],
]
```
