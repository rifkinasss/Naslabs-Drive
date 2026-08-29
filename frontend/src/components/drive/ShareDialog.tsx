'use client'

import { useState } from 'react'
import { Copy, Link2, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DriveFile } from '@/types/drive'
import { createFileShare } from '@/services/drive-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { toast } from 'sonner'

interface ShareDialogProps {
  file: DriveFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setPassword('')
    setExpiresAt('')
    setMaxDownloads('')
    setShareUrl('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleCreate = async () => {
    if (!file) return
    setLoading(true)
    try {
      const share = await createFileShare(file.uuid, {
        ...(password ? { password } : {}),
        ...(expiresAt ? { expires_at: new Date(`${expiresAt}T23:59:59`).toISOString() } : {}),
        ...(maxDownloads ? { max_downloads: Number(maxDownloads) } : {}),
      })
      setShareUrl(share.url)
      await navigator.clipboard.writeText(share.url)
      toast.success('Share link created and copied')
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to create share link'))
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Share link copied')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Share file</DialogTitle>
          <DialogDescription className="truncate">Create a secure link for {file?.name}</DialogDescription>
        </DialogHeader>
        {shareUrl ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3">
              <Link2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs break-anywhere min-w-0 flex-1">{shareUrl}</span>
              <Button size="icon-sm" variant="outline" onClick={copyLink} title="Copy link"><Copy className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Anyone with this link can access the file according to the rules you set.</p>
            <DialogFooter><Button onClick={() => handleOpenChange(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Password <span className="font-normal">(optional)</span></label><Input type="password" placeholder="Require a password" value={password} onChange={e => setPassword(e.target.value)} minLength={4} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Expires on <span className="font-normal">(optional)</span></label><Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().slice(0, 10)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Maximum downloads <span className="font-normal">(optional)</span></label><Input type="number" min={1} placeholder="Unlimited" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} /></div>
            <DialogFooter><Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button><Button onClick={handleCreate} disabled={loading || (password.length > 0 && password.length < 4)}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Link2 className="w-4 h-4 mr-2" />Create link</>}</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
