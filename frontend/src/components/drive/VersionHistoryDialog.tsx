'use client'

import { useEffect, useState } from 'react'
import { History, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DriveFile } from '@/types/drive'
import { fetchFileVersions, FileVersion, restoreFileVersion } from '@/services/drive-api'
import { formatBytes, formatDate } from '@/lib/helpers'
import { getApiErrorMessage } from '@/lib/api-client'
import { toast } from 'sonner'

export function VersionHistoryDialog({ file, open, onOpenChange, onRestored }: { file: DriveFile | null; open: boolean; onOpenChange: (open: boolean) => void; onRestored?: () => void }) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !file) return
    let active = true
    queueMicrotask(() => { if (active) setLoading(true) })
    fetchFileVersions(file.uuid).then(data => { if (active) setVersions(data) }).catch(error => toast.error(getApiErrorMessage(error, 'Unable to load versions'))).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, file])

  const restore = async (version: number) => {
    if (!file) return
    setRestoring(version)
    try {
      await restoreFileVersion(file.uuid, version)
      toast.success(`Version ${version} restored`)
      onRestored?.()
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to restore version'))
    } finally { setRestoring(null) }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Version history</DialogTitle><DialogDescription className="truncate">Previous versions of {file?.name}</DialogDescription></DialogHeader><div className="max-h-72 overflow-y-auto space-y-2 py-2">{loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : versions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No previous versions yet.</p> : versions.map(version => <div key={version.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold">v{version.version}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{version.name}</p><p className="text-xs text-muted-foreground">{formatBytes(version.size)} · {formatDate(version.created_at)}</p></div><Button size="sm" variant="outline" onClick={() => restore(version.version)} disabled={restoring !== null}>{restoring === version.version ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore</>}</Button></div>)}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
}
