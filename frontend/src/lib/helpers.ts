import {
  FileText, Image, Video, Music, Archive, File,
  FileSpreadsheet, Presentation, Code, FileJson,
} from 'lucide-react'

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getMimeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'presentation' | 'document' | 'archive' | 'code' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.startsWith('text/')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compressed')) return 'archive'
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return 'code'
  return 'other'
}

export function getMimeIcon(mimeType: string) {
  const category = getMimeCategory(mimeType)
  const iconMap = {
    image:        { Icon: Image,             color: 'text-emerald-400' },
    video:        { Icon: Video,             color: 'text-purple-400' },
    audio:        { Icon: Music,             color: 'text-pink-400' },
    pdf:          { Icon: FileText,          color: 'text-red-400' },
    spreadsheet:  { Icon: FileSpreadsheet,   color: 'text-green-400' },
    presentation: { Icon: Presentation,    color: 'text-orange-400' },
    document:     { Icon: FileText,          color: 'text-blue-400' },
    archive:      { Icon: Archive,           color: 'text-yellow-400' },
    code:         { Icon: Code,              color: 'text-cyan-400' },
    other:        { Icon: File,              color: 'text-slate-400' },
  }
  return iconMap[category]
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    upload:         'Uploaded',
    download:       'Downloaded',
    delete:         'Moved to Trash',
    restore:        'Restored',
    permanent_delete: 'Permanently Deleted',
    rename:         'Renamed',
    move:           'Moved',
    create_folder:  'Created Folder',
    empty_trash:    'Emptied Trash',
    update_system_setting: 'Updated Setting',
    update_system_settings: 'Updated Settings',
    reset_branding_asset: 'Reset Branding',
    run_backup: 'Ran Backup',
    restore_backup: 'Restored Backup',
  }
  return labels[action] ?? action
}

export function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    upload:         'bg-emerald-100 text-emerald-700',
    download:       'bg-blue-100 text-blue-700',
    delete:         'bg-amber-100 text-amber-700',
    restore:        'bg-teal-100 text-teal-700',
    permanent_delete: 'bg-red-100 text-red-700',
    rename:         'bg-violet-100 text-violet-700',
    move:           'bg-cyan-100 text-cyan-700',
    create_folder:  'bg-yellow-100 text-yellow-700',
    empty_trash:    'bg-red-100 text-red-700',
    update_system_setting: 'bg-slate-100 text-slate-700',
    update_system_settings: 'bg-slate-100 text-slate-700',
    reset_branding_asset: 'bg-indigo-100 text-indigo-700',
    run_backup: 'bg-sky-100 text-sky-700',
    restore_backup: 'bg-orange-100 text-orange-700',
  }
  return colors[action] ?? 'bg-slate-100 text-slate-700'
}
