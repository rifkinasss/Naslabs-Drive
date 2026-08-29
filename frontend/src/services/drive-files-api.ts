import { apiClient } from '@/lib/api-client'
import { BreadcrumbItem, DriveFile, DriveFolder } from '@/types/drive'
export interface FetchDriveResponse { current_folder: DriveFolder | null; breadcrumbs: BreadcrumbItem[]; folders: DriveFolder[]; files: DriveFile[] }
export async function fetchDrive(folderUuid?: string | null): Promise<FetchDriveResponse> { return (await apiClient.get<FetchDriveResponse>('/folders', { params: folderUuid ? { folder: folderUuid } : {} })).data }
export async function fetchAllFolders(): Promise<DriveFolder[]> { return (await apiClient.get<FetchDriveResponse>('/folders', { params: { all: true } })).data.folders }
export async function createFolder(name: string, parentUuid?: string | null, color = '#3B82F6'): Promise<DriveFolder> { return (await apiClient.post<{ folder: DriveFolder }>('/folders', { name, parent_uuid: parentUuid ?? null, color })).data.folder }
export async function renameFolder(uuid: string, name: string, color?: string): Promise<DriveFolder> { return (await apiClient.patch<{ folder: DriveFolder }>(`/folders/${uuid}/rename`, { name, color })).data.folder }
export async function moveFolder(uuid: string, parentUuid: string | null): Promise<DriveFolder> { return (await apiClient.patch<{ folder: DriveFolder }>(`/folders/${uuid}/move`, { parent_uuid: parentUuid })).data.folder }
export async function deleteFolder(uuid: string): Promise<void> { await apiClient.delete(`/folders/${uuid}`) }
export async function downloadFolderZip(uuid: string): Promise<Blob> { return (await apiClient.get(`/folders/${uuid}/download-zip`, { responseType: 'blob' })).data }
export async function uploadFile(file: File, folderUuid?: string | null, onProgress?: (percentage: number) => void, conflict: 'replace' | 'keep_both' | 'skip' = 'replace', signal?: AbortSignal): Promise<DriveFile> {
  // Keep each normal request below common PHP defaults. Larger files use the
  // resumable path so a 2–3 MB file works even when the server has not yet
  // reloaded its PHP upload configuration.
  if (file.size > 1 * 1024 * 1024) return uploadFileResumable(file, folderUuid, onProgress, conflict, signal)
  const form = new FormData(); form.append('file', file); if (folderUuid) form.append('folder_uuid', folderUuid); form.append('conflict', conflict)
  return (await apiClient.post<{ file: DriveFile }>('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: event => { if (event.total) onProgress?.(Math.round(event.loaded * 100 / event.total)) }, signal })).data.file
}
async function uploadFileResumable(file: File, folderUuid?: string | null, onProgress?: (percentage: number) => void, conflict: 'replace' | 'keep_both' | 'skip' = 'replace', signal?: AbortSignal): Promise<DriveFile> {
  const chunkSize = 1 * 1024 * 1024; const totalChunks = Math.ceil(file.size / chunkSize)
  const started = await apiClient.post<{ upload_id: string }>('/files/upload/resumable/start', { name: file.name, size: file.size, total_chunks: totalChunks, conflict, ...(folderUuid ? { folder_uuid: folderUuid } : {}) }, { signal }); const uploadId = started.data.upload_id
  try { for (let index = 0; index < totalChunks; index++) { const form = new FormData(); form.append('chunk', file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize)), file.name); form.append('index', String(index)); await apiClient.post(`/files/upload/resumable/${uploadId}/chunk`, form, { headers: { 'Content-Type': 'multipart/form-data' }, signal }); onProgress?.(Math.round((index + 1) / totalChunks * 95)) }; const result = await apiClient.post<{ file: DriveFile }>(`/files/upload/resumable/${uploadId}/complete`, { conflict }, { signal }); onProgress?.(100); return result.data.file } catch (error) { if (signal?.aborted) await apiClient.delete(`/files/upload/resumable/${uploadId}`).catch(() => undefined); throw error }
}
export async function renameFile(uuid: string, name: string): Promise<DriveFile> { return (await apiClient.patch<{ file: DriveFile }>(`/files/${uuid}/rename`, { name })).data.file }
export async function updateFileTags(uuid: string, tags: string[]): Promise<DriveFile> { return (await apiClient.patch<{ file: DriveFile }>(`/files/${uuid}/tags`, { tags })).data.file }
export async function moveFile(uuid: string, parentUuid: string | null): Promise<DriveFile> { return (await apiClient.patch<{ file: DriveFile }>(`/files/${uuid}/move`, { parent_uuid: parentUuid })).data.file }
export async function deleteFile(uuid: string): Promise<void> { await apiClient.delete(`/files/${uuid}`) }
export async function downloadFile(uuid: string): Promise<Blob> { return (await apiClient.get(`/files/${uuid}/download`, { responseType: 'blob' })).data }
export async function downloadFilesZip(uuids: string[]): Promise<Blob> { return (await apiClient.post('/files/download-zip', { uuids }, { responseType: 'blob' })).data }
export async function previewFile(uuid: string): Promise<Blob> { return (await apiClient.get(`/files/${uuid}/preview`, { responseType: 'blob' })).data }
