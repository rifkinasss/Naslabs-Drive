# 07 — Frontend Architecture

## Overview
Frontend dibangun dengan **Next.js App Router** + **TypeScript**, menggunakan **TanStack Query** untuk data fetching dan **shadcn/ui** sebagai component library.

---

## Struktur Folder

```
/frontend
├── app/                          # App Router pages
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Halaman login
│   ├── (drive)/
│   │   ├── layout.tsx            # Layout utama (sidebar + header)
│   │   ├── drive/
│   │   │   ├── page.tsx          # My Drive (root)
│   │   │   └── [uuid]/
│   │   │       └── page.tsx      # Isi folder
│   │   ├── trash/
│   │   │   └── page.tsx          # Halaman Trash
│   │   ├── search/
│   │   │   └── page.tsx          # Hasil pencarian
│   │   └── profile/
│   │       └── page.tsx          # Profil & storage info
│   ├── (admin)/
│   │   ├── layout.tsx            # Layout admin (sidebar admin)
│   │   ├── admin/
│   │   │   ├── page.tsx          # Admin dashboard
│   │   │   ├── users/
│   │   │   │   └── page.tsx      # Manajemen user
│   │   │   └── logs/
│   │   │       └── page.tsx      # Activity logs
│   ├── layout.tsx                # Root layout (font, providers)
│   └── not-found.tsx
│
├── components/
│   ├── drive/                    # Komponen spesifik drive
│   │   ├── FileCard.tsx          # Card tampilan file (grid)
│   │   ├── FileRow.tsx           # Row tampilan file (list)
│   │   ├── FolderCard.tsx        # Card tampilan folder
│   │   ├── FolderRow.tsx
│   │   ├── FileGrid.tsx          # Grid layout file+folder
│   │   ├── FileList.tsx          # List layout file+folder
│   │   ├── UploadZone.tsx        # Drag & drop upload area
│   │   ├── UploadProgress.tsx    # Progress bar upload (floating)
│   │   ├── Breadcrumb.tsx        # Path navigation
│   │   ├── CreateFolderDialog.tsx
│   │   ├── RenameDialog.tsx
│   │   ├── MoveDialog.tsx
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── FileContextMenu.tsx   # Right-click menu
│   │   ├── StorageBar.tsx        # Kuota visual bar
│   │   └── EmptyState.tsx        # Tampilan saat folder kosong
│   ├── admin/
│   │   ├── UserTable.tsx
│   │   ├── QuotaEditor.tsx
│   │   └── ActivityLogTable.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   └── ui/                       # shadcn/ui components (auto-generated)
│
├── hooks/                        # Custom React hooks
│   ├── useDriveFiles.ts          # TanStack Query: fetch file list
│   ├── useDriveFolders.ts
│   ├── useUpload.ts              # Upload dengan progress tracking
│   ├── useTrash.ts
│   ├── useSearch.ts
│   ├── useStorageInfo.ts         # Kuota usage
│   ├── useAuthUser.ts            # Current user data
│   └── useAdmin.ts               # Admin queries
│
├── lib/
│   ├── api/
│   │   ├── axios.ts              # Axios instance + interceptors
│   │   ├── drive.ts              # API functions: files
│   │   ├── folders.ts            # API functions: folders
│   │   ├── trash.ts              # API functions: trash
│   │   ├── search.ts             # API functions: search
│   │   └── admin.ts              # API functions: admin
│   ├── utils.ts                  # Helper functions (formatBytes, etc.)
│   ├── constants.ts              # App constants (MIME_TYPES, dll.)
│   └── query-client.ts           # TanStack Query client config
│
├── types/
│   ├── drive.ts                  # DriveFile, DriveFolder interfaces
│   ├── api.ts                    # ApiResponse, PaginatedResponse types
│   └── user.ts                   # User, AuthUser types
│
├── providers/
│   └── AppProviders.tsx          # QueryClientProvider, etc.
│
├── public/
│   └── icons/                    # File type icons
│
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── components.json               # shadcn/ui config
└── tsconfig.json
```

---

## State Management

