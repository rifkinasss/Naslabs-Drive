import { apiClient } from '@/lib/api-client'
import { DriveFolder } from '@/types/drive'
import { UserActivity } from './auth-api'
export interface FileShare { token: string; url: string; file_name: string; expires_at: string | null; max_downloads: number | null }
export interface ManagedFileShare extends FileShare { download_count: number; available: boolean; created_at: string }
export async function createFileShare(uuid: string, data: { password?: string; expires_at?: string; max_downloads?: number }): Promise<FileShare> { return (await apiClient.post<{ share: FileShare }>(`/files/${uuid}/shares`, data)).data.share }
export async function revokeFileShare(token: string): Promise<void> { await apiClient.delete(`/shares/${token}`) }
export async function fetchFileShares(): Promise<ManagedFileShare[]> { return (await apiClient.get<{ shares: ManagedFileShare[] }>('/shares')).data.shares }
export interface FolderShare { token: string; folder_name: string; expires_at: string | null; permission: 'viewer' | 'editor' }
export async function createFolderShare(uuid: string, data: { password?: string; expires_at?: string; permission: 'viewer' | 'editor' }): Promise<FolderShare> { return (await apiClient.post<{ share: FolderShare }>(`/folders/${uuid}/shares`, data)).data.share }
export async function fetchFolderShares(): Promise<FolderShare[]> { return (await apiClient.get<{ shares: FolderShare[] }>('/folder-shares')).data.shares }
export async function revokeFolderShare(token: string): Promise<void> { await apiClient.delete(`/folder-shares/${token}`) }
export async function fetchSharedFolderActivity(): Promise<UserActivity[]> { return (await apiClient.get<{ activities: UserActivity[] }>('/folder-shares/activity')).data.activities }
export interface PublicFolderContents { folder_name: string; current_folder_uuid: string; parent_uuid: string | null; permission: 'viewer' | 'editor'; folders: Pick<DriveFolder, 'uuid' | 'name' | 'color' | 'created_at'>[]; files: { uuid: string; name: string; original_name: string; mime_type: string; size: number; created_at: string }[] }
export async function fetchPublicFolderInfo(token: string) { return (await apiClient.get<{ folder_name: string; requires_password: boolean; available: boolean; expires_at: string | null; permission: 'viewer' | 'editor' }>(`/folder-share/${token}`)).data }
export async function fetchPublicFolderContents(token: string, password?: string, folderUuid?: string): Promise<PublicFolderContents> { return (await apiClient.post<PublicFolderContents>(`/folder-share/${token}/contents`, { ...(password ? { password } : {}), ...(folderUuid ? { folder_uuid: folderUuid } : {}) })).data }
export async function downloadPublicFolderFile(token: string, uuid: string, password?: string): Promise<Blob> { return (await apiClient.get(`/folder-share/${token}/files/${uuid}/download`, { params: password ? { password } : {}, responseType: 'blob' })).data }
export async function previewPublicFolderFile(token: string, uuid: string, password?: string): Promise<Blob> { return (await apiClient.get(`/folder-share/${token}/files/${uuid}/preview`, { params: password ? { password } : {}, responseType: 'blob' })).data }
export async function uploadToPublicFolder(token: string, file: File, password?: string, folderUuid?: string): Promise<void> { const form = new FormData(); form.append('file', file); if (password) form.append('password', password); if (folderUuid) form.append('folder_uuid', folderUuid); await apiClient.post(`/folder-share/${token}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export async function createPublicFolder(token: string, name: string, password?: string, folderUuid?: string): Promise<void> { await apiClient.post(`/folder-share/${token}/folders`, { name, password, ...(folderUuid ? { folder_uuid: folderUuid } : {}) }) }
export async function renamePublicFolderFile(token: string, uuid: string, name: string, password?: string): Promise<void> { await apiClient.patch(`/folder-share/${token}/files/${uuid}`, { name, password }) }
export async function deletePublicFolderFile(token: string, uuid: string, password?: string): Promise<void> { await apiClient.delete(`/folder-share/${token}/files/${uuid}`, { data: password ? { password } : {} }) }
