'use client'

import { useEffect, useState } from 'react'
import { FileText, CalendarDays, HardDrive, Braces } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DriveFile } from '@/types/drive'
import { formatBytes, formatDate } from '@/lib/helpers'
import { updateFileTags } from '@/services/drive-api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function FileInfoDialog({ file, open, onOpenChange }: { file: DriveFile | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tags, setTags] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  useEffect(() => { setTags(file?.tags?.join(', ') ?? '') }, [file])
  if (!file) return null
  const details = [
    { label: 'File size', value: `${file.size_human || formatBytes(file.size)} (${formatBytes(file.size)})`, icon: HardDrive },
    { label: 'File type', value: file.mime_type || 'Unknown', icon: Braces },
    { label: 'Created', value: formatDate(file.created_at), icon: CalendarDays },
    { label: 'Last modified', value: formatDate(file.updated_at), icon: CalendarDays },
  ]
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-6"><FileText className="w-5 h-5 text-primary" /> File information</DialogTitle>
        <DialogDescription className="truncate" title={file.name}>{file.name}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 pt-2">
        {details.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3.5 py-3"><Icon className="w-4 h-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-sm font-medium break-words">{value}</p></div></div>)}
      </div>
      <div className="space-y-2 pt-2"><label className="text-xs font-medium text-muted-foreground">Tags</label><div className="flex gap-2"><Input value={tags} onChange={event => setTags(event.target.value)} placeholder="work, important, personal" /><Button size="sm" disabled={savingTags} onClick={async () => { setSavingTags(true); try { await updateFileTags(file.uuid, tags.split(',').map(tag => tag.trim()).filter(Boolean)); toast.success('Tags updated'); onOpenChange(false) } catch { toast.error('Unable to update tags') } finally { setSavingTags(false) } }}>Save</Button></div><p className="text-[11px] text-muted-foreground">Separate labels with commas.</p></div>
    </DialogContent>
  </Dialog>
}
