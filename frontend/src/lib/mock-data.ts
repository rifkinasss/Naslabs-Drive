import { DriveFile, DriveFolder, BreadcrumbItem } from '@/types/drive'
import { AuthUser, ActivityLog, UserWithStorage } from '@/types/user'

// ─── Auth User ──────────────────────────────────────────────────────────────
export const mockAuthUser: AuthUser = {
  id: 1,
  name: 'Rifki Nasrulloh',
  email: 'rifki@naslabs.id',
  role: 'admin',
  created_at: '2025-01-01T00:00:00Z',
  drive: {
    storage_quota: 5368709120,      // 5 GB
    used_storage: 1879048192,       // ~1.75 GB
    available_storage: 3489660928,
    quota_percentage: 35,
    is_drive_enabled: true,
  },
}

// ─── Folders ─────────────────────────────────────────────────────────────────
export const mockFolders: DriveFolder[] = [
  { id: 1, uuid: 'f1000001-0000-0000-0000-000000000001', name: 'Dokumen Kerja', parent_id: null, color: '#3B82F6', created_at: '2026-01-15T08:00:00Z', deleted_at: null },
  { id: 2, uuid: 'f1000001-0000-0000-0000-000000000002', name: 'Foto & Media', parent_id: null, color: '#10B981', created_at: '2026-01-20T09:30:00Z', deleted_at: null },
  { id: 3, uuid: 'f1000001-0000-0000-0000-000000000003', name: 'Proyek NasLabs', parent_id: null, color: '#8B5CF6', created_at: '2026-02-01T10:00:00Z', deleted_at: null },
  { id: 4, uuid: 'f1000001-0000-0000-0000-000000000004', name: 'Invoices 2026', parent_id: 1,    color: '#F59E0B', created_at: '2026-02-10T11:00:00Z', deleted_at: null },
  { id: 5, uuid: 'f1000001-0000-0000-0000-000000000005', name: 'Meeting Notes', parent_id: 1,   color: null,      created_at: '2026-03-01T14:00:00Z', deleted_at: null },
]

