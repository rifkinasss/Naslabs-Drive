# 14 — Tasklist (Phase 1 MVP)

Tasklist detail untuk Phase 1 MVP. Dikerjakan secara berurutan per layer.

---

## 🔵 BACKEND (Laravel)

### B1. Project Setup
- [ ] Tambahkan package: `laravel/sanctum` (jika belum ada)
- [ ] Publish config sanctum: `php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`
- [ ] Update `config/cors.php` — set `supports_credentials = true`, `allowed_origins = [FRONTEND_URL]`
- [ ] Update `config/session.php` — set `same_site = lax`, `secure = true`
- [ ] Buat `config/drive.php`
- [ ] Daftarkan `EnsureDriveEnabled` middleware di `bootstrap/app.php`

### B2. Database Migrations
- [ ] Migration: `create_drive_user_settings_table`
- [ ] Migration: `create_drive_folders_table`
- [ ] Migration: `create_drive_files_table`
- [ ] Migration: `create_drive_activity_logs_table`
- [ ] Jalankan: `php artisan migrate`

### B3. Models
- [ ] `DriveUserSetting` model (fillable, relations, HasUuids)
- [ ] `DriveFolder` model (fillable, SoftDeletes, HasUuids, relations: user, parent, children, files)
- [ ] `DriveFile` model (fillable, SoftDeletes, HasUuids, relations: user, folder; accessor: size_human)
- [ ] `DriveActivityLog` model (fillable, relations: user)
- [ ] Update `User` model: tambahkan relasi `driveSetting`, `driveFiles`, `driveFolders`; tambahkan method `isAdmin()`

### B4. Policies & Gates
- [ ] `DriveFilePolicy` (view, upload, update, delete, forceDelete)
- [ ] `DriveFolderPolicy` (view, create, update, delete)
- [ ] Register policies di `AuthServiceProvider` (atau `AppServiceProvider`)
- [ ] Definisikan Gate `admin` di `AppServiceProvider`

### B5. Exceptions
- [ ] `StorageQuotaExceededException`
- [ ] `DriveDisabledException`
- [ ] Register exception renderer di `bootstrap/app.php` atau `Handler.php`

### B6. Services
- [ ] `StorageService` (generatePath, store, delete, validateMime)
- [ ] `ActivityService` (log method)
- [ ] `FileService` (index, upload, update, trash, download, usedStorage, assertQuota)
- [ ] `FolderService` (index, store, update, trash, breadcrumb)
- [ ] `TrashService` (index, restore, forceDelete, empty)
- [ ] `SearchService` (search files, search folders)

### B7. Form Requests (Validation)
- [ ] `UploadFileRequest`
- [ ] `CreateFolderRequest`
- [ ] `UpdateFileRequest`
- [ ] `UpdateFolderRequest`
- [ ] `SearchRequest`
- [ ] `UpdateQuotaRequest`

### B8. API Resources
- [ ] `DriveFileResource`
- [ ] `DriveFileCollection`
- [ ] `DriveFolderResource`
- [ ] `BreadcrumbResource`
- [ ] `UserStorageResource`
- [ ] `ActivityLogResource`

### B9. Controllers
- [ ] `FileController` (index, upload, show, download, update, destroy)
- [ ] `FolderController` (index, store, show, breadcrumb, update, destroy)
- [ ] `TrashController` (index, restore, forceDelete, empty)
- [ ] `SearchController` (index)
- [ ] `Admin\UserController` (index, storage, updateQuota, toggleDrive)
- [ ] `Admin\ActivityLogController` (index)

### B10. Routes
- [ ] Definisikan semua routes di `routes/api.php`
- [ ] Test semua endpoint: `php artisan route:list --path=api/v1`

### B11. Rate Limiting
- [ ] Definisikan `drive-upload` limiter (20/menit per user)
- [ ] Definisikan `drive-api` limiter (60/menit per user)
- [ ] Terapkan ke routes

### B12. Auto-create Drive Settings
- [ ] Logic `firstOrCreate` DriveUserSetting saat user pertama akses drive
- [ ] Tempatkan di middleware `EnsureDriveEnabled`

---

## 🟢 FRONTEND (Next.js)

### F1. Project Setup
- [ ] Inisialisasi: `npx create-next-app@latest ./ --typescript --app --tailwind`
- [ ] Install shadcn/ui: `npx shadcn@latest init`
- [ ] Install dependencies: `@tanstack/react-query axios react-dropzone sonner lucide-react`
- [ ] Setup `lib/api/axios.ts` (withCredentials, XSRF interceptor, 401 redirect)
- [ ] Setup `lib/query-client.ts`
- [ ] Setup `providers/AppProviders.tsx` (QueryClientProvider, Toaster)
- [ ] Update `app/layout.tsx` dengan AppProviders dan font Inter

### F2. TypeScript Types
- [ ] `types/drive.ts` (DriveFile, DriveFolder, StorageInfo, BreadcrumbItem)
- [ ] `types/api.ts` (ApiResponse, PaginatedResponse)
- [ ] `types/user.ts` (User, AuthUser)

