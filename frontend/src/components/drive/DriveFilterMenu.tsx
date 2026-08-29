'use client'

import { Check, ChevronDown, File, Filter, Folder, Image, Star, Video } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/providers/LanguageProvider'

export type DriveFilter = 'all' | 'favorites' | 'folders' | 'files' | 'images' | 'documents' | 'videos'

export function DriveFilterMenu({ value, onChange }: { value: DriveFilter; onChange: (value: DriveFilter) => void }) {
  const { t } = useLanguage()
  const options = [
    { value: 'all' as const, labelKey: 'allItems', icon: Filter },
    { value: 'favorites' as const, labelKey: 'favoritesOnly', icon: Star },
    { value: 'folders' as const, labelKey: 'foldersOnly', icon: Folder },
    { value: 'files' as const, labelKey: 'filesOnly', icon: File },
    { value: 'images' as const, labelKey: 'images', icon: Image },
    { value: 'documents' as const, labelKey: 'documents', icon: File },
    { value: 'videos' as const, labelKey: 'videos', icon: Video },
  ]
  const selected = options.find(option => option.value === value) ?? options[0]
  const SelectedIcon = selected.icon
  return <DropdownMenu>
    <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
      <SelectedIcon className="size-4 text-primary" /><span className="hidden sm:inline">{t('filter')}:</span>{t(selected.labelKey)}<ChevronDown className="size-3.5 text-muted-foreground" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      {options.map(option => { const OptionIcon = option.icon; return <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)} className={value === option.value ? 'bg-accent text-accent-foreground' : ''}><Check className={`mr-2 size-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} /><OptionIcon className="mr-2 size-4 text-primary" />{t(option.labelKey)}</DropdownMenuItem> })}
    </DropdownMenuContent>
  </DropdownMenu>
}
