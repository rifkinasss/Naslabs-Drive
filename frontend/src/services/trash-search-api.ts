import { apiClient } from '@/lib/api-client'
import { DriveFile, DriveFolder } from '@/types/drive'
export interface FileVersion { id: number; version: number; name: string; mime_type: string; size: number; size_human?: string; created_at: string }
export async function fetchFileVersions(uuid: string): Promise<FileVersion[]> { return (await apiClient.get<{ versions: FileVersion[] }>(`/files/${uuid}/versions`)).data.versions }
export async function restoreFileVersion(uuid: string, version: number): Promise<void> { await apiClient.post(`/files/${uuid}/versions/${version}/restore`) }
export interface FetchTrashResponse { folders: DriveFolder[]; files: DriveFile[] }
export async function fetchTrash(): Promise<FetchTrashResponse> { return (await apiClient.get<FetchTrashResponse>('/trash')).data }
export async function restoreTrashItem(type: 'folder' | 'file', uuid: string): Promise<void> { await apiClient.post(`/trash/${type}/${uuid}/restore`) }
export async function permanentDeleteTrashItem(type: 'folder' | 'file', uuid: string): Promise<void> { await apiClient.delete(`/trash/${type}/${uuid}/permanent`) }
export async function emptyTrash(): Promise<void> { await apiClient.delete('/trash/empty') }
export interface FetchSearchResponse { query: string; type: string; folders: DriveFolder[]; files: DriveFile[] }
export interface SearchOptions { favorite?: boolean; sort?: 'name' | 'updated_at' | 'size'; min_size?: number; max_size?: number; from?: string; to?: string }
export async function searchDrive(q: string, type = 'All', options: SearchOptions = {}): Promise<FetchSearchResponse> { return (await apiClient.get<FetchSearchResponse>('/search', { params: { q, type, ...options } })).data }
