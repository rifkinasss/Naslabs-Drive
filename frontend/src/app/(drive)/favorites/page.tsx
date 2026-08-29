'use client'

import Link from 'next/link'
import { Folder, FileText, Loader2, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchDriveInsights } from '@/services/drive-api'
import { formatBytes, formatDate } from '@/lib/helpers'
import { EmptyState } from '@/components/drive/EmptyState'

export default function FavoritesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['drive-insights'], queryFn: fetchDriveInsights })
  const folders = data?.favorites.folders ?? []
  const files = data?.favorites.files ?? []
  const isEmpty = !isLoading && folders.length === 0 && files.length === 0

  return <div className="flex min-h-full flex-col">
    <div className="flex items-center gap-3 border-b border-border px-6 py-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Star className="size-5 fill-current" /></div>
      <div><h1 className="text-base font-semibold">Favorites</h1><p className="text-xs text-muted-foreground">Quick access to the files and folders you use most.</p></div>
    </div>
    <div className="flex-1 px-6 py-6">
      {isLoading ? <div className="flex justify-center py-24 text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> Loading favorites…</div> : isEmpty ? <EmptyState variant="drive" /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {folders.map(folder => <Link key={folder.uuid} href={`/drive/${folder.uuid}`} className="group rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><Folder className="mb-4 size-8" style={{ color: folder.color ?? '#3B82F6' }} /><p className="truncate text-sm font-medium">{folder.name}</p><p className="mt-1 text-xs text-muted-foreground">Folder · {formatDate(folder.updated_at ?? folder.created_at)}</p></Link>)}
        {files.map(file => <Link key={file.uuid} href={`/drive`} className="group rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><FileText className="mb-4 size-8 text-primary" /><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)} · {formatDate(file.updated_at)}</p></Link>)}
      </div>}
    </div>
  </div>
}
