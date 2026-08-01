# 08 — Backend Architecture

## Overview
Backend dibangun dengan **Laravel 12** menggunakan pola **Controller → Service → Model**. Tidak ada Repository layer eksplisit — Eloquent Model digunakan langsung di Service.

---

## Struktur Folder Laravel

```
/backend (atau root Laravel project)
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   └── V1/
│   │   │   │       ├── Drive/
│   │   │   │       │   ├── FileController.php
│   │   │   │       │   ├── FolderController.php
│   │   │   │       │   ├── TrashController.php
│   │   │   │       │   └── SearchController.php
│   │   │   │       └── Admin/
│   │   │   │           ├── UserController.php
│   │   │   │           └── ActivityLogController.php
│   │   ├── Middleware/
│   │   │   ├── EnsureDriveEnabled.php     # Cek is_drive_enabled = true
│   │   │   └── (existing auth middleware)
│   │   ├── Requests/
│   │   │   ├── Drive/
│   │   │   │   ├── UploadFileRequest.php
│   │   │   │   ├── CreateFolderRequest.php
│   │   │   │   ├── UpdateFileRequest.php
│   │   │   │   ├── UpdateFolderRequest.php
│   │   │   │   └── SearchRequest.php
│   │   │   └── Admin/
│   │   │       └── UpdateQuotaRequest.php
│   │   └── Resources/
│   │       ├── Drive/
│   │       │   ├── DriveFileResource.php
│   │       │   ├── DriveFileCollection.php
│   │       │   ├── DriveFolderResource.php
│   │       │   └── BreadcrumbResource.php
│   │       └── Admin/
│   │           ├── UserStorageResource.php
│   │           └── ActivityLogResource.php
│   │
│   ├── Models/
│   │   ├── User.php                    # Existing model
│   │   ├── DriveFile.php
│   │   ├── DriveFolder.php
│   │   ├── DriveActivityLog.php
│   │   └── DriveUserSetting.php
│   │
│   ├── Services/
│   │   ├── Drive/
│   │   │   ├── FileService.php
│   │   │   ├── FolderService.php
│   │   │   ├── TrashService.php
│   │   │   └── SearchService.php
│   │   ├── StorageService.php
│   │   └── ActivityService.php
│   │
│   ├── Policies/
│   │   ├── DriveFilePolicy.php
│   │   └── DriveFolderPolicy.php
│   │
│   └── Exceptions/
│       ├── StorageQuotaExceededException.php
│       └── DriveDisabledException.php
│
├── database/
│   └── migrations/
│       ├── xxxx_create_drive_user_settings_table.php
│       ├── xxxx_create_drive_folders_table.php
│       ├── xxxx_create_drive_files_table.php
│       └── xxxx_create_drive_activity_logs_table.php
│
├── routes/
│   └── api.php                         # Drive API routes
│
└── config/
    └── drive.php                       # Drive-specific config
```

---

## Routes (api.php)

```php
Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Drive (semua user)
    Route::prefix('drive')->middleware(['ensure.drive.enabled'])->group(function () {
        // Files
        Route::get('/files', [FileController::class, 'index']);
        Route::post('/files/upload', [FileController::class, 'upload']);
        Route::get('/files/{uuid}', [FileController::class, 'show']);
        Route::get('/files/{uuid}/download', [FileController::class, 'download']);
        Route::patch('/files/{uuid}', [FileController::class, 'update']);
        Route::delete('/files/{uuid}', [FileController::class, 'destroy']); // → trash

        // Folders
        Route::get('/folders', [FolderController::class, 'index']);
        Route::post('/folders', [FolderController::class, 'store']);
        Route::get('/folders/{uuid}', [FolderController::class, 'show']);
        Route::get('/folders/{uuid}/breadcrumb', [FolderController::class, 'breadcrumb']);
        Route::patch('/folders/{uuid}', [FolderController::class, 'update']);
        Route::delete('/folders/{uuid}', [FolderController::class, 'destroy']); // → trash

        // Trash
        Route::get('/trash', [TrashController::class, 'index']);
        Route::post('/trash/{uuid}/restore', [TrashController::class, 'restore']);
        Route::delete('/trash/{uuid}', [TrashController::class, 'forceDelete']);
        Route::delete('/trash', [TrashController::class, 'empty']);

        // Search
        Route::get('/search', [SearchController::class, 'index']);
    });

    // Admin only
    Route::prefix('admin')->middleware(['can:admin'])->group(function () {
        Route::get('/users', [Admin\UserController::class, 'index']);
        Route::get('/users/{id}/storage', [Admin\UserController::class, 'storage']);
        Route::patch('/users/{id}/quota', [Admin\UserController::class, 'updateQuota']);
        Route::patch('/users/{id}/drive', [Admin\UserController::class, 'toggleDrive']);
        Route::get('/activity-logs', [Admin\ActivityLogController::class, 'index']);
    });
});
```

