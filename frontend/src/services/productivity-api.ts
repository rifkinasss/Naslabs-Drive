import { apiClient } from '@/lib/api-client'
import { DriveFile, DriveFolder } from '@/types/drive'
export interface DriveInsights { favorites: { files: DriveFile[]; folders: DriveFolder[] }; recent: { files: DriveFile[]; folders: DriveFolder[] }; analytics: { total_files: number; total_folders: number; largest_files: DriveFile[]; by_type: { type: string; count: number; size: number }[]; duplicates: { checksum: string; files: { uuid: string; name: string; size: number }[] }[] } }
export async function fetchDriveInsights(): Promise<DriveInsights> { return (await apiClient.get<DriveInsights>('/productivity/insights')).data }
export async function deleteDuplicateFile(uuid: string): Promise<void> { await apiClient.delete(`/files/${uuid}`) }
export async function toggleFavorite(type: 'file' | 'folder', uuid: string): Promise<boolean> { return (await apiClient.patch<{ is_favorite: boolean }>(`/productivity/${type}/${uuid}/favorite`)).data.is_favorite }
