'use client'

import { useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Link2, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilePreviewModal } from '@/components/drive/FilePreviewModal'
import { DriveFile } from '@/types/drive'
import { downloadSharedFile, fetchFileShareInfo, previewSharedFile } from '@/services/drive-api'
import { formatDate } from '@/lib/helpers'
import { getApiErrorMessage } from '@/lib/api-client'

export default function SharedFilePage() {
  const { token } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const info = useQuery({ queryKey: ['file-share-info', token], queryFn: () => fetchFileShareInfo(token), enabled: !!token })
  const previewLoader = useCallback(() => previewSharedFile(token, password), [token, password])
  const download = async () => {
    try {
      const blob = await downloadSharedFile(token, password)
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = info.data?.file_name ?? 'shared-file'; anchor.click(); URL.revokeObjectURL(url)
    } catch (error: unknown) { window.alert(getApiErrorMessage(error, 'Unable to download this file')) }
  }

  if (info.isLoading) return <main className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-primary" /></main>
  if (info.isError || !info.data?.available) return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><Link2 className="mx-auto mb-3 size-10 text-muted-foreground/50" /><h1 className="text-xl font-semibold">This link is no longer available</h1><p className="mt-2 text-sm text-muted-foreground">The file share may have expired, been revoked, or is restricted to another account.</p></div></main>

  const file: DriveFile = { id: 0, uuid: token, name: info.data.file_name, mime_type: info.data.mime_type, extension: info.data.file_name.split('.').pop() ?? '', size: info.data.size, folder_id: null, created_at: info.data.created_at, updated_at: info.data.created_at, deleted_at: null }
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-6"><div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><FileText className="size-6" /></div><div className="min-w-0"><h1 className="truncate text-lg font-semibold">{info.data.file_name}</h1><p className="text-sm text-muted-foreground">Shared file · {info.data.permission === 'editor' ? 'Editor' : 'Viewer'}</p></div></div>{info.data.requires_password && <div className="mb-4 space-y-2"><label className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4" /> Password required</label><Input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter share password" /></div>}<p className="mb-5 text-xs text-muted-foreground">{info.data.visibility === 'restricted' ? 'This file is available to the authorized Cloud account.' : 'Anyone with this link can access this file.'}{info.data.expires_at && ` Expires ${formatDate(info.data.expires_at)}.`}</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={download} className="gap-2"><Download className="size-4" /> Download</Button><Button onClick={() => setPreviewOpen(true)}>Preview</Button></div></div><FilePreviewModal file={previewOpen ? file : null} allFiles={[file]} open={previewOpen} onOpenChange={setPreviewOpen} previewFileLoader={previewLoader} downloadFileLoader={() => downloadSharedFile(token, password)} previewCacheKey={`share:${token}:${password}`} showGoogleButton={false} /></main>
}
