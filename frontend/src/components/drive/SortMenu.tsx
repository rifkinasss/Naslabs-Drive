'use client'

import { ArrowDownAZ, CalendarArrowDown, ChevronDown, HardDrive, Shapes } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/providers/LanguageProvider'

export type DriveSort = 'name' | 'updated_at' | 'size' | 'type'

const options = [
  { value: 'name' as const, labelKey: 'name', icon: ArrowDownAZ },
  { value: 'updated_at' as const, labelKey: 'lastModified', icon: CalendarArrowDown },
  { value: 'size' as const, labelKey: 'fileSize', icon: HardDrive },
  { value: 'type' as const, labelKey: 'type', icon: Shapes },
]

export function SortMenu({ value, onChange }: { value: DriveSort; onChange: (value: DriveSort) => void }) {
  const selected = options.find(option => option.value === value) ?? options[0]
  const SelectedIcon = selected.icon
  const { t } = useLanguage()
  return <DropdownMenu>
    <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">
      <SelectedIcon className="w-4 h-4 text-primary" /><span className="hidden sm:inline">{t('sort')}: </span>{t(selected.labelKey)}<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      {options.map(option => { const OptionIcon = option.icon; return <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)} className={value === option.value ? 'bg-accent text-accent-foreground' : ''}><OptionIcon className="w-4 h-4 mr-2" />{t(option.labelKey)}</DropdownMenuItem> })}
    </DropdownMenuContent>
  </DropdownMenu>
}
