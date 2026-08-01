# 04 — Database Design

## Overview
Semua tabel drive menggunakan prefix `drive_` dan memiliki foreign key ke tabel `users` yang sudah ada di sistem Laravel.

---

## Migration Order
1. `drive_folders`
2. `drive_files`
3. `drive_activity_logs`
4. `drive_shares` *(Phase 3)*
5. `drive_trash` *(data di-handle via soft delete di drive_files & drive_folders)*

> **Catatan:** Trash bukan tabel terpisah. Soft delete diimplementasikan di `drive_files` dan `drive_folders` menggunakan kolom `deleted_at`. Tabel `drive_trash` tidak diperlukan.

---

## Tabel: `drive_folders`

```sql
CREATE TABLE drive_folders (
    id          BIGSERIAL PRIMARY KEY,
    uuid        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id   BIGINT REFERENCES drive_folders(id) ON DELETE CASCADE,  -- NULL = root
    name        VARCHAR(255) NOT NULL,
    color       VARCHAR(7) NULL,          -- Hex color, e.g. "#FF5733"
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP NULL             -- Soft delete (Trash)
);

-- Indexes
CREATE INDEX idx_drive_folders_user_id ON drive_folders(user_id);
CREATE INDEX idx_drive_folders_parent_id ON drive_folders(parent_id);
CREATE INDEX idx_drive_folders_deleted_at ON drive_folders(deleted_at);
CREATE UNIQUE INDEX idx_drive_folders_unique_name
    ON drive_folders(user_id, parent_id, name)
    WHERE deleted_at IS NULL;  -- Nama unik dalam folder yang sama (hanya aktif)
```

| Kolom       | Tipe          | Nullable | Keterangan                              |
|-------------|---------------|----------|-----------------------------------------|
| id          | BIGSERIAL     | No       | Primary key                             |
| uuid        | UUID          | No       | Public identifier (digunakan di URL)    |
| user_id     | BIGINT        | No       | FK ke users.id                          |
| parent_id   | BIGINT        | Yes      | NULL = folder root user                 |
| name        | VARCHAR(255)  | No       | Nama folder                             |
| color       | VARCHAR(7)    | Yes      | Warna label folder (hex)                |
| created_at  | TIMESTAMP     | No       | —                                       |
| updated_at  | TIMESTAMP     | No       | —                                       |
| deleted_at  | TIMESTAMP     | Yes      | Soft delete — null = aktif              |

---

## Tabel: `drive_files`

```sql
CREATE TABLE drive_files (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id       BIGINT REFERENCES drive_folders(id) ON DELETE SET NULL, -- NULL = root
    name            VARCHAR(255) NOT NULL,      -- Nama asli file (display)
    storage_path    VARCHAR(500) NOT NULL,      -- Path fisik relatif ke storage disk
    mime_type       VARCHAR(127) NOT NULL,      -- e.g. "image/jpeg"
    extension       VARCHAR(20) NOT NULL,       -- e.g. "jpg"
    size            BIGINT NOT NULL,            -- Ukuran dalam bytes
    checksum        VARCHAR(64) NULL,           -- SHA-256 untuk deduplikasi (future)
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP NULL              -- Soft delete (Trash)
);

-- Indexes
CREATE INDEX idx_drive_files_user_id ON drive_files(user_id);
CREATE INDEX idx_drive_files_folder_id ON drive_files(folder_id);
CREATE INDEX idx_drive_files_deleted_at ON drive_files(deleted_at);
CREATE INDEX idx_drive_files_name ON drive_files USING gin(to_tsvector('simple', name));  -- Full-text search
CREATE INDEX idx_drive_files_mime_type ON drive_files(mime_type);
```

| Kolom         | Tipe          | Nullable | Keterangan                                  |
|---------------|---------------|----------|---------------------------------------------|
| id            | BIGSERIAL     | No       | Primary key                                 |
| uuid          | UUID          | No       | Public identifier (digunakan di URL)        |
| user_id       | BIGINT        | No       | FK ke users.id                              |
| folder_id     | BIGINT        | Yes      | NULL = file di root drive user              |
| name          | VARCHAR(255)  | No       | Nama file asli yang ditampilkan             |
| storage_path  | VARCHAR(500)  | No       | Relative path ke storage disk               |
| mime_type     | VARCHAR(127)  | No       | MIME type file                              |
| extension     | VARCHAR(20)   | No       | Ekstensi file tanpa titik                   |
| size          | BIGINT        | No       | Ukuran file dalam bytes                     |
| checksum      | VARCHAR(64)   | Yes      | SHA-256 hash untuk verifikasi integritas    |
| created_at    | TIMESTAMP     | No       | —                                           |
| updated_at    | TIMESTAMP     | No       | —                                           |
| deleted_at    | TIMESTAMP     | Yes      | Soft delete — null = aktif                  |

