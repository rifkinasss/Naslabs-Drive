# 15 — Coding Standards

## Filosofi
Kode yang baik adalah kode yang bisa dibaca oleh orang lain (atau diri sendiri 6 bulan ke depan) tanpa perlu bertanya. Konsistensi lebih penting dari preferensi personal.

---

## 1. PHP / Laravel

### Standard
- **PSR-12** sebagai baseline formatting
- **Laravel Pint** sebagai formatter otomatis (sudah bundled di Laravel 12)

```bash
# Format semua file PHP
./vendor/bin/pint

# Format hanya file yang berubah
./vendor/bin/pint --dirty
```

### Naming Conventions

| Konteks | Convention | Contoh |
|---------|-----------|--------|
| Class | PascalCase | `FileService`, `DriveFilePolicy` |
| Method | camelCase | `getUserFiles()`, `assertQuota()` |
| Variable | camelCase | `$uploadedFile`, `$storagePath` |
| Constant | UPPER_SNAKE | `MAX_FILE_SIZE` |
| Database table | snake_case, plural | `drive_files`, `drive_folders` |
| Model | PascalCase, singular | `DriveFile`, `DriveFolder` |
| Migration | snake_case, descriptive | `create_drive_files_table` |
| Route name | snake_case dotted | `drive.files.index`, `admin.users.quota` |
| Config key | snake_case | `drive.max_file_size` |

### Class Structure Order
```php
class FileService
{
    // 1. Constants
    const MAX_FILES_PER_UPLOAD = 10;

    // 2. Properties (typed)
    private string $disk;

    // 3. Constructor
    public function __construct(
        private StorageService $storage,
        private ActivityService $activity,
    ) {
        $this->disk = config('drive.disk', 'local');
    }

    // 4. Public methods
    public function upload(...): Collection { }
    public function download(...): StreamedResponse { }

    // 5. Private/protected methods
    private function assertQuota(...): void { }
    private function generatePath(...): string { }
}
```

### Controller Rules
- Controller **tidak mengandung business logic** — hanya memanggil service
- Selalu gunakan `Form Request` untuk validasi (tidak validasi di controller)
- Selalu kembalikan `JsonResource` atau `ResourceCollection` (tidak return array mentah)
- Max 7 method per controller (RESTful: index, show, store, update, destroy + 2 custom)

```php
// ✅ Benar
public function upload(UploadFileRequest $request): JsonResponse
{
    $files = $this->fileService->upload(
        user: $request->user(),
        files: $request->file('files'),
        folderId: $request->integer('folder_id'),
    );

    return DriveFileResource::collection($files)
        ->response()
        ->setStatusCode(201);
}

// ❌ Salah
public function upload(Request $request): JsonResponse
{
    $request->validate([...]); // Jangan di sini
    // ... logika bisnis langsung di controller
}
```

### Service Rules
- Service boleh memanggil service lain
- Service **tidak** memanggil controller
- Service mengembalikan object/collection, bukan response HTTP
- Gunakan named arguments untuk clarity

```php
// ✅ Benar — named arguments
$this->activity->log(
    user: $user,
    action: 'upload',
    subjectType: 'file',
    subjectId: $file->id,
    subjectName: $file->name,
);

// ❌ Salah — positional arguments ambigu
$this->activity->log($user, 'upload', 'file', $file->id, $file->name);
```

### Model Rules
- Selalu deklarasikan `$fillable` (tidak gunakan `$guarded = []`)
- Gunakan typed properties untuk relations
- Accessor menggunakan `Attribute::make()` (Laravel 9+ syntax)

```php
// ✅ Accessor modern
public function sizeHuman(): Attribute
{
    return Attribute::make(
        get: fn() => Number::fileSize($this->size),
    );
}
```

---

## 2. TypeScript / Next.js

### Standard
- **ESLint** + **Prettier** (config dari Next.js + eslint-config-next)
- **TypeScript strict mode** — `"strict": true` di tsconfig.json

```bash
# Lint
npm run lint

# Format
npm run format   # (tambahkan script: "prettier --write .")

# Type check
npx tsc --noEmit
```

### Naming Conventions

