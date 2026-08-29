export interface User {
  id: number
  name: string
  email: string
  avatar_url?: string | null
  role: 'admin' | 'manager' | 'user'
  created_at: string
}

export interface AuthUser extends User {
  drive: {
    storage_quota: number
    used_storage: number
    available_storage: number
    quota_percentage: number
    is_drive_enabled: boolean
  }
}

export interface ActivityLog {
  id: number
  user_id: number
  user_name: string
  action: string
  subject_type: 'file' | 'folder'
  subject_name: string
  ip_address: string
  created_at: string
}

export interface UserWithStorage extends User {
  email_verified_at?: string | null
  used_storage: number
  storage_quota: number
  quota_percentage: number
  file_count: number
  is_drive_enabled: boolean
}
