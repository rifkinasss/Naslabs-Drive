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

export interface BreadcrumbItem {
  id: number | null
  uuid: string | null
  name: string
}

export interface StorageInfo {
  storage_quota: number
  used_storage: number
  available_storage: number
  quota_percentage: number
  is_drive_enabled: boolean
}
