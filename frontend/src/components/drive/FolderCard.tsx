'use client'

import Link from 'next/link'
import { MoreVertical, Pencil, Trash2, Folder } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFolder } from '@/types/drive'
import { formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FolderCardProps {
  folder: DriveFolder
  onDelete?: (uuid: string) => void
  onRename?: (folder: DriveFolder) => void
}

export function FolderCard({ folder, onDelete, onRename }: FolderCardProps) {
  const folderColor = folder.color ?? '#64748b'

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(folder.uuid)
    toast.success(`"${folder.name}" moved to Trash`)
  }

  return (
    <Link
      href={`/drive/${folder.uuid}`}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-3.5 cursor-pointer transition-all duration-150',
        'hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        'border-border'
      )}
    >
      {/* Folder icon */}
      <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-secondary/80 group-hover:bg-secondary relative">
        <Folder className="w-6 h-6" style={{ color: folderColor }} />
        {folder.color && (
          <div
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: folderColor }}
          />
        )}
      </div>

      {/* Folder name */}
      <p className="text-sm font-medium leading-tight truncate pr-5" title={folder.name}>
        {folder.name}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{formatDate(folder.created_at)}</p>

      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
            className={cn(
              'p-1 rounded-md transition-colors',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.preventDefault(); onRename?.(folder) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
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
