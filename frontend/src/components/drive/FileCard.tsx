'use client'

import { MoreVertical, Download, Pencil, Trash2, Move, Info, Eye, Share2, History, Star } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFile } from '@/types/drive'
import { formatBytes, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { downloadFile } from '@/services/drive-api'
import { FileThumbnail } from '@/components/drive/FileThumbnail'

interface FileCardProps {
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

export function FileCard({ file, selected, onSelect, onDelete, onRename, onPreview, onMove, onShare, onVersions, onInfo, onToggleFavorite }: FileCardProps) {
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(file.uuid)
    toast.success(`"${file.name}" moved to Trash`, {
      action: { label: 'Undo', onClick: () => toast.info('Restored') },
    })
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
        'group relative flex flex-col rounded-xl border bg-card p-3.5 cursor-pointer transition-all duration-150',
        'hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        selected
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
          : 'border-border'
      )}
    >
      <FileThumbnail file={file} />

      <button
        type="button"
        aria-label={`Select ${file.name}`}
        onClick={event => { event.stopPropagation(); onSelect?.(file.uuid) }}
        className={cn(
          'absolute left-2.5 top-2.5 z-10 flex size-5 items-center justify-center rounded border bg-card/90 text-xs transition-opacity',
          selected ? 'border-primary bg-primary text-primary-foreground opacity-100' : 'border-border text-transparent opacity-0 group-hover:opacity-100'
        )}
      >
        ✓
      </button>

      {/* File info */}
      <p className="text-sm font-medium leading-tight truncate pr-5" title={file.name}>
        {file.name}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-foreground">{file.size_human || formatBytes(file.size)}</span>
        <span className="text-muted-foreground/30">•</span>
        <span className="text-xs text-muted-foreground">{formatDate(file.updated_at)}</span>
      </div>

      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => e.stopPropagation()}
            className={cn(
              'p-2 -m-1 rounded-lg transition-colors touch-manipulation',
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onToggleFavorite?.() }}><Star className={cn('w-4 h-4 mr-2', file.is_favorite && 'fill-amber-400 text-amber-400')} /> {file.is_favorite ? 'Remove favorite' : 'Add to favorites'}</DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onPreview?.(file) }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
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
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onInfo?.(file) }}>
              <Info className="w-4 h-4 mr-2" /> File info
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
