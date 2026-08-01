'use client'

import { Download, Pencil, Trash2, Folder, MoreVertical, Move, Eye } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFile, DriveFolder } from '@/types/drive'
import { getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FileRowProps {
  file: DriveFile
  selected?: boolean
  onSelect?: (uuid: string) => void
  onDelete?: (uuid: string) => void
  onRename?: (file: DriveFile) => void
  onPreview?: (file: DriveFile) => void
}

export function FileRow({ file, selected, onSelect, onDelete, onRename, onPreview }: FileRowProps) {
  const { Icon, color } = getMimeIcon(file.mime_type)

  return (
    <div
      onClick={() => onSelect?.(file.uuid)}
      onDoubleClick={() => onPreview?.(file)}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-accent/60',
        selected ? 'bg-primary/8 ring-1 ring-primary/20' : ''
      )}
    >
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{file.size_human}</span>
      <span className="text-xs text-muted-foreground w-24 text-right shrink-0 hidden sm:block">{formatDate(file.updated_at)}</span>
      <div className="w-8 flex justify-end shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => e.stopPropagation()}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onPreview?.(file) }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); toast.success(`Downloading...`) }}>
              <Download className="w-4 h-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onRename?.(file) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => e.stopPropagation()}>
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
  onDelete?: (uuid: string) => void
  onRename?: (folder: DriveFolder) => void
}

export function FolderRow({ folder, onDelete, onRename }: FolderRowProps) {
  const folderColor = folder.color ?? '#64748b'
  return (
    <Link
      href={`/drive/${folder.uuid}`}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-accent/60'
      )}
    >
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
        <Folder className="w-4 h-4" style={{ color: folderColor }} />
      </div>
      <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0 hidden sm:block">—</span>
      <span className="text-xs text-muted-foreground w-24 text-right shrink-0 hidden sm:block">{formatDate(folder.created_at)}</span>
      <div className="w-8 flex justify-end shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.preventDefault(); onRename?.(folder) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
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
