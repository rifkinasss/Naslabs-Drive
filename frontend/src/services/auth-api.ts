import { apiClient } from '@/lib/api-client'
import { AuthUser, UserWithStorage } from '@/types/user'

export interface UserSession { id: number; name: string; created_at: string; last_used_at: string | null; is_current: boolean }
export interface CloudNotification { id: string; type: 'warning' | 'info'; title: string; message: string; read?: boolean }
export interface UserActivity { id: number; action: string; subject_type: string; subject_name: string; created_at: string }
export async function updateUserProfile(name: string): Promise<AuthUser> { return (await apiClient.put<{ user: AuthUser }>('/auth/profile', { name })).data.user }
export async function uploadUserAvatar(file: File): Promise<AuthUser> { const form = new FormData(); form.append('avatar', file); return (await apiClient.post<{ user: AuthUser }>('/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.user }
export async function removeUserAvatar(): Promise<AuthUser> { return (await apiClient.delete<{ user: AuthUser }>('/auth/avatar')).data.user }
export async function verifyLoginOtp(email: string, otp: string): Promise<{ token: string; user: AuthUser }> { return (await apiClient.post('/auth/verify-otp', { email, otp })).data }
export async function resendLoginOtp(email: string): Promise<void> { await apiClient.post('/auth/resend-otp', { email }) }
export async function requestPasswordReset(email: string): Promise<void> { await apiClient.post('/auth/forgot-password', { email }) }
export async function resetPassword(data: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> { await apiClient.post('/auth/reset-password', data) }
export async function updateUserPassword(data: { current_password: string; password: string; password_confirmation: string }): Promise<void> { await apiClient.put('/auth/password', data) }
export async function fetchSessions(): Promise<UserSession[]> { return (await apiClient.get<{ sessions: UserSession[] }>('/auth/sessions')).data.sessions }
export async function revokeSession(id: number): Promise<void> { await apiClient.delete(`/auth/sessions/${id}`) }
export async function logoutAllSessions(): Promise<void> { await apiClient.delete('/auth/sessions') }
export async function fetchNotifications(): Promise<CloudNotification[]> { return (await apiClient.get<{ notifications: CloudNotification[] }>('/auth/notifications')).data.notifications }
export async function markNotificationsRead(ids: string[]): Promise<void> { await apiClient.post('/auth/notifications/read', { ids }) }
export async function regenerateApiToken(): Promise<string> { return (await apiClient.post<{ token: string }>('/auth/token/regenerate')).data.token }
export async function fetchUserActivity(): Promise<UserActivity[]> { return (await apiClient.get<{ activities: UserActivity[] }>('/auth/activity')).data.activities }
export async function fetchUserGoogleDriveStatus(): Promise<boolean> { return (await apiClient.get<{ connected: boolean }>('/auth/google-drive/status')).data.connected }
export async function getUserGoogleDriveConnectUrl(): Promise<string> { return (await apiClient.get<{ url: string }>('/auth/google-drive/redirect-url')).data.url }
export async function disconnectUserGoogleDrive(): Promise<void> { await apiClient.delete('/auth/google-drive') }
export async function exportUserFileToGoogleDrive(uuid: string): Promise<{ id: string; name: string; web_url: string | null }> { return (await apiClient.post<{ file: { id: string; name: string; web_url: string | null } }>(`/auth/google-drive/files/${encodeURIComponent(uuid)}/export`)).data.file }