| Konteks | Convention | Contoh |
|---------|-----------|--------|
| Component | PascalCase | `FileCard`, `UploadZone` |
| Hook | camelCase, prefix `use` | `useDriveFiles`, `useUpload` |
| Utility function | camelCase | `formatBytes`, `getMimeIcon` |
| Type/Interface | PascalCase | `DriveFile`, `ApiResponse<T>` |
| Constant | UPPER_SNAKE | `MAX_FILE_SIZE`, `ALLOWED_MIMES` |
| File (component) | PascalCase | `FileCard.tsx`, `UploadZone.tsx` |
| File (hook) | camelCase | `useDriveFiles.ts` |
| File (utility) | camelCase | `formatBytes.ts` |
| CSS var | kebab-case | `--primary-color` |

### Component Rules
- Satu komponen per file
- Gunakan **named export** (bukan default export) untuk komponen
- Props selalu dideklarasikan sebagai interface

```tsx
// ✅ Benar
interface FileCardProps {
  file: DriveFile
  onDelete: (uuid: string) => void
  isSelected?: boolean
}

export function FileCard({ file, onDelete, isSelected = false }: FileCardProps) {
  // ...
}

// ❌ Salah
export default function FileCard(props: any) { ... }
```

### Hooks Rules
- Custom hook hanya boleh berisi logic (tidak ada JSX)
- Kembalikan objek dengan nama yang deskriptif (bukan array)

```ts
// ✅ Benar
export function useDriveFiles(folderId?: number) {
  const query = useQuery({ ... })
  return {
    files: query.data?.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ❌ Salah — array return ambigu
export function useDriveFiles() {
  return [data, isLoading, error]
}
```

### Type Rules
- Gunakan `interface` untuk object shapes
- Gunakan `type` untuk union, intersection, atau alias primitif
- Tidak gunakan `any` — gunakan `unknown` jika terpaksa, lalu type guard

```ts
// ✅ Benar
interface DriveFile { ... }
type FileAction = 'download' | 'rename' | 'delete'

// ❌ Salah
const handleAction = (action: any) => { ... }
```

---

## 3. Git Workflow

### Branch Strategy

```
main          → Production-ready code
├── develop   → Integration branch (default PR target)
│   ├── feature/drive-upload
│   ├── feature/admin-quota
│   ├── fix/trash-restore-error
│   └── chore/update-dependencies
```

### Branch Naming

| Prefix | Kegunaan | Contoh |
|--------|----------|--------|
| `feature/` | Fitur baru | `feature/file-upload` |
| `fix/` | Bug fix | `fix/quota-calculation` |
| `chore/` | Non-feature (deps, config) | `chore/docker-setup` |
| `docs/` | Update dokumentasi | `docs/api-spec` |
| `refactor/` | Refactoring | `refactor/storage-service` |

### Conventional Commits

Format: `<type>(<scope>): <description>`

```
feat(drive): add drag and drop file upload
fix(quota): correct used storage calculation including trash
chore(docker): add nginx ssl configuration
docs(api): add error code documentation
refactor(storage): extract path generation to separate method
test(file): add unit test for FileService upload
```

**Types yang valid:**
| Type | Kegunaan |
|------|----------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `docs` | Perubahan dokumentasi |
| `style` | Formatting, whitespace (bukan CSS style) |
| `refactor` | Refactor kode tanpa perubahan behavior |
| `test` | Tambah atau fix test |
| `chore` | Update deps, config, build |
| `perf` | Performance improvement |

### PR Rules
- Satu PR = satu fitur atau satu fix
- PR title mengikuti format Conventional Commits
- Wajib ada deskripsi singkat: apa yang diubah dan mengapa
- Minta review dari minimal 1 orang sebelum merge ke `develop`

---

## 4. Folder Structure Conventions

### Tidak Boleh
- Letakkan business logic di Controller
- Letakkan business logic di Component React
- Gunakan `any` di TypeScript
- Commit langsung ke `main` tanpa PR
- Hardcode credential atau secret di kode

### Wajib
- Setiap fitur baru → branch baru dari `develop`
- Setiap PR → self-review dulu sebelum minta review
- Semua file PHP diformat dengan Pint sebelum commit
- Semua file TS/TSX diformat dengan Prettier sebelum commit
- Env variable baru → tambahkan ke `.env.example`

---

## 5. Error Handling Standards

### Backend
```php
// Gunakan custom exception, bukan abort()
throw new StorageQuotaExceededException();

// Bukan:
abort(507, 'Storage full');
```

### Frontend
```ts
// Tangani error di mutation onError
const mutation = useMutation({
  mutationFn: driveApi.upload,
  onError: (error: AxiosError<ApiResponse<null>>) => {
    const message = error.response?.data?.message ?? 'Upload failed'
    toast.error(message)
  },
})
```
