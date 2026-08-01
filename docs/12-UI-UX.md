# 12 — UI/UX

## Overview
Antarmuka menggunakan **shadcn/ui** dengan **dark mode** sebagai default. Desain terinspirasi dari Google Drive dan Notion — bersih, fungsional, dengan nuansa modern.

---

## Design System

### Color Palette
```css
/* Gunakan CSS variables shadcn/ui default dengan custom overrides */
:root {
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --primary: 221 83% 53%;        /* Blue accent */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --destructive: 0 84% 60%;
}

.dark {
  --background: 222 84% 5%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --secondary: 217 33% 17%;
  --muted: 217 33% 17%;
  --border: 217 33% 17%;
}
```

### Typography
- **Font**: Inter (Google Fonts)
- **Heading**: `font-semibold`, sizes: `text-2xl`, `text-xl`, `text-lg`
- **Body**: `text-sm` atau `text-base`
- **Muted**: `text-muted-foreground`, `text-xs`

### Spacing
- Padding konsisten: `p-4` (16px) untuk container, `p-2` (8px) untuk item
- Gap antar elemen: `gap-2` atau `gap-4`

---

## Layout Utama

```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Search Bar | User Avatar | Notifications│
├──────────────┬──────────────────────────────────────────┤
│   Sidebar    │                                          │
│              │             Main Content                 │
│  • My Drive  │                                          │
│  • Recent    │  [Breadcrumb: My Drive > Documents]      │
│  • Starred   │  ─────────────────────────────────────   │
│  • Trash     │  [Toolbar: Upload | New Folder | Views]  │
│              │  ─────────────────────────────────────   │
│  ─────────   │  [Folders Grid]                         │
│  Storage:    │  ┌──────┐ ┌──────┐ ┌──────┐            │
│  1.5/5 GB    │  │  📁  │ │  📁  │ │  📁  │            │
│  [▓▓▓░░░░░] │  │ Docs │ │Photos│ │Videos│            │
│              │  └──────┘ └──────┘ └──────┘            │
│  ─────────   │  [Files Grid/List]                      │
│  Admin Panel │  ┌──────┐ ┌──────┐ ┌──────┐            │
│  (jika admin)│  │  📄  │ │  🖼️  │ │  📊  │            │
└──────────────┴──────────────────────────────────────────┘
```

---

## Halaman & Komponen Per Halaman

### 1. Login Page (`/login`)
- **Layout**: Centered card di halaman full-screen dengan gradient background
- **Komponen**: 
  - Logo NasLabs
  - Form: `Input` (email), `Input` (password), `Button` (Login)
  - Link "Lupa Password?" (ke sistem existing)
- **Behavior**: 
  - Submit → POST `/api/v1/auth/login`
  - Success → redirect ke `/drive`
  - Error → tampilkan pesan error di bawah form

---

### 2. My Drive (`/drive` & `/drive/[uuid]`)
**Header Toolbar:**
```
[+ Upload ▼]  [+ New Folder]   [Sort: Name ▼]   [☰ List | ⊞ Grid]
```

**Sections:**
1. **Breadcrumb** — klik untuk navigasi: `My Drive > Documents > Invoices`
2. **Folders Grid** (tampil dulu sebelum file)
3. **Files Grid/List** (toggle oleh user)
4. **Empty State** — jika folder kosong: ilustrasi + tombol upload

**Drag & Drop:**
- Seluruh halaman bisa menjadi drop zone
- Saat file di-drag: overlay muncul "Drop files here to upload"
- Setelah drop: upload dimulai, progress card muncul di pojok kanan bawah

**Right-Click Context Menu (FileContextMenu):**
```
📥 Download
✏️ Rename
📂 Move to
🗑️ Move to Trash
── (divider)
ℹ️ File Info
```

**File Card (Grid View):**
```
┌──────────────────┐
│    📄            │  ← File type icon (besar)
│                  │
│  report.pdf      │  ← Nama file (truncate jika panjang)
│  200 KB          │  ← Ukuran
│  ⋮               │  ← Kebab menu
└──────────────────┘
```

