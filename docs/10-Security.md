# 10 — Security

## Overview
Keamanan sistem menggunakan lapisan berlapis: autentikasi existing Laravel, otorisasi berbasis Policy (RBAC), validasi file, dan rate limiting.

---

## 1. Authentication

### Mekanisme
- **Laravel Sanctum SPA mode** — menggunakan cookie session (bukan token/Bearer)
- Cookie bersifat `httpOnly` dan `Secure` — tidak bisa diakses JavaScript
- CSRF protection via `XSRF-TOKEN` cookie yang dibaca frontend dan dikirim sebagai header `X-XSRF-TOKEN`

### Config Sanctum
```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,drive.naslabs.id')),
'guard'    => ['web'],

// config/session.php
'secure'    => env('SESSION_SECURE_COOKIE', true),   // HTTPS only
'same_site' => 'lax',
'http_only' => true,
```

### Auth Flow
1. Frontend GET `/sanctum/csrf-cookie` → set `XSRF-TOKEN` cookie
2. Frontend POST `/api/v1/auth/login` dengan XSRF token → set `laravel_session` cookie
3. Semua request selanjutnya otomatis membawa kedua cookie
4. Laravel middleware `auth:sanctum` memvalidasi session per request

---

## 2. Authorization (RBAC)

### Role Matrix

| Resource | Aksi | User (own) | User (other) | Admin |
|----------|------|------------|--------------|-------|
| DriveFile | view | ✅ | ❌ | ✅ |
| DriveFile | download | ✅ | ❌ | ✅ |
| DriveFile | upload | ✅ | — | ✅ |
| DriveFile | rename | ✅ | ❌ | ✅ |
| DriveFile | move | ✅ | ❌ | ✅ |
| DriveFile | trash | ✅ | ❌ | ✅ |
| DriveFile | force delete | ✅ (own) | ❌ | ✅ |
| DriveFolder | CRUD | ✅ | ❌ | ✅ |
| DriveUserSetting | view | ✅ (own) | ❌ | ✅ |
| DriveUserSetting | edit quota | ❌ | ❌ | ✅ |
| ActivityLog | view | ✅ (own) | ❌ | ✅ (all) |

### Laravel Policy: `DriveFilePolicy`

```php
class DriveFilePolicy
{
    // View/download file
    public function view(User $user, DriveFile $file): bool
    {
        return $user->id === $file->user_id || $user->isAdmin();
    }

    // Upload ke folder milik sendiri
    public function upload(User $user, ?DriveFolder $folder): bool
    {
        if ($folder === null) return true; // root
        return $user->id === $folder->user_id;
    }

    // Update (rename/move)
    public function update(User $user, DriveFile $file): bool
    {
        return $user->id === $file->user_id || $user->isAdmin();
    }

    // Soft delete ke trash
    public function delete(User $user, DriveFile $file): bool
    {
        return $user->id === $file->user_id || $user->isAdmin();
    }

    // Force delete dari trash
    public function forceDelete(User $user, DriveFile $file): bool
    {
        return $user->id === $file->user_id || $user->isAdmin();
    }
}
```

### Middleware Admin Check
```php
// Untuk route admin
Route::middleware(['can:admin'])->group(...)

// di User model
public function isAdmin(): bool
{
    return $this->role === 'admin';
}

// Gate di AuthServiceProvider
Gate::define('admin', fn(User $user) => $user->isAdmin());
```

---

## 3. File Validation & Security

### Validasi Wajib
```php
// UploadFileRequest rules
'files.*' => [
    'file',
    'max:102400',       // 100MB
    'mimetypes:...',    // Whitelist MIME types
]
```

### Blocked File Types
```php
// config/drive.php
'blocked_mimes' => [
    'application/x-php',
    'application/x-httpd-php',
    'application/x-executable',
    'application/x-sh',
    'application/x-bat',
    'application/x-msdos-program',
    'text/x-php',
],
'blocked_extensions' => [
    'php', 'php3', 'php4', 'php5', 'phtml',
    'sh', 'bash', 'bat', 'cmd',
    'exe', 'com', 'msi',
    'py', 'rb', 'pl', 'cgi',
    'js', 'ts',   // Script files
    'jar', 'class',
],
```

### Double Validation
Laravel memvalidasi **baik MIME type maupun ekstensi** — karena attacker bisa mengubah ekstensi file untuk bypass validasi MIME.

### Path Traversal Prevention
- Nama file asli user **tidak pernah** digunakan sebagai nama file di storage
- Nama file di storage selalu UUID: `{uuid}.{ext}`
- Storage path divalidasi bahwa selalu dimulai dengan `users/{user_id}/`

---

## 4. Rate Limiting

```php
// routes/api.php atau RouteServiceProvider
RateLimiter::for('drive-upload', function (Request $request) {
    return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('drive-api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

// Penerapan di route
Route::post('/files/upload', ...)->middleware('throttle:drive-upload');
Route::middleware('throttle:drive-api')->group(...);
```

| Endpoint | Limit |
|----------|-------|
| Upload | 20 request/menit per user |
| API umum (GET/PATCH/DELETE) | 60 request/menit per user |
| Login | 5 request/menit per IP (existing) |

---

## 5. CORS

```php
// config/cors.php
return [
    'paths'               => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'     => ['*'],
    'allowed_origins'     => [env('FRONTEND_URL', 'http://localhost:3000')],
    'allowed_headers'     => ['Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers'     => ['Content-Disposition'],  // Untuk download filename
    'max_age'             => 0,
    'supports_credentials'=> true,   // WAJIB untuk SPA cookie auth
];
```

---

## 6. Download Security

File hanya bisa didownload oleh:
1. Pemilik file (`user_id === auth user id`)
2. Admin

File **tidak** pernah diserve langsung dari URL — selalu melalui controller yang memvalidasi izin:

```php
// TIDAK ADA route seperti ini:
// /storage/users/1/uuid.pdf → ❌ Blocked

// Yang ada hanya:
// GET /api/v1/drive/files/{uuid}/download → Policy check → stream file
```

Pastikan `storage/app/private/` tidak ada di dalam `public/` directory dan tidak ter-expose oleh Nginx.

---

## 7. Nginx — Storage Access Prevention

```nginx
# Blokir akses langsung ke storage/app/
location ~* /storage/app/ {
    deny all;
    return 403;
}
```

---

## 8. Audit Trail

Semua aksi sensitif dicatat di `drive_activity_logs`:

| Aksi Dicatat |
|---|
| upload |
| download |
| delete (trash) |
| restore |
| permanent_delete |
| rename |
| move |
| create_folder |
| empty_trash |
| quota_changed (admin) |
| drive_disabled (admin) |

Log menyimpan IP dan User Agent untuk keperluan forensik jika diperlukan.
