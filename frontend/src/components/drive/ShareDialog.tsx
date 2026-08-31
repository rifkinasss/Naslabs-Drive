'use client'

import { useEffect, useState } from 'react'
import { Copy, Link2, Loader2, Share2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DriveFile } from '@/types/drive'
import { createFileShare, searchShareUsers, SharePermission, ShareUser, ShareVisibility } from '@/services/drive-api'
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
  const [visibility, setVisibility] = useState<ShareVisibility>('public')
  const [permission, setPermission] = useState<SharePermission>('viewer')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientOptions, setRecipientOptions] = useState<ShareUser[]>([])
  const [recipients, setRecipients] = useState<ShareUser[]>([])
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setPassword('')
    setExpiresAt('')
    setMaxDownloads('')
    setShareUrl('')
    setVisibility('public')
    setPermission('viewer')
    setRecipientQuery('')
    setRecipientOptions([])
    setRecipients([])
  }

  useEffect(() => {
    if (visibility !== 'restricted' || recipientQuery.trim().length < 2) { queueMicrotask(() => setRecipientOptions([])); return }
    const timer = window.setTimeout(() => { searchShareUsers(recipientQuery.trim()).then(setRecipientOptions).catch(() => setRecipientOptions([])) }, 250)
    return () => window.clearTimeout(timer)
  }, [recipientQuery, visibility])

  const addRecipient = (user: ShareUser) => {
    if (!recipients.some(recipient => recipient.id === user.id)) setRecipients(current => [...current, user])
    setRecipientQuery('')
    setRecipientOptions([])
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
        visibility,
        permission,
        ...(visibility === 'restricted' ? { recipients: recipients.map(recipient => recipient.id) } : {}),
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
            <p className="text-xs text-muted-foreground">{visibility === 'public' ? 'Anyone with this link can access the file.' : 'Only the selected Cloud accounts can open this file.'}</p>
            <DialogFooter><Button onClick={() => handleOpenChange(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">General access</label><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={visibility} onChange={e => setVisibility(e.target.value as ShareVisibility)}><option value="public">Anyone with the link</option><option value="restricted">Restricted — specific accounts</option></select></div>
            {visibility === 'restricted' && <div className="space-y-2"><label className="text-xs font-medium text-muted-foreground">People with access</label><div className="flex flex-wrap gap-1.5">{recipients.map(user => <span key={user.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{user.name}<button type="button" onClick={() => setRecipients(current => current.filter(item => item.id !== user.id))} aria-label={`Remove ${user.name}`}><X className="size-3" /></button></span>)}</div><div className="relative"><Input value={recipientQuery} onChange={e => setRecipientQuery(e.target.value)} placeholder="Search name or email..." />{recipientOptions.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xl">{recipientOptions.filter(user => !recipients.some(item => item.id === user.id)).map(user => <button type="button" key={user.id} onClick={() => addRecipient(user)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"><UserPlus className="size-4 text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span></button>)}</div>}</div><p className="text-[11px] text-muted-foreground">Only registered Cloud accounts can be added.</p></div>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Permission</label><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={permission} onChange={e => setPermission(e.target.value as SharePermission)}><option value="viewer">Viewer — can view and download</option><option value="editor">Editor — can edit shared content</option></select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Password <span className="font-normal">(optional)</span></label><Input type="password" placeholder="Require a password" value={password} onChange={e => setPassword(e.target.value)} minLength={4} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Expires on <span className="font-normal">(optional)</span></label><Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().slice(0, 10)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Maximum downloads <span className="font-normal">(optional)</span></label><Input type="number" min={1} placeholder="Unlimited" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} /></div>
            <DialogFooter><Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button><Button onClick={handleCreate} disabled={loading || (password.length > 0 && password.length < 4) || (visibility === 'restricted' && recipients.length === 0)}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Link2 className="w-4 h-4 mr-2" />{visibility === 'public' ? 'Create link' : 'Share'}</>}</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
