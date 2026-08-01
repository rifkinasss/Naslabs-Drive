'use client'

import { useQuery } from '@tanstack/react-query'
import { HardDrive, Users, Files, Upload, TrendingUp, Activity, Loader2 } from 'lucide-react'
import { fetchAdminUsers, fetchAdminLogs } from '@/services/drive-api'
import { formatBytes, getActionLabel, getActionColor } from '@/lib/helpers'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  })

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: fetchAdminLogs,
  })

  const totalUsers = users.length
  const totalFiles = users.reduce((sum, u) => sum + (u.file_count ?? 0), 0)
  const totalStorage = users.reduce((sum, u) => sum + u.used_storage, 0)
  const totalQuota = users.reduce((sum, u) => sum + u.storage_quota, 0)
  const todayUploads = logs.filter(l => l.action === 'upload').length

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Files', value: totalFiles.toLocaleString(), icon: Files, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Storage Used', value: formatBytes(totalStorage), icon: HardDrive, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Uploads', value: todayUploads, icon: Upload, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  const topUsers = [...users].sort((a, b) => b.used_storage - a.used_storage).slice(0, 3)
  const isLoading = isLoadingUsers || isLoadingLogs

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of NasLabs Drive system</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading stats...
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-card border border-border rounded-2xl p-5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Storage overview */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> System Storage
                </h2>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(totalStorage)} / {formatBytes(totalQuota)}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.round((totalStorage / Math.max(1, totalQuota)) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((totalStorage / Math.max(1, totalQuota)) * 100)}% of total allocated quota used
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top users */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Top Users by Storage</h2>
                </div>
                <div>
                  {topUsers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">No users found</div>
                  ) : (
                    topUsers.map((user, i) => (
                      <div key={user.id}>
                        {i > 0 && <Separator />}
                        <div className="px-5 py-3.5 flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <div className="w-full h-1 rounded-full bg-secondary mt-1.5 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', user.quota_percentage > 80 ? 'bg-amber-500' : 'bg-primary')}
                                style={{ width: `${user.quota_percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatBytes(user.used_storage)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Recent Activity</h2>
                </div>
                <div>
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">No activity logs found</div>
                  ) : (
                    logs.slice(0, 5).map((log, i) => (
                      <div key={log.id}>
                        {i > 0 && <Separator />}
                        <div className="px-5 py-3 flex items-center gap-2">
                          <span className={cn('text-xs font-semibold w-20 shrink-0', getActionColor(log.action))}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="text-xs text-muted-foreground truncate flex-1">{log.subject_name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{log.user_name.split(' ')[0]}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
