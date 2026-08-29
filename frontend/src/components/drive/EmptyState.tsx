'use client'

import { HardDrive, Trash2, SearchX, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useLanguage } from '@/providers/LanguageProvider'

type EmptyVariant = 'drive' | 'folder' | 'trash' | 'search'

interface EmptyStateProps {
  variant?: EmptyVariant
  query?: string
  className?: string
}

const config: Record<EmptyVariant, { icon: React.ElementType; titleKey: string; descKey: string; iconClass: string }> = {
  drive: {
    icon: HardDrive,
    titleKey: 'driveEmpty',
    descKey: 'driveEmptyDescription',
    iconClass: 'text-primary',
  },
  folder: {
    icon: FolderOpen,
    titleKey: 'folderEmpty',
    descKey: 'folderEmptyDescription',
    iconClass: 'text-amber-400',
  },
  trash: {
    icon: Trash2,
    titleKey: 'trashEmpty',
    descKey: 'trashEmptyDescription',
    iconClass: 'text-muted-foreground',
  },
  search: {
    icon: SearchX,
    titleKey: 'noResults',
    descKey: 'searchDifferent',
    iconClass: 'text-muted-foreground',
  },
}

export function EmptyState({ variant = 'drive', query, className }: EmptyStateProps) {
  const { icon: Icon, titleKey, descKey, iconClass } = config[variant]
  const { t } = useLanguage()

  return (
    <Empty className={cn('py-24 px-8', className)}>
      <EmptyHeader>
      <EmptyMedia variant="icon" className="size-20 rounded-2xl bg-secondary text-primary [&_svg:not([class*='size-'])]:size-10">
        <Icon className={cn('w-10 h-10', iconClass)} />
      </EmptyMedia>
      <EmptyTitle className="text-base">
        {variant === 'search' && query ? `${t('noResultsFor')} "${query}"` : t(titleKey)}
      </EmptyTitle>
      <EmptyDescription className="max-w-xs">{t(descKey)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