**File Row (List View):**
```
📄 report.pdf    ─────────────   200 KB   2 hari lalu   ⋮
```

---

### 3. Trash (`/trash`)
**Layout:**
- Tab: `Files` | `Folders`
- Banner info: "Items in trash are permanently deleted after 30 days"
- Tombol: `Empty Trash` (di kanan atas, destructive)
- Setiap item punya tombol: `Restore` | `Delete Permanently`

---

### 4. Search (`/search?q=...`)
**Layout:**
- Search bar di header (autocomplete saat mengetik)
- Hasil dikelompokkan: `Folders` + `Files`
- Highlight kata kunci di nama hasil
- Filter chip: `All` | `Images` | `Documents` | `Videos`

---

### 5. Profile (`/profile`)
**Sections:**
1. **User Info** — nama, email, role
2. **Storage Usage**:
   ```
   💾 Storage Used
   [▓▓▓▓░░░░░░░░░░░░░░░░] 1.5 GB / 5 GB (30%)
   ```
3. **Recent Activity** — 10 log aktivitas terakhir milik user

---

### 6. Admin Dashboard (`/admin`)
**Stats Cards:**
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Total    │  │ Active   │  │ Total    │  │ Today's  │
│ Users    │  │ Files    │  │ Storage  │  │ Uploads  │
│   42     │  │  1,234   │  │  125 GB  │  │   23     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 6a. Admin Users (`/admin/users`)
**Tabel:**
| Nama | Email | Used | Quota | % | Status | Aksi |
|------|-------|------|-------|---|--------|------|
| Rifki | rifki@... | 1.5 GB | 5 GB | 30% | Active | Edit Quota |

**Edit Quota Dialog:**
```
Input: [10] GB  [Save]
```

### 6b. Activity Logs (`/admin/logs`)
**Filter:**
- User (dropdown)
- Aksi (dropdown: upload, download, delete, ...)
- Tanggal range (date picker)

**Tabel:**
| User | Aksi | File/Folder | IP | Waktu |
|------|------|-------------|-----|-------|

---

## UX Behaviors

### Upload Progress Card (Floating)
Muncul di **pojok kanan bawah** saat ada upload aktif:
```
┌─────────────────────────────────┐
│ ⬆ Uploading 3 files         ─ × │
├─────────────────────────────────┤
│ 📄 report.pdf                ✅  │
│ 🖼️ photo.jpg    ▓▓▓▓░░░ 60%  ⏳  │
│ 🎬 video.mp4         Queued  ⏳  │
└─────────────────────────────────┘
```

### Kuota Warning
Jika kuota > 90% terpakai:
```
⚠️ Storage almost full (95%). Contact admin to increase quota.
```

Jika kuota 100%:
```
🚫 Storage full. Upload disabled.
```

### Toast Notifications (via Sonner)
| Aksi | Toast |
|------|-------|
| Upload berhasil | ✅ "3 files uploaded" |
| Upload gagal | ❌ "Upload failed: quota exceeded" |
| Delete ke trash | 🗑️ "Moved to trash" + Undo button |
| Restore | ✅ "File restored" |
| Rename | ✅ "Renamed to new-name.pdf" |

### Loading States
- File list: Skeleton cards (bukan spinner)
- Upload: Progress bar per file
- Delete/Rename: Loading spinner di button, button disabled

### Empty States
- My Drive (kosong): Ilustrasi + "Your drive is empty. Upload your first file."
- Trash (kosong): Ilustrasi + "Trash is empty"
- Search (no results): "No files found for '{query}'"

---

## Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| Mobile (`< 768px`) | Sidebar collapse ke hamburger menu (Sheet component) |
| Tablet (`768px - 1024px`) | Sidebar tersembunyi, toggle button |
| Desktop (`> 1024px`) | Sidebar selalu visible |

**Grid columns:**
- Mobile: 2 kolom
- Tablet: 3-4 kolom
- Desktop: 5-6 kolom
