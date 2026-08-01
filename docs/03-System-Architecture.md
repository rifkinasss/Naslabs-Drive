# 03 — System Architecture

## Overview
Sistem menggunakan arsitektur **decoupled frontend-backend** di mana Next.js dan Laravel berjalan sebagai dua layanan terpisah yang berkomunikasi via REST API menggunakan Laravel Sanctum untuk autentikasi SPA.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                           │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                     │
│  drive.naslabs.id → Next.js :3000                              │
│  api.naslabs.id   → Laravel :8000                              │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐          ┌───────────────────────────────┐
│   Next.js App        │          │        Laravel API            │
│   (Frontend)         │◄────────►│        (Backend)              │
│                      │  REST    │                               │
│  - App Router        │  + Cookie│  - Routes (api.php)           │
│  - TanStack Query    │  Session │  - Controllers                │
│  - shadcn/ui         │          │  - Service Layer              │
│  - Axios             │          │  - Eloquent ORM               │
│  - react-dropzone    │          │  - Laravel Filesystem         │
└──────────────────────┘          └──────────┬────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                             │
                              ▼                             ▼
                  ┌───────────────────┐       ┌────────────────────────┐
                  │    PostgreSQL     │       │   Local File Storage   │
                  │  (Metadata DB)   │       │  storage/app/private/  │
                  │                  │       │  users/{id}/           │
                  │  - drive_files   │       │                        │
                  │  - drive_folders │       │  (Future: MinIO/S3)    │
                  │  - drive_trash   │       └────────────────────────┘
                  │  - drive_shares  │
                  │  - drive_activity│
                  └───────────────────┘
```

---

## Komponen Utama

### 1. Next.js Frontend
- **Runtime**: Node.js, dikonfigurasi sebagai App Router
- **Hosting**: Port 3000, di belakang Nginx
- **State Management**: TanStack Query untuk server state, React state untuk UI state
- **Auth State**: Tidak menyimpan token — auth bergantung pada cookie session Laravel (httpOnly cookie)
- **API Communication**: Semua request melalui Axios dengan `withCredentials: true` dan CSRF token dari Laravel `/sanctum/csrf-cookie`

### 2. Laravel Backend
- **Runtime**: PHP-FPM, dikonfigurasi dengan Nginx
- **Port**: 8000 (internal), diakses via Nginx
- **Auth Strategy**: Laravel Sanctum (SPA mode) — session-based cookie auth
- **Struktur Request Flow**:
  ```
  Route → Middleware (auth, throttle) → Controller → Service → Repository/Model → Response
  ```
- **Queue**: Job `ProcessFileUpload` untuk operasi berat (thumbnail, virus scan jika ada)

### 3. PostgreSQL
- Menyimpan seluruh **metadata** file dan folder
- File fisik **tidak** disimpan di database — hanya path dan nama
- Terhubung via Laravel Eloquent ORM

### 4. Local File Storage
- Path root: `storage/app/private/`
- Struktur per user: `users/{user_id}/{uuid}.{ext}`
- Tidak bisa diakses langsung — harus melalui endpoint download yang terproteksi
- Abstraksi menggunakan `Storage::disk('local')`

---

## Authentication Flow

```
Browser                    Next.js               Laravel
  │                           │                     │
  │ 1. Akses halaman          │                     │
  │──────────────────────────►│                     │
  │                           │ 2. GET /sanctum/csrf-cookie
  │                           │────────────────────►│
  │                           │ 3. Set XSRF-TOKEN cookie
  │                           │◄────────────────────│
  │                           │                     │
  │ 4. Submit login form      │                     │
  │──────────────────────────►│                     │
  │                           │ 5. POST /api/login  │
  │                           │────────────────────►│
  │                           │ 6. Set session cookie (laravel_session)
  │                           │◄────────────────────│
  │                           │                     │
  │ 7. Semua request API berikutnya menggunakan cookie otomatis
  │──────────────────────────►│────────────────────►│
  │                           │                     │ 8. Middleware auth validates session
  │                           │◄────────────────────│
```

---

## CORS Configuration

Laravel dikonfigurasi untuk menerima request dari origin frontend:

```php
// config/cors.php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true, // WAJIB untuk cookie-based auth
```

---

## Request Flow — Upload File

```
User drops file
      │
Next.js (react-dropzone)
      │  FormData: file + folder_id
      │  POST /api/v1/drive/files/upload
      ▼
Laravel Router
      │
Middleware: auth, throttle:60,1
      │
FileController@upload()
      │
FileService@upload(UploadFileRequest $request)
      ├── Validate: size, MIME, quota check
      ├── Generate UUID filename
      ├── StorageService@store(file, user_id) → simpan ke disk
      ├── DriveFile::create([...]) → simpan metadata ke DB
      └── ActivityService@log('upload', file_id)
      │
Response: FileResource (JSON)
      │
Next.js updates TanStack Query cache
      │
UI re-renders file list
```

---

## Environment Variables

### Laravel (.env)
```env
APP_URL=http://api.naslabs.id
FRONTEND_URL=http://drive.naslabs.id
SANCTUM_STATEFUL_DOMAINS=drive.naslabs.id

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=naslabs_cloud
DB_USERNAME=naslabs
DB_PASSWORD=secret

FILESYSTEM_DISK=local
DRIVE_MAX_FILE_SIZE=102400   # KB (100MB)
DRIVE_DEFAULT_QUOTA=5368709120  # Bytes (5GB)
```

### Next.js (.env.local)
```env
NEXT_PUBLIC_API_URL=http://api.naslabs.id
NEXT_PUBLIC_APP_NAME=NasLabs Drive
```
