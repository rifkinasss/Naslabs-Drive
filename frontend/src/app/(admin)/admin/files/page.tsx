'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Search, Trash2, Loader2, HardDrive, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchAdminFiles, deleteAdminFile } from '@/services/drive-api'
import { formatBytes } from '@/lib/helpers'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ui/error-state'

export default function AdminFilesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'created_at' | 'name' | 'size'>('created_at')
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin-files', search, page, sort], queryFn: () => fetchAdminFiles({ search: search || undefined, page, sort }) })
  const remove = useMutation({ mutationFn: deleteAdminFile, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-files'] }); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('File deleted') }, onError: () => toast.error('Unable to delete file') })

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><FileText className="size-5 text-muted-foreground" /><div><h1 className="text-base font-semibold">Global Files</h1><p className="text-xs text-muted-foreground">Manage files across all users</p></div></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search files..." className="pl-9" /></div><select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1) }} className="h-8 rounded-lg border border-input bg-background px-3 text-sm"><option value="created_at">Newest</option><option value="name">Name</option><option value="size">Largest</option></select></div>
      </div>
      <div className="flex-1 overflow-auto p-5 sm:p-6">
        {query.isLoading ? <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> Loading files...</div> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.files.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">No files found.</div> : <><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[minmax(0,1fr)_180px_120px_80px] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid"><span>File</span><span>Owner</span><span>Size</span><span /></div>{query.data?.files.map(file => <div key={file.uuid} className="grid gap-3 border-b border-border/70 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_180px_120px_80px] md:items-center md:gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{file.mime_type} · {new Date(file.created_at).toLocaleDateString()}</p></div><div className="min-w-0"><p className="truncate text-sm">{file.user.name}</p><p className="truncate text-xs text-muted-foreground">{file.user.email}</p></div><span className="flex items-center gap-1 text-xs text-muted-foreground"><HardDrive className="size-3.5" />{formatBytes(file.size)}</span><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { if (window.confirm(`Delete ${file.name}?`)) remove.mutate(file.uuid) }} disabled={remove.isPending}><Trash2 className="size-4" /></Button></div>)}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{query.data!.meta.total} files · Page {query.data!.meta.current_page} of {query.data!.meta.last_page}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="mr-1 size-4" />Previous</Button><Button variant="outline" size="sm" disabled={page >= query.data!.meta.last_page} onClick={() => setPage(value => value + 1)}>Next<ChevronRight className="ml-1 size-4" /></Button></div></div></>}
      </div>
    </div>
  )
}
