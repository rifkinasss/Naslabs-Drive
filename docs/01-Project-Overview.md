# 01 — Project Overview

## Nama Project
**Drive Cloud Module** — NasLabs.id

---

## Deskripsi
Drive Cloud Module adalah modul penyimpanan file berbasis web yang dibangun di atas infrastruktur Laravel yang sudah ada. Modul ini menyediakan antarmuka seperti Google Drive untuk kebutuhan internal organisasi, memungkinkan user mengelola file dan folder secara terstruktur dengan kuota penyimpanan yang terkontrol.

Modul ini **bukan** aplikasi baru yang berdiri sendiri — melainkan **ekstensi** dari sistem Laravel yang sudah memiliki autentikasi, user management, dan database PostgreSQL.

---

## Tech Stack

| Layer       | Teknologi                                | Versi    |
|-------------|------------------------------------------|----------|
| Frontend    | Next.js + React + TypeScript             | Next 15+ |
| UI Library  | shadcn/ui + Radix UI + Tailwind CSS      | Latest   |
| Data Fetching | TanStack Query (React Query)           | v5       |
| HTTP Client | Axios                                    | Latest   |
| Backend     | Laravel                                  | 12.x     |
| Database    | PostgreSQL                               | 15+      |
| Storage     | Laravel Filesystem (local disk)          | Built-in |
| Auth        | Laravel Session / Sanctum (existing)     | Existing |
| Queue       | Laravel Queue + Database Driver          | Built-in |
| Cache       | Redis (opsional, fallback: file cache)   | 7.x      |
| Deployment  | Docker + Docker Compose + Nginx          | Latest   |

---

## Scope

### Dalam Scope (MVP)
- Upload file (single & multi-file, max 100MB per file)
- Download file
- Manajemen folder (create, rename, delete, nested)
- Soft delete & Trash (restore, permanent delete)
- Search file & folder berdasarkan nama
- Storage quota per user (admin yang mengatur)
- Admin panel (kelola user, kuota, lihat log aktivitas)
- Activity log (upload, download, delete, rename)

### Luar Scope (Future Phases)
- Preview file in-browser (Phase 2)
- File sharing antar user (Phase 3)
- File versioning (Phase 4)
- MinIO/S3 integration (Phase 5)
- Real-time collaboration
- Mobile app

---

## Constraint & Integrasi

### Constraint Laravel Existing
- **Auth tidak diubah** — sistem login/logout/session yang sudah ada tetap digunakan tanpa modifikasi
- **Tabel `users` sudah ada** — semua tabel drive menggunakan FK ke `users.id`
- **Database connection sudah dikonfigurasi** — tidak perlu setup ulang
- **Middleware auth sudah ada** — route drive cukup menggunakan middleware `auth` yang existing

### Constraint Frontend
- Next.js berkomunikasi dengan Laravel via REST API
- Auth state diambil dari cookie session Laravel (Sanctum SPA mode)
- CORS dikonfigurasi di Laravel untuk menerima request dari domain Next.js
- Frontend dihosting di domain/port yang berbeda dari Laravel (contoh: `drive.naslabs.id` → `api.naslabs.id`)

### Constraint Storage
- Storage awal menggunakan local disk Laravel (`storage/app/private/`)
- File **tidak** dapat diakses langsung via URL publik — harus melalui API endpoint yang terproteksi
- Path fisik: `storage/app/private/users/{user_id}/{uuid_filename}`

---

## Dependency Eksternal

| Dependency         | Keperluan                        |
|--------------------|----------------------------------|
| `spatie/laravel-activitylog` | Activity logging (opsional, bisa custom) |
| `league/flysystem` | Laravel Filesystem abstraction   |
| `intervention/image` | Thumbnail generation (Phase 2) |
| `@tanstack/react-query` | Server state management di Next.js |
| `axios`            | HTTP client di Next.js           |
| `shadcn/ui`        | Component library                |
| `lucide-react`     | Icon library                     |
| `react-dropzone`   | Drag & drop upload               |

---

## Alur Umum Sistem

```
User Browser
    │
    ▼
Next.js App (Frontend)
    │  REST API + Cookie Auth
    ▼
Laravel API (Backend)
    ├── Auth Middleware (existing)
    ├── Policy / RBAC Check
    ├── Service Layer (business logic)
    │       ├── FileService
    │       ├── FolderService
    │       ├── StorageService
    │       └── ActivityService
    ├── PostgreSQL (metadata)
    └── Local Filesystem (file fisik)
```

---

## Tim & Ownership

| Role      | Tanggung Jawab                         |
|-----------|----------------------------------------|
| Backend   | Laravel API, DB migration, storage     |
| Frontend  | Next.js UI, TanStack Query, UX         |
| DevOps    | Docker, Nginx, deployment              |

---

## Referensi Dokumen
- [02-PRD.md](./02-PRD.md) — Product Requirements
- [03-System-Architecture.md](./03-System-Architecture.md) — Arsitektur sistem
- [14-Tasklist.md](./14-Tasklist.md) — Task breakdown
- [13-Roadmap.md](./13-Roadmap.md) — Fase pengembangan