---

## Service Layer Detail

### `FileService`

```php
class FileService
{
    public function __construct(
        private StorageService $storage,
        private ActivityService $activity,
    ) {}

    // Ambil daftar file user dalam folder
    public function index(User $user, ?int $folderId, array $params): LengthAwarePaginator

    // Upload satu atau beberapa file
    public function upload(User $user, array $files, ?int $folderId): Collection

    // Rename atau pindah file
    public function update(User $user, DriveFile $file, array $data): DriveFile

    // Soft delete ke trash
    public function trash(User $user, DriveFile $file): void

    // Download stream
    public function download(User $user, DriveFile $file): StreamedResponse

    // Cek kuota sebelum upload (throws StorageQuotaExceededException)
    private function assertQuota(User $user, int $newFileSize): void

    // Hitung total storage terpakai
    public function usedStorage(User $user): int
}
```

### `FolderService`

```php
class FolderService
{
    public function index(User $user, ?int $parentId): Collection
    public function store(User $user, array $data): DriveFolder
    public function update(User $user, DriveFolder $folder, array $data): DriveFolder
    public function trash(User $user, DriveFolder $folder): void  // rekursif soft delete isi folder
    public function breadcrumb(DriveFolder $folder): array        // array dari root ke folder ini
}
```

### `StorageService`

```php
class StorageService
{
    private string $disk = 'local';

    // Simpan file ke storage
    public function store(UploadedFile $file, int $userId): string  // returns storage_path

    // Hapus file dari storage
    public function delete(string $storagePath): bool

    // Generate path: users/{user_id}/{uuid}.{ext}
    private function generatePath(int $userId, string $extension): string

    // Validasi MIME type (tidak ada executable)
    public function validateMime(string $mimeType): bool
}
```

### `ActivityService`

```php
class ActivityService
{
    public function log(
        User $user,
        string $action,
        string $subjectType,   // 'file' | 'folder'
        int $subjectId,
        string $subjectName,
        array $metadata = []
    ): DriveActivityLog
}
```

---

## Eloquent Models

### `DriveFile`

```php
class DriveFile extends Model
{
    use SoftDeletes;
    use HasUuids;          // uuid field

    protected $fillable = [
        'user_id', 'folder_id', 'name',
        'storage_path', 'mime_type', 'extension', 'size', 'checksum',
    ];

    // Relationships
    public function user(): BelongsTo
    public function folder(): BelongsTo      // → DriveFolder
    public function activityLogs(): HasMany  // → DriveActivityLog

    // Accessors
    public function getSizeHumanAttribute(): string  // "200 KB", "1.5 MB"
}
```

### `DriveFolder`

```php
class DriveFolder extends Model
{
    use SoftDeletes;
    use HasUuids;

    protected $fillable = ['user_id', 'parent_id', 'name', 'color'];

    public function user(): BelongsTo
    public function parent(): BelongsTo      // → DriveFolder (self)
    public function children(): HasMany      // → DriveFolder (self)
    public function files(): HasMany         // → DriveFile
}
```

---

## Middleware: `EnsureDriveEnabled`

```php
class EnsureDriveEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $setting = $user->driveSetting;

        if (!$setting || !$setting->is_drive_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Drive access is disabled for your account.',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## Config: `config/drive.php`

```php
return [
    'max_file_size'    => env('DRIVE_MAX_FILE_SIZE', 102400),      // KB
    'default_quota'    => env('DRIVE_DEFAULT_QUOTA', 5368709120),  // Bytes (5 GB)
    'blocked_mimes'    => [
        'application/x-php',
        'application/x-httpd-php',
        'application/x-executable',
        'application/x-sh',
        'application/x-bat',
    ],
    'blocked_extensions' => ['php', 'sh', 'bat', 'exe', 'py', 'rb', 'pl'],
    'disk'             => env('FILESYSTEM_DISK', 'local'),
];
```

---

## Exception Handling

```php
// app/Exceptions/Handler.php — tambahkan di register()
$this->renderable(function (StorageQuotaExceededException $e) {
    return response()->json([
        'success' => false,
        'message' => 'Storage quota exceeded. Please free up space or contact admin.',
    ], 507);
});
```

---

## Auto-Create Drive Settings

User setting drive dibuat otomatis saat user pertama kali mengakses drive:

```php
// Dalam middleware atau service
DriveUserSetting::firstOrCreate(
    ['user_id' => $user->id],
    ['storage_quota' => config('drive.default_quota')]
);
```
