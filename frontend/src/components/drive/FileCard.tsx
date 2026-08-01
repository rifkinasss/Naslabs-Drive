'use client'

import { useState } from 'react'
import { MoreVertical, Download, Pencil, Trash2, Move, Info, Eye } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriveFile } from '@/types/drive'
import { getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FileCardProps {
  file: DriveFile
  selected?: boolean
  onSelect?: (uuid: string) => void
  onDelete?: (uuid: string) => void
  onRename?: (file: DriveFile) => void
  onPreview?: (file: DriveFile) => void
}

export function FileCard({ file, selected, onSelect, onDelete, onRename, onPreview }: FileCardProps) {
  const { Icon, color } = getMimeIcon(file.mime_type)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    toast.success(`Downloading ${file.name}...`)
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
      onClick={() => onSelect?.(file.uuid)}
      onDoubleClick={() => onPreview?.(file)}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-3.5 cursor-pointer transition-all duration-150',
        'hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        selected
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
          : 'border-border'
      )}
    >
      {/* File icon */}
      <div className={cn(
        'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
        'bg-secondary/80 group-hover:bg-secondary'
      )}>
        <Icon className={cn('w-6 h-6', color)} />
      </div>

      {/* File info */}
      <p className="text-sm font-medium leading-tight truncate pr-5" title={file.name}>
        {file.name}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-xs text-muted-foreground">{file.size_human}</span>
        <span className="text-muted-foreground/30">•</span>
        <span className="text-xs text-muted-foreground">{formatDate(file.updated_at)}</span>
      </div>

      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={e => e.stopPropagation()}
            className={cn(
              'p-1 rounded-md transition-colors',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onPreview?.(file) }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onRename?.(file) }}>
              <Pencil className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => e.stopPropagation()}>
              <Move className="w-4 h-4 mr-2" /> Move to
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => e.stopPropagation()}>
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
