'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, Folder as FolderIcon, SlidersHorizontal, Star } from 'lucide-react'
import { getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { searchDrive } from '@/services/drive-api'
import { EmptyState } from '@/components/drive/EmptyState'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ErrorState } from '@/components/ui/error-state'

const FILTERS = ['All', 'Images', 'Documents', 'Videos', 'Folders'] as const
type FilterType = typeof FILTERS[number]

function SearchContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [debouncedQuery, setDebouncedQuery] = useState(q)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'size'>('name')
  const [minSize, setMinSize] = useState('')
  const [maxSize, setMaxSize] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(q), 300)
    return () => window.clearTimeout(timeout)
  }, [q])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, activeFilter, favoriteOnly, sortBy, minSize, maxSize],
    queryFn: () => searchDrive(debouncedQuery, activeFilter, { favorite: favoriteOnly || undefined, sort: sortBy, min_size: minSize ? Number(minSize) : undefined, max_size: maxSize ? Number(maxSize) : undefined }),
    enabled: debouncedQuery.trim().length > 0,
  })

  const matchingFolders = data?.folders ?? []
  const matchingFiles = data?.files ?? []
  const hasResults = matchingFolders.length > 0 || matchingFiles.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-base font-semibold">
            {q ? `Results for "${q}"` : 'Search'}
          </h1>
          {hasResults && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {matchingFolders.length + matchingFiles.length} items
            </Badge>
          )}
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                activeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {f}
            </button>
          ))}
          <button onClick={() => setShowAdvanced(value => !value)} className={cn('ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors', showAdvanced ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground')}><SlidersHorizontal className="size-3.5" /> Filters</button>
        </div>
        {showAdvanced && <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-secondary/30 p-3">
          <label className="flex items-center gap-2 pb-2 text-xs font-medium"><input type="checkbox" checked={favoriteOnly} onChange={event => setFavoriteOnly(event.target.checked)} className="accent-primary" /><Star className="size-3.5 text-amber-500" /> Favorites only</label>
          <label className="space-y-1 text-xs text-muted-foreground"><span className="block">Sort by</span><select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="h-9 rounded-lg border border-border bg-card px-2 text-foreground"><option value="name">Name</option><option value="updated_at">Last modified</option><option value="size">File size</option></select></label>
          <label className="space-y-1 text-xs text-muted-foreground"><span className="block">Min size (bytes)</span><input type="number" min="0" value={minSize} onChange={event => setMinSize(event.target.value)} placeholder="0" className="h-9 w-32 rounded-lg border border-border bg-card px-2 text-foreground" /></label>
          <label className="space-y-1 text-xs text-muted-foreground"><span className="block">Max size (bytes)</span><input type="number" min="0" value={maxSize} onChange={event => setMaxSize(event.target.value)} placeholder="Unlimited" className="h-9 w-32 rounded-lg border border-border bg-card px-2 text-foreground" /></label>
        </div>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Searching...
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !q ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-5">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">Search your Drive</h3>
            <p className="text-sm text-muted-foreground">Type in the search bar above to find files and folders</p>
          </div>
        ) : !hasResults ? (
          <EmptyState variant="search" query={q} />
        ) : (
          <div className="w-full space-y-1">
            {matchingFolders.map(folder => (
              <Link
                key={folder.uuid}
                href={`/drive/${folder.uuid}`}
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FolderIcon className="w-5 h-5" style={{ color: folder.color ?? '#64748b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <HighlightMatch text={folder.name} query={q} />
                  </p>
                  <p className="text-xs text-muted-foreground">Folder • {formatDate(folder.created_at)}</p>
                </div>
              </Link>
            ))}
            {matchingFiles.map(file => {
              const { Icon, color } = getMimeIcon(file.mime_type)
              return (
                <div
                  key={file.uuid}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <HighlightMatch text={file.name} query={q} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.size_human || formatBytes(file.size)} • {formatDate(file.updated_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {file.extension.toUpperCase()}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-foreground rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <SearchContent />
    </Suspense>
  )
}
