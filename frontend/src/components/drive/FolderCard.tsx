'use client'

import Link from 'next/link'
import { MoreVertical, Pencil, Trash2, Folder, Move, Star, Share2, Download } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFolder } from '@/types/drive'
import { formatBytes, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FolderCardProps {
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

export function FolderCard({ folder, selected, onSelect, onDelete, onRename, onMove, onDropItem, onToggleFavorite, onShare, onDownload }: FolderCardProps) {
  const folderColor = folder.color ?? '#3B82F6'

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(folder.uuid)
    toast.success(`"${folder.name}" moved to Trash`)
  }

  return (
    <Link
      href={`/drive/${folder.uuid}`}
      draggable
      onDragStart={event => { event.dataTransfer.setData('application/x-cloud-item', JSON.stringify({ kind: 'folder', uuid: folder.uuid })); event.dataTransfer.effectAllowed = 'move' }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); try { const item = JSON.parse(event.dataTransfer.getData('application/x-cloud-item')) as { kind: 'file' | 'folder'; uuid: string }; if (item.uuid !== folder.uuid) onDropItem?.(item) } catch { /* Ignore unsupported drops. */ } }}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-3.5 cursor-pointer transition-all duration-150',
        'hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        'border-border'
      )}
    >
      {/* Folder thumbnail */}
      <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary/80 transition-colors group-hover:bg-secondary">
        <div className="flex size-full items-center justify-center">
          <Folder className="size-20 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" style={{ color: folderColor }} strokeWidth={1.5} />
        </div>
        {folderColor && (
          <div
            className="absolute bottom-3 right-3 size-3 rounded-full ring-4 ring-secondary/60 transition-transform group-hover:scale-110"
            style={{ backgroundColor: folderColor }}
          />
        )}
      </div>

      <button type="button" aria-label={`Select ${folder.name}`} onClick={event => { event.preventDefault(); event.stopPropagation(); onSelect?.(folder.uuid) }} className={cn('absolute left-2.5 top-2.5 z-10 flex size-5 items-center justify-center rounded border bg-card/90 text-xs transition-opacity', selected ? 'border-primary bg-primary text-primary-foreground opacity-100' : 'border-border text-transparent opacity-0 group-hover:opacity-100')}>
        ✓
      </button>

      {/* Folder name */}
      <p className="text-sm font-medium leading-tight truncate pr-5" title={folder.name}>
        {folder.name}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{folder.files_count ?? 0} files · {formatBytes(folder.files_sum_size ?? 0)}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{formatDate(folder.created_at)}</p>

      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
            className={cn(
              'p-2 -m-1 rounded-lg transition-colors touch-manipulation',
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
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
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  )
}