### F3. API Functions
- [ ] `lib/api/auth.ts` (getCsrfCookie, login, logout, me)
- [ ] `lib/api/drive.ts` (getFiles, upload, getFile, download, updateFile, deleteFile)
- [ ] `lib/api/folders.ts` (getFolders, createFolder, updateFolder, deleteFolder, getBreadcrumb)
- [ ] `lib/api/trash.ts` (getTrash, restore, forceDelete, emptyTrash)
- [ ] `lib/api/search.ts` (search)
- [ ] `lib/api/admin.ts` (getUsers, getUserStorage, updateQuota, toggleDrive, getLogs)

### F4. Custom Hooks
- [ ] `useAuthUser` (TanStack Query: fetch /auth/me)
- [ ] `useDriveFiles` (fetch files by folder)
- [ ] `useDriveFolders` (fetch folders by parent)
- [ ] `useUpload` (mutation + progress tracking)
- [ ] `useTrash` (fetch + restore + delete mutations)
- [ ] `useSearch` (debounced query)
- [ ] `useStorageInfo` (fetch quota dari /auth/me)
- [ ] `useAdmin` (fetch users, quota mutations, logs)

### F5. Layout Components
- [ ] `Sidebar` component (nav links + storage bar)
- [ ] `Header` component (search + user avatar + notifications)
- [ ] `MobileNav` component (Sheet untuk mobile)
- [ ] Drive layout (`(drive)/layout.tsx`)
- [ ] Admin layout (`(admin)/layout.tsx`)
- [ ] Auth guard (redirect ke /login jika 401)

### F6. Drive Components
- [ ] `StorageBar` (progress bar kuota)
- [ ] `Breadcrumb` (clickable path)
- [ ] `FileCard` (grid view card)
- [ ] `FolderCard` (grid view card)
- [ ] `FileRow` (list view row)
- [ ] `FolderRow` (list view row)
- [ ] `FileGrid` (container grid + list toggle)
- [ ] `UploadZone` (drag & drop area, react-dropzone)
- [ ] `UploadProgress` (floating progress card)
- [ ] `FileContextMenu` (right-click menu, DropdownMenu)
- [ ] `CreateFolderDialog` (modal create folder)
- [ ] `RenameDialog` (modal rename)
- [ ] `MoveDialog` (modal move dengan folder tree picker)
- [ ] `DeleteConfirmDialog` (modal konfirmasi hapus)
- [ ] `EmptyState` (tampilan folder kosong)
- [ ] `FileSkeleton` (loading state)

### F7. Pages
- [ ] Login page (`/login`) — form + logic
- [ ] My Drive page (`/drive`) — file list + upload
- [ ] Folder page (`/drive/[uuid]`) — folder contents
- [ ] Trash page (`/trash`)
- [ ] Search page (`/search`)
- [ ] Profile page (`/profile`)
- [ ] Admin dashboard (`/admin`)
- [ ] Admin users page (`/admin/users`)
- [ ] Admin logs page (`/admin/logs`)

### F8. UX Polish
- [ ] Toast notifications (Sonner) untuk semua operasi
- [ ] Skeleton loading untuk semua list
- [ ] Empty state untuk semua halaman
- [ ] Storage warning ketika > 90% penuh
- [ ] Keyboard shortcut: `/` untuk fokus search, `u` untuk open upload dialog
- [ ] Responsive: mobile sidebar via Sheet

---

## 🟠 DEVOPS

### D1. Docker Setup
- [ ] `docker-compose.yml` (nginx, laravel, nextjs, postgres, redis)
- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] `docker/nginx/conf.d/api.naslabs.id.conf`
- [ ] `docker/nginx/conf.d/drive.naslabs.id.conf`

### D2. Environment
- [ ] `backend/.env.example` dengan semua variable terdokumentasi
- [ ] `frontend/.env.example`

### D3. Documentation
- [ ] `README.md` di root: cara setup, cara run, cara deploy

---

## ✅ DEFINITION OF DONE (Phase 1)

Phase 1 dianggap **selesai** ketika semua kondisi berikut terpenuhi:

- [ ] Semua backend tests pass (atau setidaknya endpoint manual tested)
- [ ] User bisa login → masuk halaman Drive
- [ ] User bisa upload file (drag & drop dan click)
- [ ] User bisa membuat folder dan navigasi masuk ke folder
- [ ] User bisa download file
- [ ] User bisa rename file/folder
- [ ] User bisa soft-delete (ke trash) dan restore
- [ ] User bisa permanent-delete dari trash
- [ ] Storage quota terrespect (upload ditolak jika melebihi)
- [ ] Admin bisa lihat semua user + storage usage
- [ ] Admin bisa ubah kuota user
- [ ] Activity log tercatat untuk semua aksi
- [ ] Running dengan `docker compose up`
