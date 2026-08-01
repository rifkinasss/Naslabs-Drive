'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Filter, Folder, File as FileIcon, Loader2 } from 'lucide-react'
import { fetchAdminLogs } from '@/services/drive-api'
import { getActionLabel, getActionColor, formatDate } from '@/lib/helpers'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const ALL_ACTIONS = ['All', 'upload', 'download', 'delete', 'restore', 'rename', 'create_folder', 'permanent_delete']

export default function AdminLogsPage() {
  const [selectedUser, setSelectedUser] = useState('All')
  const [selectedAction, setSelectedAction] = useState('All')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: fetchAdminLogs,
  })

  const uniqueUsers = ['All', ...Array.from(new Set(logs.map(l => l.user_name)))]

  const filtered = logs.filter(log => {
    const userMatch = selectedUser === 'All' || log.user_name === selectedUser
    const actionMatch = selectedAction === 'All' || log.action === selectedAction
    return userMatch && actionMatch
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-base font-semibold">Activity Logs</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border bg-card/30 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Filter:</span>
          </div>
          {/* User filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">User:</span>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-foreground"
            >
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {/* Action filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Action:</span>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-foreground"
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
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-4xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading logs...
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-secondary/50 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Action</span>
                <span>File / Folder</span>
                <span>User</span>
                <span className="hidden md:block">IP Address</span>
                <span>Time</span>
              </div>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No logs found</div>
              ) : (
                filtered.map((log, i) => (
                  <div key={log.id}>
                    {i > 0 && <Separator />}
                    <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                      <span className={cn('text-xs font-semibold whitespace-nowrap', getActionColor(log.action))}>
                        {getActionLabel(log.action)}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        {log.subject_type === 'folder'
                          ? <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          : <FileIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        }
                        <span className="text-sm truncate">{log.subject_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground truncate">{log.user_name}</span>
                      <span className="text-xs text-muted-foreground font-mono hidden md:block">{log.ip_address}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
