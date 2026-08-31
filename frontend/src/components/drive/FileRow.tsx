'use client'

import { Download, Pencil, Trash2, Folder, MoreVertical, Move, Eye, Share2, History, Info, Star } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFile, DriveFolder } from '@/types/drive'
import { formatBytes, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { downloadFile } from '@/services/drive-api'
import { FileThumbnail } from '@/components/drive/FileThumbnail'

interface FileRowProps {
  file: DriveFile
  selected?: boolean
  onSelect?: (uuid: string) => void
  onDelete?: (uuid: string) => void
  onRename?: (file: DriveFile) => void
  onPreview?: (file: DriveFile) => void
  onMove?: (file: DriveFile) => void
  onShare?: (file: DriveFile) => void
  onVersions?: (file: DriveFile) => void
  onInfo?: (file: DriveFile) => void
  onToggleFavorite?: () => void
}

export function FileRow({ file, selected, onSelect, onDelete, onRename, onPreview, onMove, onShare, onVersions, onInfo, onToggleFavorite }: FileRowProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const blob = await downloadFile(file.uuid)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${file.name}`)
    } catch {
      toast.error(`Unable to download ${file.name}`)
    }
  }

  return (
    <div
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) onSelect?.(file.uuid)
        else onPreview?.(file)
      }}
      onDoubleClick={() => onPreview?.(file)}
      draggable
      onDragStart={event => { event.dataTransfer.setData('application/x-cloud-item', JSON.stringify({ kind: 'file', uuid: file.uuid })); event.dataTransfer.effectAllowed = 'move' }}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-accent/60',
        selected ? 'bg-primary/8 ring-1 ring-primary/20' : ''
      )}
    >
      <button type="button" aria-label={`Select ${file.name}`} onClick={event => { event.stopPropagation(); onSelect?.(file.uuid) }} className={cn('flex size-5 shrink-0 items-center justify-center rounded border bg-card text-xs transition-colors', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent hover:border-primary/60')}>
        ✓
      </button>
      <FileThumbnail file={file} variant="row" />
      <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{file.size_human || formatBytes(file.size)}</span>
      <span className="text-xs text-muted-foreground w-24 text-right shrink-0 hidden sm:block">{formatDate(file.updated_at)}</span>
      <div className="w-8 flex justify-end shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => e.stopPropagation()}
            className="p-2 -m-1 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all touch-manipulation"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onToggleFavorite?.() }}><Star className={cn('w-4 h-4 mr-2', file.is_favorite && 'fill-amber-400 text-amber-400')} /> {file.is_favorite ? 'Remove favorite' : 'Add to favorites'}</DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onPreview?.(file) }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onInfo?.(file) }}>
              <Info className="w-4 h-4 mr-2" /> File info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onShare?.(file) }}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onVersions?.(file) }}><History className="w-4 h-4 mr-2" /> Versions</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onRename?.(file) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onMove?.(file) }}>
              <Move className="w-4 h-4 mr-2" /> Move to
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete?.(file.uuid); toast.success(`"${file.name}" moved to Trash`) }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface FolderRowProps {
  folder: DriveFolder
  selected?: boolean
  onSelect?: (uuid: string) => void
  onDelete?: (uuid: string) => void
  onRename?: (folder: DriveFolder) => void
  onMove?: (folder: DriveFolder) => void
  onDropItem?: (item: { kind: 'file' | 'folder'; uuid: string }) => void
  onToggleFavorite?: () => void
  onShare?: (folder: DriveFolder) => void
  onDownload?: (folder: DriveFolder) => void
}

export function FolderRow({ folder, selected, onSelect, onDelete, onRename, onMove, onDropItem, onToggleFavorite, onShare, onDownload }: FolderRowProps) {
  const folderColor = folder.color ?? '#3B82F6'
  return (
    <Link
      href={`/drive/${folder.uuid}`}
      draggable
      onDragStart={event => { event.dataTransfer.setData('application/x-cloud-item', JSON.stringify({ kind: 'folder', uuid: folder.uuid })); event.dataTransfer.effectAllowed = 'move' }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); try { const item = JSON.parse(event.dataTransfer.getData('application/x-cloud-item')) as { kind: 'file' | 'folder'; uuid: string }; if (item.uuid !== folder.uuid) onDropItem?.(item) } catch { /* Ignore unsupported drops. */ } }}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-accent/60'
      )}
    >
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
        <Folder className="w-4 h-4" style={{ color: folderColor }} />
      </div>
      <button type="button" aria-label={`Select ${folder.name}`} onClick={event => { event.preventDefault(); event.stopPropagation(); onSelect?.(folder.uuid) }} className={cn('flex size-5 shrink-0 items-center justify-center rounded border bg-card text-xs transition-colors', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent hover:border-primary/60')}>
        ✓
      </button>
      <span className="flex-1 text-sm font-medium truncate">{folder.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{folder.files_count ?? 0} files · {formatBytes(folder.files_sum_size ?? 0)}</span></span>
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0 hidden sm:block">—</span>
      <span className="text-xs text-muted-foreground w-24 text-right shrink-0 hidden sm:block">{formatDate(folder.created_at)}</span>
      <div className="w-8 flex justify-end shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
            className="p-2 -m-1 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all touch-manipulation"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.() }}><Star className={cn('w-4 h-4 mr-2', folder.is_favorite && 'fill-amber-400 text-amber-400')} /> {folder.is_favorite ? 'Remove favorite' : 'Add to favorites'}</DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onShare?.(folder) }}><Share2 className="w-4 h-4 mr-2" /> Share folder</DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onDownload?.(folder) }}><Download className="w-4 h-4 mr-2" /> Download ZIP</DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.preventDefault(); onRename?.(folder) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onMove?.(folder) }}>
              <Move className="w-4 h-4 mr-2" /> Move to
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={e => { e.preventDefault(); onDelete?.(folder.uuid); toast.success(`"${folder.name}" moved to Trash`) }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  )
}
