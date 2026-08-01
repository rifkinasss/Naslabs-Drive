import { apiClient } from '@/lib/api-client'
import { DriveFile, DriveFolder, BreadcrumbItem } from '@/types/drive'
import { AuthUser, ActivityLog, UserWithStorage } from '@/types/user'

// ─── Auth / Profile ─────────────────────────────────────────────────────────
export async function updateUserProfile(name: string): Promise<AuthUser> {
  const res = await apiClient.put<{ message: string; user: AuthUser }>('/auth/profile', { name })
  return res.data.user
}

export async function updateUserPassword(data: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
  await apiClient.put('/auth/password', data)
}

// ─── Drive / Folders / Files ──────────────────────────────────────────────────
export interface FetchDriveResponse {
  current_folder: DriveFolder | null
  breadcrumbs: BreadcrumbItem[]
  folders: DriveFolder[]
  files: DriveFile[]
}

export async function fetchDrive(folderUuid?: string | null): Promise<FetchDriveResponse> {
  const params = folderUuid ? { folder: folderUuid } : {}
  const res = await apiClient.get<FetchDriveResponse>('/folders', { params })
  return res.data
}

export async function createFolder(name: string, parentUuid?: string | null): Promise<DriveFolder> {
  const res = await apiClient.post<{ message: string; folder: DriveFolder }>('/folders', {
    name,
    parent_uuid: parentUuid ?? null,
  })
  return res.data.folder
}

export async function renameFolder(uuid: string, name: string): Promise<DriveFolder> {
  const res = await apiClient.patch<{ message: string; folder: DriveFolder }>(`/folders/${uuid}/rename`, { name })
  return res.data.folder
}

export async function deleteFolder(uuid: string): Promise<void> {
  await apiClient.delete(`/folders/${uuid}`)
}

export async function uploadFile(
  file: File,
  folderUuid?: string | null,
  onProgress?: (percentage: number) => void
): Promise<DriveFile> {
  const formData = new FormData()
  formData.append('file', file)
  if (folderUuid) formData.append('folder_uuid', folderUuid)

  const res = await apiClient.post<{ message: string; file: DriveFile }>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress?.(percent)
      }
    },
  })
  return res.data.file
}

export async function renameFile(uuid: string, name: string): Promise<DriveFile> {
  const res = await apiClient.patch<{ message: string; file: DriveFile }>(`/files/${uuid}/rename`, { name })
  return res.data.file
}

export async function deleteFile(uuid: string): Promise<void> {
  await apiClient.delete(`/files/${uuid}`)
}

export function getFileDownloadUrl(uuid: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('drive_token') : ''
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  return `${baseUrl}/files/${uuid}/download?token=${token}`
}

export function getFilePreviewUrl(uuid: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('drive_token') : ''
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  return `${baseUrl}/files/${uuid}/preview?token=${token}`
}

// ─── Trash ───────────────────────────────────────────────────────────────────
export interface FetchTrashResponse {
  folders: DriveFolder[]
  files: DriveFile[]
}

export async function fetchTrash(): Promise<FetchTrashResponse> {
  const res = await apiClient.get<FetchTrashResponse>('/trash')
  return res.data
}

export async function restoreTrashItem(type: 'folder' | 'file', uuid: string): Promise<void> {
  await apiClient.post(`/trash/${type}/${uuid}/restore`)
}

export async function permanentDeleteTrashItem(type: 'folder' | 'file', uuid: string): Promise<void> {
  await apiClient.delete(`/trash/${type}/${uuid}/permanent`)
}

export async function emptyTrash(): Promise<void> {
  await apiClient.delete('/trash/empty')
}

// ─── Search ──────────────────────────────────────────────────────────────────
export interface FetchSearchResponse {
  query: string
  type: string
  folders: DriveFolder[]
  files: DriveFile[]
}

export async function searchDrive(q: string, type: string = 'All'): Promise<FetchSearchResponse> {
  const res = await apiClient.get<FetchSearchResponse>('/search', { params: { q, type } })
  return res.data
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export async function fetchAdminUsers(): Promise<UserWithStorage[]> {
  const res = await apiClient.get<{ users: UserWithStorage[] }>('/admin/users')
  return res.data.users
}

export async function createAdminUser(data: {
  name: string
  email: string
  password: string
  role: 'admin' | 'user'
  storage_quota: number
}): Promise<void> {
  await apiClient.post('/admin/users', data)
}

export async function updateAdminUser(userId: number, data: {
  name: string
  email: string
  password?: string
  role: 'admin' | 'user'
  storage_quota: number
  is_drive_enabled: boolean
}): Promise<void> {
  await apiClient.put(`/admin/users/${userId}`, data)
}

export async function updateAdminUserQuota(userId: number, quotaBytes: number): Promise<void> {
  await apiClient.patch(`/admin/users/${userId}/quota`, { storage_quota: quotaBytes })
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`)
}

export async function fetchAdminLogs(): Promise<ActivityLog[]> {
  const res = await apiClient.get<{ logs: ActivityLog[] }>('/admin/logs')
  return res.data.logs
}
