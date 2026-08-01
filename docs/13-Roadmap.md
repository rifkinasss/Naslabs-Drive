# 13 — Roadmap

## Filosofi
Pengembangan dilakukan secara bertahap (phased). Setiap phase menghasilkan **deliverable yang bisa digunakan secara nyata** — bukan setengah jadi.

---

## Phase 1 — MVP (Core Drive)
**Target:** Sistem drive dasar yang fully functional

### Backend
- [x] Setup Laravel project (integrasi dengan existing)
- [x] Database migrations (4 tabel)
- [x] Model: `DriveFile`, `DriveFolder`, `ActivityLog`, `User`
- [x] Policy: `FilePolicy`, `FolderPolicy`
- [x] Service: `StorageService`, `FolderService`, `ActivityLogService`
- [x] Controller + Request Validation: Files, Folders, Trash, Search
- [x] Middleware: Sanctum Auth & CORS
- [x] Route: semua drive routes di `api.php`
- [x] Exception Handling: Quota check & restricted extensions
- [x] Admin Controller: users (Full CRUD), quota, logs
- [x] Rate Limiting & Sanctum Token Auth

### Frontend
- [x] Setup Next.js project (App Router + TypeScript)
- [x] Setup shadcn/ui + TanStack Query + Axios
- [x] Axios config (Bearer token interceptor, 401 redirect)
- [x] Auth flow (Sanctum login + me + session)
- [x] Layout: Sidebar, Header, Mobile drawer
- [x] Halaman: Login
- [x] Halaman: My Drive (grid + list view)
- [x] Halaman: Folder view + Breadcrumb
- [x] Halaman: Trash
- [x] Halaman: Search (live keyword filter)
- [x] Halaman: Profile + Storage bar
- [x] Halaman: Settings (Profile, Password, Theme, Admin API Token)
- [x] Halaman: Admin Users (Full CRUD + Quota Editor + Enable/Disable)
- [x] Halaman: Admin Logs
- [x] Komponen: Upload Zone (drag & drop)
- [x] Komponen: File Preview Modal (Image zoom/rotate, PDF, Video/Audio player, Code/Text viewer)
- [x] Komponen: Context Menu & Action Modals (Create Folder, Rename, Delete Confirm)
- [x] Toast notifications (Sonner)

### DevOps & Deployment (Version 1)
- [x] `docker-compose.yml` (Next.js + Laravel + PostgreSQL + Nginx)
- [x] Nginx reverse proxy configuration
- [x] Dockerfile Laravel
- [x] Dockerfile Next.js
- [x] Environment variable documentation (`.env.production.example`)

### Deliverable Phase 1 (Version 1.0.0 Release)
✅ User bisa login, upload, preview, download, delete, restore, search file  
✅ Admin bisa kelola user (Full CRUD), kuota, dan audit log  
✅ Backend API persisten dengan file storage lokal & database  

---

## 🔮 Phase 2 — Future Feature Backlog (Recorded)
**Target:** Enhancement & Collaboration Features

1. 📁 **Dialog "Move To" (File/Folder Relocation)**:
   - Tree picker modal untuk memindahkan file/folder ke lokasi direktori lain.
2. 🔗 **Public Share Link & Permission Modal**:
   - Sharing link publik (`/share/{token}`) dengan opsi password & expiry date.
3. ⭐️ **Favorites / Starred Section (`/starred`)**:
   - Bookmark file/folder favorit untuk akses cepat.
4. 📊 **Storage Category Breakdown**:
   - Visual breakdown kuota berdasarkan tipe (Images, Videos, Documents, Others).

---

## Phase 2 — File Preview
**Syarat:** Phase 1 selesai

### Fitur
- Preview gambar langsung di browser (modal/lightbox) tanpa download
- Preview PDF menggunakan browser native PDF viewer
- Preview video (mp4, webm) menggunakan `<video>` tag
- Preview teks (txt, md, json, csv) dengan syntax highlighting
- Thumbnail gambar di file card (lazy loaded)

### Technical Tasks
- Backend: Endpoint `GET /api/v1/drive/files/{uuid}/preview` (stream untuk preview)
- Backend: Thumbnail generation menggunakan `intervention/image` (simpan thumbnail di storage)
- Frontend: `FilePreviewModal` component (kondisional berdasarkan MIME type)
- Frontend: Lazy load thumbnail di `FileCard`

### Deliverable Phase 2
✅ User bisa preview file tanpa download  
✅ File card menampilkan thumbnail untuk gambar  

---

## Phase 3 — File Sharing
**Syarat:** Phase 1 selesai

### Fitur
- Share file/folder ke user lain (dengan permission: view, download)
- Generate public link dengan expiry time (opsional)
- Penerima share bisa melihat file di halaman "Shared with me"
- Notifikasi email ke penerima share (via Laravel Mail)
- Owner bisa revoke share kapan saja

### Technical Tasks
- Backend: Tabel `drive_shares`, Model, Service, Controller
- Backend: Middleware cek share permission untuk public link
- Backend: Email notification
- Frontend: Share Dialog (`ShareDialog` component)
- Frontend: Halaman "Shared with me" (`/shared`)
- Frontend: Public link page (`/s/{token}`)

### Deliverable Phase 3
✅ User bisa share file ke user lain atau via public link  

---

## Phase 4 — File Versioning
**Syarat:** Phase 1 selesai

### Fitur
- Ketika file dengan nama yang sama diupload ke folder yang sama → otomatis buat versi baru (tidak overwrite)
- User bisa melihat riwayat versi file
- User bisa restore ke versi sebelumnya
- Versi lama bisa dihapus manual

### Technical Tasks
- Backend: Tabel `drive_file_versions`
- Backend: Logic di `FileService@upload()` untuk deteksi file duplikat
- Frontend: `FileVersionsPanel` component (side panel/modal)

### Deliverable Phase 4
✅ File tidak pernah tertimpa — riwayat versi terjaga  

---

## Phase 5 — MinIO/S3 Storage
**Syarat:** Phase 1 selesai

### Fitur
- Ganti storage backend dari local disk ke MinIO (S3-compatible)
- Pre-signed URL untuk download (lebih efisien daripada streaming melalui PHP)
- Multipart upload untuk file besar (> 100 MB, jika limit dinaikan)
- Admin bisa lihat total storage usage di MinIO bucket

### Technical Tasks
- Backend: Setup disk `s3` di `config/filesystems.php`
- Backend: Tambahkan MinIO container ke `docker-compose.yml`
- Backend: Ubah `StorageService` untuk support disk yang dikonfigurasi
- Backend: Pre-signed URL endpoint `GET /api/v1/drive/files/{uuid}/signed-url`
- Frontend: Gunakan pre-signed URL untuk download langsung (bypass server)

### Deliverable Phase 5
✅ Storage horizontal scalable  
✅ Download lebih cepat via pre-signed URL  

---

## Timeline Estimasi

| Phase | Estimasi Durasi | Status |
|-------|----------------|--------|
| Phase 1 — MVP | 3-4 minggu | 🟡 In Progress |
| Phase 2 — Preview | 1 minggu | ⏳ Planned |
| Phase 3 — Sharing | 2 minggu | ⏳ Planned |
| Phase 4 — Versioning | 1-2 minggu | ⏳ Planned |
| Phase 5 — MinIO | 1 minggu | ⏳ Planned |

> Estimasi per developer solo. Tim bisa lebih cepat.