### Server State — TanStack Query
Semua data dari API dikelola TanStack Query. Tidak ada Redux/Zustand untuk server state.

```ts
// hooks/useDriveFiles.ts
export function useDriveFiles(folderId?: number) {
  return useQuery({
    queryKey: ['drive', 'files', folderId ?? 'root'],
    queryFn: () => driveApi.getFiles({ folder_id: folderId }),
    staleTime: 30_000,   // 30 detik sebelum refetch
  })
}

// Mutation untuk upload
export function useUploadFiles(folderId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: driveApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive', 'files', folderId ?? 'root'] })
      queryClient.invalidateQueries({ queryKey: ['storage', 'info'] })
    },
  })
}
```

### UI State — React State / URL State
- Tampilan grid/list → `useState`
- Selected files (multi-select) → `useState`
- Search query → URL search params (`useSearchParams`)
- Current folder → URL params (`useParams`)
- Upload progress → `useUpload` hook dengan `useState`

---

## Routing Strategy

| Route | Halaman |
|-------|---------|
| `/login` | Halaman login |
| `/drive` | My Drive (root) |
| `/drive/[uuid]` | Isi folder berdasarkan UUID folder |
| `/trash` | Halaman Trash |
| `/search?q=...` | Hasil pencarian |
| `/profile` | Profil user + storage info |
| `/admin` | Admin dashboard |
| `/admin/users` | Manajemen user |
| `/admin/logs` | Activity logs |

---

## Axios Configuration

```ts
// lib/api/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  withCredentials: true,       // Wajib untuk cookie-based auth
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // Agar Laravel tahu ini AJAX
  },
})

// Request interceptor: tambahkan XSRF token dari cookie
api.interceptors.request.use((config) => {
  const xsrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken)
  }
  return config
})

// Response interceptor: redirect ke login jika 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

---

## Upload Flow (Frontend)

```
1. User drop file ke UploadZone
2. useUpload hook dipanggil
3. FormData dibuat: files[], folder_id
4. Axios POST ke /api/v1/drive/files/upload
   - onUploadProgress: update progress state
5. Tampilkan UploadProgress floating card
6. onSuccess: invalidate query cache → file list refresh
7. onError: tampilkan toast error
```

---

## Komponen Utama

### `FileContextMenu.tsx`
Right-click menu dengan aksi:
- Download
- Rename
- Move to
- Copy
- Delete (Trash)
- Get info

### `UploadProgress.tsx`
Floating card di pojok kanan bawah saat upload:
```
📁 Uploading 3 files
▓▓▓▓▓▓░░░░ 60%
report.pdf       ✅
photo.jpg        ⏳ 60%
video.mp4        ⏳ Queued
```

### `StorageBar.tsx`
```
💾 1.5 GB / 5 GB used (30%)
[▓▓▓░░░░░░░░░░░░░░░░░░]
```

---

## shadcn/ui Components Digunakan

| Komponen | Digunakan Untuk |
|----------|----------------|
| `Button` | Semua tombol |
| `Dialog` | Modal (create folder, rename, delete confirm) |
| `DropdownMenu` | Context menu, sort menu |
| `Input` | Form fields |
| `Progress` | Progress bar upload |
| `ScrollArea` | Sidebar, file list |
| `Breadcrumb` | Navigasi folder |
| `Table` | Admin user list, log list |
| `Badge` | File type badge |
| `Skeleton` | Loading state |
| `Toast` | Notifikasi (via sonner) |
| `Tooltip` | Hover info |
| `Sheet` | Mobile sidebar |

---

## TypeScript Types

```ts
// types/drive.ts
export interface DriveFile {
  id: number
  uuid: string
  name: string
  mime_type: string
  extension: string
  size: number
  size_human: string
  folder_id: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DriveFolder {
  id: number
  uuid: string
  name: string
  parent_id: number | null
  color: string | null
  created_at: string
  deleted_at: string | null
}

export interface StorageInfo {
  storage_quota: number
  used_storage: number
  available_storage: number
  quota_percentage: number
  is_drive_enabled: boolean
}

// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}
```
