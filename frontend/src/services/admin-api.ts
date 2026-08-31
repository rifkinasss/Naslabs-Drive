import { apiClient } from '@/lib/api-client'
import { ActivityLog, UserWithStorage } from '@/types/user'
export async function fetchAdminUsers(): Promise<UserWithStorage[]> { return (await apiClient.get<{ users: UserWithStorage[] }>('/admin/users')).data.users }
export async function createAdminUser(data: { name: string; email: string; password: string; role: 'admin' | 'manager' | 'user'; storage_quota: number }): Promise<void> { await apiClient.post('/admin/users', data) }
export async function updateAdminUser(userId: number, data: { name: string; email: string; password?: string; role: 'admin' | 'manager' | 'user'; storage_quota: number; is_drive_enabled: boolean }): Promise<void> { await apiClient.put(`/admin/users/${userId}`, data) }
export async function updateAdminUserQuota(userId: number, quotaBytes: number): Promise<void> { await apiClient.patch(`/admin/users/${userId}/quota`, { storage_quota: quotaBytes }) }
export async function deleteAdminUser(userId: number): Promise<void> { await apiClient.delete(`/admin/users/${userId}`) }
export async function resendAdminUserVerification(userId: number): Promise<void> { await apiClient.post(`/admin/users/${userId}/resend-verification`) }
export async function verifyAdminUserEmail(userId: number): Promise<void> { await apiClient.post(`/admin/users/${userId}/verify-email`) }
export async function revokeAdminUserSessions(userId: number): Promise<void> { await apiClient.post(`/admin/users/${userId}/revoke-sessions`) }
export async function uploadAdminUserAvatar(userId: number, file: File): Promise<void> { const data = new FormData(); data.append('avatar', file); await apiClient.post(`/admin/users/${userId}/avatar`, data, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export async function removeAdminUserAvatar(userId: number): Promise<void> { await apiClient.delete(`/admin/users/${userId}/avatar`) }
export interface AdminLogFilters { user_id?: number; action?: string; search?: string; from?: string; to?: string }
export async function fetchAdminLogs(filters: AdminLogFilters = {}): Promise<ActivityLog[]> { return (await apiClient.get<{ logs: ActivityLog[] }>('/admin/logs', { params: filters })).data.logs }
export async function exportAdminLogs(filters: AdminLogFilters = {}): Promise<Blob> { return (await apiClient.get('/admin/logs/export', { params: filters, responseType: 'blob' })).data }
export interface AdminSystemHealth { status: 'healthy' | 'warning' | 'down'; checked_at: string; checks: { database: { status: 'healthy' | 'down'; message: string }; storage: { status: 'healthy' | 'down'; message: string; disk: string; free_bytes: number | null }; quota: { status: 'healthy' | 'warning'; message: string; at_risk_users: number }; queue: { status: 'healthy' | 'warning' | 'down'; message: string; pending: number | null }; backup: { status: 'healthy' | 'warning' | 'down'; message: string; latest: string | null }; antivirus: { status: 'healthy' | 'warning' | 'down'; message: string; enabled: boolean; clean: number; unavailable: number }; api: { status: 'healthy' | 'warning' | 'down'; message: string; requests: number; errors: number; error_rate: number; average_latency_ms: number } } }
export async function fetchAdminSystemHealth(): Promise<AdminSystemHealth> { return (await apiClient.get<AdminSystemHealth>('/admin/system/health')).data }
export interface AdminLatencyPoint { hour: string; upload: { requests: number; errors: number; latency_ms: number }; download: { requests: number; errors: number; latency_ms: number }; preview: { requests: number; errors: number; latency_ms: number }; api: { requests: number; errors: number; latency_ms: number } }
export interface AdminLatencyMetrics { period_hours: number; points: AdminLatencyPoint[] }
export async function fetchAdminLatency(): Promise<AdminLatencyMetrics> { return (await apiClient.get<AdminLatencyMetrics>('/admin/system/latency')).data }
export interface AdminBackup { name: string; files: number; bytes: number }
export async function fetchAdminBackups(): Promise<AdminBackup[]> { return (await apiClient.get<{ backups: AdminBackup[] }>('/admin/backups')).data.backups }
export async function runAdminBackup(): Promise<void> { await apiClient.post('/admin/backups/run') }
export async function restoreAdminBackup(name: string): Promise<void> { await apiClient.post(`/admin/backups/${encodeURIComponent(name)}/restore`) }
export async function deleteAdminBackup(name: string): Promise<void> { await apiClient.delete(`/admin/backups/${encodeURIComponent(name)}`) }
export interface AdminBackupPreview { name: string; created_at: string | null; users: number; folders: number; files: number; storage_files: number; storage_bytes: number; database: string }
export async function fetchAdminBackupPreview(name: string): Promise<AdminBackupPreview> { return (await apiClient.get<AdminBackupPreview>(`/admin/backups/${encodeURIComponent(name)}/preview`)).data }
export interface AdminSystemSettings { app_name: string; max_upload_mb: string; share_expiry_days: string; allowed_extensions: string; default_quota_gb: string; quota_alert_percent: string; share_require_password: string; share_max_downloads: string; trash_retention_days: string; notify_on_share: string; notify_on_upload_failure: string; maintenance_mode: string; maintenance_message: string; google_oauth_enabled: string; google_drive_enabled: string; google_client_id: string; google_client_secret?: string; google_client_secret_configured?: boolean; google_drive_connected?: boolean; google_login_redirect_uri: string; google_drive_redirect_uri: string }
export async function fetchAdminSettings(): Promise<AdminSystemSettings> { return (await apiClient.get<{ settings: AdminSystemSettings }>('/admin/system/settings')).data.settings }
export async function updateAdminSettings(settings: AdminSystemSettings): Promise<AdminSystemSettings> { return (await apiClient.put<{ settings: AdminSystemSettings }>('/admin/system/settings', settings)).data.settings }
export interface AdminAnalytics { period_days: number; new_users: number; uploads: number; downloads: number; events: number; by_type: { type: string; count: number; bytes: number }[]; activity_by_day: { date: string; events: number }[] }
export async function fetchAdminAnalytics(): Promise<AdminAnalytics> { return (await apiClient.get<AdminAnalytics>('/admin/system/analytics')).data }
export interface AdminStorageOverview { largest_files: { uuid: string; name: string; size: number; mime_type: string; user: string; storage_exists: boolean }[]; orphaned_records: number; orphaned_files: { uuid: string; name: string; size: number; user: string | null }[]; by_user: { id: number; name: string; email: string; used_storage: number; storage_quota: number; quota_percentage: number }[]; total_used_storage: number; total_allocated_storage: number }
export async function fetchAdminStorageOverview(): Promise<AdminStorageOverview> { return (await apiClient.get<AdminStorageOverview>('/admin/system/storage')).data }
export async function cleanupAdminStorage(): Promise<{ removed: number; bytes_reclaimed: number }> { return (await apiClient.post<{ removed: number; bytes_reclaimed: number }>('/admin/system/storage/cleanup', { confirm: true })).data }
export interface AdminFile { uuid: string; name: string; size: number; mime_type: string; created_at: string; deleted_at: string | null; storage_exists: boolean; user: { id: number | null; name: string; email?: string | null } }
export interface AdminFilePage { files: AdminFile[]; meta: { current_page: number; last_page: number; total: number; per_page: number } }
export async function fetchAdminFiles(params: { search?: string; user_id?: number; include_trashed?: boolean; sort?: 'name' | 'size' | 'created_at'; page?: number } = {}): Promise<AdminFilePage> { return (await apiClient.get<AdminFilePage>('/admin/files', { params })).data }
export async function deleteAdminFile(uuid: string): Promise<void> { await apiClient.delete(`/admin/files/${uuid}`) }
export interface Branding { app_name: string; logo_url: string | null; favicon_url: string | null; pwa_icon_url: string | null }
export type BrandingAsset = 'logo' | 'favicon' | 'pwa_icon'
export async function fetchBranding(): Promise<Branding> { return (await apiClient.get<Branding>('/system/branding')).data }
export async function uploadBrandingAsset(asset: BrandingAsset, file: File): Promise<Branding> { const form = new FormData(); form.append('file', file); return (await apiClient.post<{ branding: Branding }>(`/admin/system/branding/${asset}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.branding }
export async function removeBrandingAsset(asset: BrandingAsset): Promise<Branding> { return (await apiClient.delete<{ branding: Branding }>(`/admin/system/branding/${asset}`)).data.branding }
export async function getGoogleDriveConnectUrl(): Promise<string> { return (await apiClient.get<{ url: string }>('/admin/google/drive/redirect-url')).data.url }
export async function disconnectGoogleDrive(): Promise<void> { await apiClient.delete('/admin/google/drive') }
export interface GoogleDriveFile { id: string; name: string; mime_type: string; size: number; modified_at: string | null; web_url: string | null }
export async function fetchGoogleDriveFiles(): Promise<GoogleDriveFile[]> { return (await apiClient.get<{ files: GoogleDriveFile[] }>('/admin/google/drive/files')).data.files }
export async function importGoogleDriveFile(id: string): Promise<import('@/types/drive').DriveFile> { return (await apiClient.post<{ file: import('@/types/drive').DriveFile }>(`/admin/google/drive/files/${encodeURIComponent(id)}/import`)).data.file }
export async function exportFileToGoogleDrive(uuid: string): Promise<{ id: string; name: string; web_url: string | null }> { return (await apiClient.post<{ file: { id: string; name: string; web_url: string | null } }>(`/admin/google/drive/files/${encodeURIComponent(uuid)}/export`)).data.file }