---

## Tabel: `drive_activity_logs`

```sql
CREATE TABLE drive_activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action      VARCHAR(50) NOT NULL,       -- 'upload', 'download', 'delete', 'restore',
                                            -- 'rename', 'move', 'create_folder', 'empty_trash'
    subject_type VARCHAR(50) NOT NULL,      -- 'file' | 'folder'
    subject_id  BIGINT NOT NULL,            -- ID dari file atau folder
    subject_name VARCHAR(255) NOT NULL,     -- Nama saat aksi terjadi (snapshot)
    metadata    JSONB NULL,                 -- Data tambahan, e.g. { "from": "folder_a", "to": "folder_b" }
    ip_address  VARCHAR(45) NULL,           -- IPv4 atau IPv6
    user_agent  TEXT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drive_activity_user_id ON drive_activity_logs(user_id);
CREATE INDEX idx_drive_activity_created_at ON drive_activity_logs(created_at DESC);
CREATE INDEX idx_drive_activity_action ON drive_activity_logs(action);
```

| Kolom        | Tipe         | Nullable | Keterangan                                  |
|--------------|--------------|----------|---------------------------------------------|
| id           | BIGSERIAL    | No       | Primary key                                 |
| user_id      | BIGINT       | No       | FK ke users.id — siapa yang melakukan aksi  |
| action       | VARCHAR(50)  | No       | Jenis aksi                                  |
| subject_type | VARCHAR(50)  | No       | `file` atau `folder`                        |
| subject_id   | BIGINT       | No       | ID record yang terdampak                    |
| subject_name | VARCHAR(255) | No       | Snapshot nama saat aksi (nama bisa berubah) |
| metadata     | JSONB        | Yes      | Info tambahan (opsional)                    |
| ip_address   | VARCHAR(45)  | Yes      | IP user                                     |
| user_agent   | TEXT         | Yes      | Browser user                                |
| created_at   | TIMESTAMP    | No       | Waktu aksi                                  |

---

## Tabel: `drive_user_settings`

```sql
CREATE TABLE drive_user_settings (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    storage_quota   BIGINT NOT NULL DEFAULT 5368709120,  -- 5 GB dalam bytes
    is_drive_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

| Kolom            | Tipe      | Nullable | Keterangan                        |
|------------------|-----------|----------|-----------------------------------|
| id               | BIGSERIAL | No       | Primary key                       |
| user_id          | BIGINT    | No       | FK ke users.id (unique: 1-to-1)   |
| storage_quota    | BIGINT    | No       | Kuota dalam bytes (default 5 GB)  |
| is_drive_enabled | BOOLEAN   | No       | Admin bisa menonaktifkan drive    |
| created_at       | TIMESTAMP | No       | —                                 |
| updated_at       | TIMESTAMP | No       | —                                 |

---

## Tabel: `drive_shares` *(Phase 3 — belum diimplementasikan di MVP)*

```sql
CREATE TABLE drive_shares (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    owner_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id  BIGINT REFERENCES users(id) ON DELETE CASCADE,  -- NULL = public link
    subject_type    VARCHAR(50) NOT NULL,  -- 'file' | 'folder'
    subject_id      BIGINT NOT NULL,
    permission      VARCHAR(20) NOT NULL DEFAULT 'view',  -- 'view' | 'download' | 'edit'
    token           VARCHAR(100) UNIQUE NULL,  -- Untuk public link
    expires_at      TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Computed Values (tidak disimpan di DB)

| Value | Cara Hitung |
|-------|-------------|
| `used_storage` | `SELECT SUM(size) FROM drive_files WHERE user_id = ? AND deleted_at IS NULL` |
| `available_storage` | `storage_quota - used_storage` |
| `quota_percentage` | `(used_storage / storage_quota) * 100` |

---

## Eloquent Model Summary

| Model | Tabel | Soft Deletes |
|-------|-------|--------------|
| `DriveFolder` | `drive_folders` | ✅ |
| `DriveFile` | `drive_files` | ✅ |
| `DriveActivityLog` | `drive_activity_logs` | ❌ |
| `DriveUserSetting` | `drive_user_settings` | ❌ |
| `DriveShare` | `drive_shares` | ❌ *(Phase 3)* |
