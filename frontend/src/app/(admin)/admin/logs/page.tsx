'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Filter, Folder, File as FileIcon, Loader2, Download, Search } from 'lucide-react'
import { exportAdminLogs, fetchAdminLogs } from '@/services/drive-api'
import { getActionLabel, getActionColor, formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/ui/error-state'

const ALL_ACTIONS = ['All', 'upload', 'download', 'delete', 'restore', 'rename', 'create_folder', 'permanent_delete']

export default function AdminLogsPage() {
  const [selectedUser, setSelectedUser] = useState('All')
  const [selectedAction, setSelectedAction] = useState('All')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-logs', selectedUser, selectedAction, search, from, to],
    queryFn: () => fetchAdminLogs({ action: selectedAction, search: search || undefined, from: from || undefined, to: to || undefined }),
  })

  const uniqueUsers = ['All', ...Array.from(new Set(logs.map(l => l.user_name)))]

  const filtered = logs.filter(log => {
    const userMatch = selectedUser === 'All' || log.user_name === selectedUser
    const actionMatch = selectedAction === 'All' || log.action === selectedAction
    return userMatch && actionMatch
  })

  const handleExport = async () => {
    const blob = await exportAdminLogs({ action: selectedAction, search: search || undefined, from: from || undefined, to: to || undefined })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cloud-nl-activity-logs.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border/80 shrink-0 bg-card/35">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity logs</h1>
          <p className="text-sm text-muted-foreground mt-1">A clear history of what happens in your drive.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border/80 bg-card/25 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filter activity</span>
          </div>
          <div className="relative min-w-56 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search file or folder" className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">From <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-2 text-sm text-foreground" /></label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">To <input type="date" value={to} onChange={event => setTo(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-2 text-sm text-foreground" /></label>
          <button type="button" onClick={handleExport} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent"><Download className="size-4 text-primary" /> Export CSV</button>
          {/* User filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">User</span>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="h-10 min-w-40 text-sm bg-card border border-border rounded-xl px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {/* Action filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Action</span>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="h-10 min-w-40 text-sm bg-card border border-border rounded-xl px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>
                  {a === 'All' ? 'All' : getActionLabel(a)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 lg:px-8">
        <div className="w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading logs...
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="bg-card border border-border/90 rounded-2xl shadow-sm shadow-slate-900/5 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[150px_minmax(220px,1.3fr)_minmax(180px,1fr)_130px_140px] gap-5 px-6 py-3.5 bg-secondary/65 border-b border-border text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.14em]">
                    <span>Action</span>
                    <span>File / folder</span>
                    <span>User</span>
                    <span>IP address</span>
                    <span>Time</span>
                  </div>
              {filtered.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">No activity found</div>
              ) : (
                filtered.map((log, i) => (
                  <div key={log.id} className={cn(
                    'grid grid-cols-[150px_minmax(220px,1.3fr)_minmax(180px,1fr)_130px_140px] gap-5 px-6 py-4 items-center border-b border-border/70 last:border-b-0 hover:bg-accent/35 transition-colors',
                    i % 2 === 1 && 'bg-secondary/15'
                  )}>
                      <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', getActionColor(log.action))}>
                        {getActionLabel(log.action)}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        {log.subject_type === 'folder'
                          ? <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          : <FileIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        }
                        <span className="text-sm truncate">{log.subject_name}</span>
                      </div>
                      <span className="text-sm text-foreground/80 truncate">{log.user_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</span>
                  </div>
                ))
              )}
                </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
