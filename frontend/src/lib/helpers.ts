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
  }
  return labels[action] ?? action
}

export function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    upload:         'text-emerald-400',
    download:       'text-blue-400',
    delete:         'text-amber-400',
    restore:        'text-teal-400',
    permanent_delete: 'text-red-400',
    rename:         'text-violet-400',
    move:           'text-cyan-400',
    create_folder:  'text-yellow-400',
    empty_trash:    'text-red-400',
  }
  return colors[action] ?? 'text-slate-400'
}
