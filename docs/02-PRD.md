# 02 — Product Requirements Document (PRD)

## Goals
Menyediakan internal cloud storage dengan UI kustom yang memungkinkan user NasLabs.id menyimpan, mengorganisir, dan mengakses file mereka secara aman dari browser, terintegrasi dengan sistem autentikasi yang sudah ada.

---

## Roles

### Admin
User dengan role `admin` memiliki akses penuh ke seluruh sistem.

**Kemampuan:**
- Melihat daftar semua user dan kuota penggunaan masing-masing
- Mengatur storage quota per user (default: 5 GB)
- Melihat activity log seluruh user
- Menghapus file/folder milik user manapun (force delete)
- Menonaktifkan akses drive untuk user tertentu
- Melihat statistik penggunaan storage keseluruhan

### User
User regular yang hanya bisa mengakses data miliknya sendiri.

**Kemampuan:**
- Upload file (single atau multiple file sekaligus)
- Download file
- Membuat, rename, dan menghapus folder
- Memindahkan file/folder ke folder lain
- Menghapus file ke Trash
- Restore file dari Trash
- Menghapus permanen dari Trash
- Mencari file/folder berdasarkan nama
- Melihat sisa kuota storage pribadi
- Melihat activity log pribadi

---

## User Stories

### Authentication
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-01 | Sebagai user, saya ingin login menggunakan akun yang sudah ada | Redirect ke halaman login jika belum auth; session persists |
| US-02 | Sebagai user, saya ingin tetap login ketika refresh halaman | Cookie session valid selama belum logout |

### File Management
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-03 | Sebagai user, saya ingin upload file ke drive saya | File tersimpan, muncul di daftar, ukuran kuota berkurang |
| US-04 | Sebagai user, saya ingin upload multiple file sekaligus | Semua file terupload dengan progress bar masing-masing |
| US-05 | Sebagai user, saya ingin drag & drop file untuk upload | Drop area highlight saat drag; file diupload otomatis |
| US-06 | Sebagai user, saya ingin download file | File terdownload dengan nama asli |
| US-07 | Sebagai user, saya ingin rename file | Nama file berubah di UI dan database |
| US-08 | Sebagai user, saya ingin memindahkan file ke folder lain | File pindah folder, path-nya berubah |

### Folder Management
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-09 | Sebagai user, saya ingin membuat folder baru | Folder muncul di daftar setelah dibuat |
| US-10 | Sebagai user, saya ingin membuat folder di dalam folder lain | Nested folder support hingga kedalaman tidak terbatas |
| US-11 | Sebagai user, saya ingin rename folder | Nama folder berubah |
| US-12 | Sebagai user, saya ingin navigasi breadcrumb | Breadcrumb menunjukkan path saat ini, clickable |

### Trash
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-13 | Sebagai user, saya ingin hapus file ke trash | File hilang dari drive tapi ada di trash |
| US-14 | Sebagai user, saya ingin restore file dari trash | File kembali ke lokasi asal |
| US-15 | Sebagai user, saya ingin hapus permanen dari trash | File hilang dari trash dan dari storage |
| US-16 | Sebagai user, saya ingin mengosongkan trash sekaligus | Semua item di trash dihapus permanen |

### Search
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-17 | Sebagai user, saya ingin mencari file berdasarkan nama | Hasil muncul real-time saat mengetik |
| US-18 | Sebagai user, saya ingin filter hasil search berdasarkan tipe file | Filter by: image, document, video, other |

### Admin
| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-19 | Sebagai admin, saya ingin melihat semua user dan storage usage | Tabel user dengan kolom: nama, email, used, quota, % |
| US-20 | Sebagai admin, saya ingin mengubah kuota storage user | Input baru tersimpan, user langsung terkena efeknya |
| US-21 | Sebagai admin, saya ingin melihat activity log seluruh user | Log tampil dengan filter user, tanggal, aksi |

---

## Non-Functional Requirements

### Performance
| Requirement | Target |
|-------------|--------|
| Upload response time | < 3 detik untuk file ≤ 10MB |
| File listing API response | < 500ms untuk ≤ 100 file |
| Search response | < 500ms |
| Download initiation | < 1 detik |

### Storage Limits
| Parameter | Value |
|-----------|-------|
| Default quota per user | 5 GB |
| Maximum file size | 100 MB per file |
| Maximum file size (configurable) | via `.env` `DRIVE_MAX_FILE_SIZE` |
| Allowed file types | Semua tipe (whitelist via config) |
| Blocked file types | `.exe`, `.sh`, `.bat`, `.php`, `.py`, `.js` (executable) |

### Availability
- Sistem mengikuti SLA server utama Laravel (tidak ada target khusus tambahan)

### Security
- File tidak bisa diakses tanpa autentikasi
- User hanya bisa akses file miliknya
- Admin bisa akses semua file

---

## MVP Definition
Phase 1 MVP dianggap selesai ketika:
1. User dapat login (existing)
2. User dapat upload, download, delete file
3. User dapat membuat dan navigasi folder
4. Trash berfungsi (soft delete + restore + permanent delete)
5. Admin dapat melihat semua user dan mengubah kuota
6. Activity log tercatat untuk semua aksi utama
7. Storage quota direspect (upload ditolak jika melebihi kuota)
