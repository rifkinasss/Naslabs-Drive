'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileText, HardDrive, Loader2, Trash2 } from 'lucide-react'
import { fetchDriveInsights, deleteDuplicateFile } from '@/services/drive-api'
import { formatBytes } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function StorageCleanupPage() {
  const client = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['drive-insights'], queryFn: fetchDriveInsights })
  const remove = async (uuid: string) => { if (!window.confirm('Move this duplicate file to Trash?')) return; try { await deleteDuplicateFile(uuid); await client.invalidateQueries({ queryKey: ['drive-insights'] }); toast.success('Duplicate moved to Trash') } catch { toast.error('Unable to remove duplicate') } }
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  const groups = data?.analytics.duplicates ?? []
  const recoverable = groups.reduce((sum, group) => sum + group.files.slice(1).reduce((n, file) => n + file.size, 0), 0)
  return <div className="flex-1 overflow-y-auto"><div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 sm:py-8"><div><div className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-primary" /><h1 className="text-xl font-bold">Storage cleanup</h1></div><p className="mt-1 text-sm text-muted-foreground">Find duplicate files and recover unused storage safely.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Duplicate groups</p><p className="mt-2 text-2xl font-bold">{groups.length}</p></div><div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Recoverable space</p><p className="mt-2 text-2xl font-bold">{formatBytes(recoverable)}</p></div><div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Total files</p><p className="mt-2 text-2xl font-bold">{data?.analytics.total_files ?? 0}</p></div></div>{groups.length === 0 ? <div className="rounded-2xl border bg-card py-16 text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" /><h2 className="font-semibold">No duplicate files found</h2><p className="mt-1 text-sm text-muted-foreground">Your storage is already clean.</p></div> : <div className="space-y-4">{groups.map(group => <section key={group.checksum} className="overflow-hidden rounded-2xl border bg-card"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-sm font-semibold">Duplicate group</p><p className="mt-1 text-xs text-muted-foreground">{group.files.length} identical files · {formatBytes(group.files[0]?.size ?? 0)} each</p></div><span className="font-mono text-[10px] text-muted-foreground">{group.checksum.slice(0, 12)}…</span></div><div className="divide-y">{group.files.map((file, index) => <div key={file.uuid} className="flex items-center gap-3 px-5 py-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>{index === 0 ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">Keep recommended</span> : <Button size="sm" variant="outline" onClick={() => remove(file.uuid)} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}</div>)}</div></section>)}</div>}</div></div>
}
