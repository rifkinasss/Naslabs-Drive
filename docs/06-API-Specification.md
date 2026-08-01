# 06 — API Specification

## Base URL
```
https://api.naslabs.id/api/v1
```

## Authentication
Semua endpoint (kecuali login) membutuhkan autentikasi via Laravel Sanctum (cookie-based SPA).

**Headers wajib:**
```
Accept: application/json
X-XSRF-TOKEN: {token dari cookie}   // untuk POST/PUT/DELETE
```

**Sebelum request pertama**, frontend harus memanggil:
```
GET /sanctum/csrf-cookie
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Paginated List
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Validation error detail"]
  }
}
```

---

## Auth Endpoints

### `POST /auth/login`
Login menggunakan kredensial existing.
```json
// Request
{ "email": "user@naslabs.id", "password": "secret" }

// Response 200
{ "success": true, "data": { "user": { "id": 1, "name": "Rifki", "email": "...", "role": "user" } } }

// Error 422
{ "success": false, "message": "The provided credentials are incorrect." }
```

### `POST /auth/logout`
```json
// Response 200
{ "success": true, "message": "Logged out" }
```

### `GET /auth/me`
```json
// Response 200
{
  "success": true,
  "data": {
    "id": 1, "name": "Rifki", "email": "user@naslabs.id", "role": "user",
    "drive": {
      "storage_quota": 5368709120,
      "used_storage": 1073741824,
      "available_storage": 4294967296,
      "quota_percentage": 20.0,
      "is_drive_enabled": true
    }
  }
}
```

---

## Drive — File Endpoints

### `GET /drive/files`
Ambil daftar file dalam folder tertentu.

**Query Params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `folder_id` | integer | null | null = root |
| `per_page` | integer | 20 | Jumlah per halaman |
| `page` | integer | 1 | Halaman |
| `sort` | string | `name` | `name`, `size`, `created_at`, `updated_at` |
| `order` | string | `asc` | `asc`, `desc` |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "report.pdf",
      "mime_type": "application/pdf",
      "extension": "pdf",
      "size": 204800,
      "size_human": "200 KB",
      "folder_id": null,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 5, "last_page": 1 }
}
```

### `POST /drive/files/upload`
Upload satu atau beberapa file.

**Request:** `multipart/form-data`
| Field | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `files[]` | file | Yes | Array file (max 10 sekaligus) |
| `folder_id` | integer | No | null = root |

**Response 201:**
```json
{
  "success": true,
  "data": [
    { "uuid": "...", "name": "photo.jpg", "size": 1048576, "mime_type": "image/jpeg", ... }
  ],
  "message": "1 file uploaded successfully"
}
```

**Errors:**
| Code | Keterangan |
|------|------------|
| 413 | File terlalu besar (> max size) |
| 422 | Tipe file tidak diizinkan |
| 507 | Kuota storage habis |

### `GET /drive/files/{uuid}/download`
Download file.

**Response:** File stream dengan header:
```
Content-Disposition: attachment; filename="report.pdf"
Content-Type: application/pdf
```

### `GET /drive/files/{uuid}`
Detail metadata file.

### `PATCH /drive/files/{uuid}`
Rename atau pindah file.

**Request:**
```json
{ "name": "new-name.pdf" }
// atau
{ "folder_id": 5 }
// atau keduanya
{ "name": "new-name.pdf", "folder_id": 5 }
```

### `DELETE /drive/files/{uuid}`
Pindahkan file ke trash (soft delete).

**Response 200:**
```json
{ "success": true, "message": "File moved to trash" }
```

---

## Drive — Folder Endpoints

### `GET /drive/folders`
Ambil daftar folder dalam parent folder.

**Query Params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `parent_id` | integer | null | null = root |

### `POST /drive/folders`
Buat folder baru.

**Request:**
```json
{ "name": "My Documents", "parent_id": null, "color": "#FF5733" }
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1, "uuid": "...", "name": "My Documents",
    "parent_id": null, "color": "#FF5733",
    "created_at": "..."
  }
}
```

### `PATCH /drive/folders/{uuid}`
Rename atau pindah folder.

```json
{ "name": "New Folder Name" }
// atau
{ "parent_id": 3 }
```

### `DELETE /drive/folders/{uuid}`
Pindahkan folder ke trash (soft delete, rekursif ke isi folder).

### `GET /drive/folders/{uuid}/breadcrumb`
Ambil breadcrumb path dari root ke folder.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": null, "uuid": null, "name": "My Drive" },
    { "id": 1, "uuid": "...", "name": "Documents" },
    { "id": 2, "uuid": "...", "name": "Invoices" }
  ]
}
```

---

## Drive — Trash Endpoints

### `GET /drive/trash`
Ambil semua file dan folder yang ada di trash (milik user).

```json
{
  "success": true,
  "data": {
    "files": [ { "uuid": "...", "name": "old.pdf", "deleted_at": "..." } ],
    "folders": [ { "uuid": "...", "name": "Old Folder", "deleted_at": "..." } ]
  }
}
```

### `POST /drive/trash/{uuid}/restore`
Restore file atau folder dari trash.

**Query Params:** `?type=file` atau `?type=folder`

### `DELETE /drive/trash/{uuid}`
Hapus permanen dari trash.

**Query Params:** `?type=file` atau `?type=folder`

### `DELETE /drive/trash`
Kosongkan seluruh trash milik user.

---

## Drive — Search Endpoint

### `GET /drive/search`

**Query Params:**
| Param | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `q` | string | Yes | Kata kunci pencarian |
| `type` | string | No | `file`, `folder`, kosong = semua |
| `mime` | string | No | Filter by MIME, e.g. `image`, `pdf` |

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [ { "uuid": "...", "name": "report.pdf", "folder_path": "Documents/Invoices" } ],
    "folders": [ { "uuid": "...", "name": "Reports" } ]
  }
}
```

---

## Admin Endpoints

> Semua endpoint admin membutuhkan role `admin`.

### `GET /admin/users`
Daftar semua user beserta usage storage.

### `GET /admin/users/{id}/storage`
Detail storage usage seorang user.

### `PATCH /admin/users/{id}/quota`
Ubah kuota storage user.

```json
{ "storage_quota": 10737418240 }  // 10 GB dalam bytes
```

### `PATCH /admin/users/{id}/drive`
Aktifkan/nonaktifkan drive user.

```json
{ "is_drive_enabled": false }
```

### `GET /admin/activity-logs`
Lihat log aktivitas seluruh user.

**Query Params:** `user_id`, `action`, `date_from`, `date_to`, `per_page`, `page`

---

## HTTP Status Codes

| Code | Keterangan |
|------|------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete berhasil) |
| 400 | Bad Request |
| 401 | Unauthenticated |
| 403 | Forbidden (tidak punya akses) |
| 404 | Not Found |
| 413 | Payload Too Large (file terlalu besar) |
| 422 | Validation Error |
| 429 | Too Many Requests (rate limited) |
| 507 | Insufficient Storage (kuota habis) |
| 500 | Server Error |