// ─── Files ───────────────────────────────────────────────────────────────────
export const mockFiles: DriveFile[] = [
  { id: 1,  uuid: 'a1000001-0000-0000-0000-000000000001', name: 'Proposal_Q1_2026.pdf',  mime_type: 'application/pdf',  extension: 'pdf',  size: 2097152,  size_human: '2 MB',    folder_id: 1,    created_at: '2026-01-16T09:00:00Z', updated_at: '2026-01-16T09:00:00Z', deleted_at: null },
  { id: 2,  uuid: 'a1000001-0000-0000-0000-000000000002', name: 'Budget_2026.xlsx',       mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', size: 512000, size_human: '500 KB', folder_id: 1, created_at: '2026-01-18T10:30:00Z', updated_at: '2026-01-18T10:30:00Z', deleted_at: null },
  { id: 3,  uuid: 'a1000001-0000-0000-0000-000000000003', name: 'Team_Photo.jpg',         mime_type: 'image/jpeg',       extension: 'jpg',  size: 3145728,  size_human: '3 MB',    folder_id: 2,    created_at: '2026-01-25T15:00:00Z', updated_at: '2026-01-25T15:00:00Z', deleted_at: null },
  { id: 4,  uuid: 'a1000001-0000-0000-0000-000000000004', name: 'Logo_NasLabs_v2.png',   mime_type: 'image/png',        extension: 'png',  size: 256000,   size_human: '250 KB',  folder_id: 2,    created_at: '2026-02-01T08:00:00Z', updated_at: '2026-02-01T08:00:00Z', deleted_at: null },
  { id: 5,  uuid: 'a1000001-0000-0000-0000-000000000005', name: 'Product_Demo.mp4',       mime_type: 'video/mp4',        extension: 'mp4',  size: 52428800, size_human: '50 MB',   folder_id: 2,    created_at: '2026-02-05T12:00:00Z', updated_at: '2026-02-05T12:00:00Z', deleted_at: null },
  { id: 6,  uuid: 'a1000001-0000-0000-0000-000000000006', name: 'System_Design.pdf',      mime_type: 'application/pdf',  extension: 'pdf',  size: 1572864,  size_human: '1.5 MB',  folder_id: 3,    created_at: '2026-02-10T09:00:00Z', updated_at: '2026-02-10T09:00:00Z', deleted_at: null },
  { id: 7,  uuid: 'a1000001-0000-0000-0000-000000000007', name: 'README.md',              mime_type: 'text/markdown',    extension: 'md',   size: 8192,     size_human: '8 KB',    folder_id: 3,    created_at: '2026-02-15T11:00:00Z', updated_at: '2026-02-15T11:00:00Z', deleted_at: null },
  { id: 8,  uuid: 'a1000001-0000-0000-0000-000000000008', name: 'Invoice_INV001.pdf',     mime_type: 'application/pdf',  extension: 'pdf',  size: 409600,   size_human: '400 KB',  folder_id: 4,    created_at: '2026-02-12T10:00:00Z', updated_at: '2026-02-12T10:00:00Z', deleted_at: null },
  { id: 9,  uuid: 'a1000001-0000-0000-0000-000000000009', name: 'NasLabs_Profile.pdf',   mime_type: 'application/pdf',  extension: 'pdf',  size: 1048576,  size_human: '1 MB',    folder_id: null, created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z', deleted_at: null },
  { id: 10, uuid: 'a1000001-0000-0000-0000-000000000010', name: 'Roadmap_2026.pptx',     mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx', size: 5242880, size_human: '5 MB', folder_id: null, created_at: '2026-03-05T14:00:00Z', updated_at: '2026-03-05T14:00:00Z', deleted_at: null },
  { id: 11, uuid: 'a1000001-0000-0000-0000-000000000011', name: 'Notes.txt',              mime_type: 'text/plain',       extension: 'txt',  size: 4096,     size_human: '4 KB',    folder_id: null, created_at: '2026-03-10T09:00:00Z', updated_at: '2026-03-10T09:00:00Z', deleted_at: null },
]

// ─── Trash ───────────────────────────────────────────────────────────────────
export const mockTrashFiles: DriveFile[] = [
  { id: 12, uuid: 'trash-0001-0000-0000-000000000001', name: 'Old_Report_2025.pdf', mime_type: 'application/pdf', extension: 'pdf', size: 1048576, size_human: '1 MB', folder_id: null, created_at: '2025-12-01T09:00:00Z', updated_at: '2026-03-20T10:00:00Z', deleted_at: '2026-03-20T10:00:00Z' },
  { id: 13, uuid: 'trash-0001-0000-0000-000000000002', name: 'Draft_Proposal.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', size: 204800, size_human: '200 KB', folder_id: null, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-03-22T11:00:00Z', deleted_at: '2026-03-22T11:00:00Z' },
]

export const mockTrashFolders: DriveFolder[] = [
  { id: 6, uuid: 'trash-folder-0000-0000-000000000001', name: 'Archive 2024', parent_id: null, color: null, created_at: '2024-01-01T00:00:00Z', deleted_at: '2026-03-18T09:00:00Z' },
]

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────
export const mockBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  root: [{ id: null, uuid: null, name: 'My Drive' }],
  'f1000001-0000-0000-0000-000000000001': [
    { id: null, uuid: null, name: 'My Drive' },
    { id: 1, uuid: 'f1000001-0000-0000-0000-000000000001', name: 'Dokumen Kerja' },
  ],
  'f1000001-0000-0000-0000-000000000004': [
    { id: null, uuid: null, name: 'My Drive' },
    { id: 1, uuid: 'f1000001-0000-0000-0000-000000000001', name: 'Dokumen Kerja' },
    { id: 4, uuid: 'f1000001-0000-0000-0000-000000000004', name: 'Invoices 2026' },
  ],
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────
export const mockUsers: UserWithStorage[] = [
  { id: 1, name: 'Rifki Nasrulloh', email: 'rifki@naslabs.id',   role: 'admin', created_at: '2025-01-01T00:00:00Z', used_storage: 1879048192, storage_quota: 5368709120, quota_percentage: 35, file_count: 42 },
  { id: 2, name: 'Budi Santoso',    email: 'budi@naslabs.id',    role: 'user',  created_at: '2025-03-15T00:00:00Z', used_storage: 4294967296, storage_quota: 5368709120, quota_percentage: 80, file_count: 128 },
  { id: 3, name: 'Siti Rahayu',     email: 'siti@naslabs.id',    role: 'user',  created_at: '2025-05-20T00:00:00Z', used_storage: 524288000,  storage_quota: 5368709120, quota_percentage: 10, file_count: 15 },
  { id: 4, name: 'Ahmad Fauzi',     email: 'ahmad@naslabs.id',   role: 'user',  created_at: '2025-07-01T00:00:00Z', used_storage: 2684354560, storage_quota: 5368709120, quota_percentage: 50, file_count: 67 },
  { id: 5, name: 'Dewi Anggraeni',  email: 'dewi@naslabs.id',    role: 'user',  created_at: '2025-09-12T00:00:00Z', used_storage: 107374182,  storage_quota: 2147483648, quota_percentage: 5,  file_count: 8 },
]

// ─── Admin: Activity Logs ────────────────────────────────────────────────────
export const mockActivityLogs: ActivityLog[] = [
  { id: 1, user_id: 1, user_name: 'Rifki Nasrulloh', action: 'upload',        subject_type: 'file',   subject_name: 'NasLabs_Profile.pdf',  ip_address: '192.168.1.1', created_at: '2026-03-01T08:05:00Z' },
  { id: 2, user_id: 2, user_name: 'Budi Santoso',    action: 'download',      subject_type: 'file',   subject_name: 'Budget_2026.xlsx',      ip_address: '192.168.1.2', created_at: '2026-03-01T09:15:00Z' },
  { id: 3, user_id: 1, user_name: 'Rifki Nasrulloh', action: 'create_folder', subject_type: 'folder', subject_name: 'Proyek NasLabs',        ip_address: '192.168.1.1', created_at: '2026-02-01T10:00:00Z' },
  { id: 4, user_id: 3, user_name: 'Siti Rahayu',     action: 'delete',        subject_type: 'file',   subject_name: 'Old_Report_2025.pdf',   ip_address: '192.168.1.3', created_at: '2026-03-20T10:00:00Z' },
  { id: 5, user_id: 4, user_name: 'Ahmad Fauzi',     action: 'rename',        subject_type: 'file',   subject_name: 'System_Design_v2.pdf',  ip_address: '192.168.1.4', created_at: '2026-03-21T14:30:00Z' },
  { id: 6, user_id: 2, user_name: 'Budi Santoso',    action: 'upload',        subject_type: 'file',   subject_name: 'Product_Demo.mp4',      ip_address: '192.168.1.2', created_at: '2026-02-05T12:00:00Z' },
  { id: 7, user_id: 1, user_name: 'Rifki Nasrulloh', action: 'restore',       subject_type: 'file',   subject_name: 'Draft_Proposal.docx',   ip_address: '192.168.1.1', created_at: '2026-03-25T09:00:00Z' },
  { id: 8, user_id: 5, user_name: 'Dewi Anggraeni',  action: 'upload',        subject_type: 'file',   subject_name: 'Team_Photo.jpg',        ip_address: '192.168.1.5', created_at: '2026-01-25T15:00:00Z' },
]
