'use client'

import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { FolderUp, Upload, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/providers/LanguageProvider'

interface UploadMenuProps {
  fileInputRef: RefObject<HTMLInputElement | null>
  folderInputRef: RefObject<HTMLInputElement | null>
  onFilesDropped?: (files: File[]) => void
  conflict?: 'replace' | 'keep_both' | 'skip'
  onConflictChange?: (conflict: 'replace' | 'keep_both' | 'skip') => void
}

export function UploadMenu({ fileInputRef, folderInputRef, onFilesDropped, conflict = 'replace', onConflictChange }: UploadMenuProps) {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const openUpload = () => setOpen(true)
    window.addEventListener('cloud:open-upload', openUpload)
    return () => window.removeEventListener('cloud:open-upload', openUpload)
  }, [])

  const choose = (input: RefObject<HTMLInputElement | null>) => {
    input.current?.click()
    setOpen(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const files = Array.from(event.dataTransfer.files)
    if (files.length) {
      onFilesDropped?.(files)
      setOpen(false)
    }
  }

  return <>
    <Button onClick={() => setOpen(true)} className="gap-1.5" title={`${t('upload')} (U)`}><Upload className="w-4 h-4" /> {t('upload')}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-y-auto rounded-2xl p-4 sm:!max-w-3xl sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg"><UploadCloud className="w-5 h-5 text-primary" /> Upload to Cloud NL</DialogTitle>
          <DialogDescription>{t('uploadDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"><label className="text-sm font-medium">If a file already exists</label><select className="h-10 min-w-0 w-full rounded-md border border-border bg-background px-2 text-sm sm:flex-1" value={conflict} onChange={e => onConflictChange?.(e.target.value as 'replace' | 'keep_both' | 'skip')}><option value="replace">Replace and keep version history</option><option value="keep_both">Keep both files</option><option value="skip">Skip existing files</option></select></div>
        <div onDragOver={event => { event.preventDefault(); event.stopPropagation() }} onDrop={handleDrop} className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 sm:min-h-72 sm:px-6 sm:py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-20 sm:w-20 sm:rounded-3xl"><UploadCloud className="h-8 w-8 sm:h-10 sm:w-10" /></div>
          <p className="mt-4 text-base font-semibold sm:mt-5 sm:text-lg">{t('dropFilesHere')}</p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">{t('dropFilesDescription')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => choose(fileInputRef)} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent sm:gap-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="h-5 w-5 sm:h-6 sm:w-6" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{t('uploadFile')}</span><span className="mt-1 block text-xs text-muted-foreground">{t('chooseFiles')}</span></span></button>
          <button type="button" onClick={() => choose(folderInputRef)} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent sm:gap-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderUp className="h-5 w-5 sm:h-6 sm:w-6" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{t('uploadFolder')}</span><span className="mt-1 block text-xs text-muted-foreground">{t('chooseFolder')}</span></span></button>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
