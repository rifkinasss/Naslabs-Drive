'use client'

import { HardDrive, Trash2, SearchX, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyVariant = 'drive' | 'folder' | 'trash' | 'search'

interface EmptyStateProps {
  variant?: EmptyVariant
  query?: string
  className?: string
}

const config: Record<EmptyVariant, { icon: React.ElementType; title: string; desc: string; iconClass: string }> = {
  drive: {
    icon: HardDrive,
    title: 'Your drive is empty',
    desc: 'Upload files or create folders to get started. Drag & drop files anywhere on this page.',
    iconClass: 'text-primary',
  },
  folder: {
    icon: FolderOpen,
    title: 'This folder is empty',
    desc: 'Upload files or create a subfolder inside this folder.',
    iconClass: 'text-amber-400',
  },
  trash: {
    icon: Trash2,
    title: 'Trash is empty',
    desc: 'Files and folders you delete will appear here.',
    iconClass: 'text-muted-foreground',
  },
  search: {
    icon: SearchX,
    title: 'No results found',
    desc: 'Try searching with a different keyword.',
    iconClass: 'text-muted-foreground',
  },
}

export function EmptyState({ variant = 'drive', query, className }: EmptyStateProps) {
  const { icon: Icon, title, desc, iconClass } = config[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center py-24 px-8 text-center', className)}>
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-5">
        <Icon className={cn('w-10 h-10', iconClass)} />
      </div>
      <h3 className="text-base font-semibold mb-1.5">
        {variant === 'search' && query ? `No results for "${query}"` : title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
    </div>
  )
}
