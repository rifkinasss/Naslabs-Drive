'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HardDrive, Users, Files, Upload, TrendingUp, Activity, Loader2, AlertTriangle, Database, Server, CheckCircle2, XCircle, Archive, RefreshCw, BarChart3, Trash2, ChevronDown, ChevronUp, ListChecks, ShieldCheck, Gauge } from 'lucide-react'
import { cleanupAdminStorage, deleteAdminBackup, fetchAdminAnalytics, fetchAdminBackupPreview, fetchAdminBackups, fetchAdminLogs, fetchAdminStorageOverview, fetchAdminSystemHealth, fetchAdminUsers, restoreAdminBackup, runAdminBackup } from '@/services/drive-api'
import { formatBytes, formatDate, getActionLabel, getActionColor } from '@/lib/helpers'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/ui/error-state'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useLanguage } from '@/providers/LanguageProvider'

function ActivityChart({ points }: { points: { date: string; events: number }[] }) {
  if (points.length === 0) return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">No activity data yet</div>
  return <ChartContainer config={{ events: { label: 'Events', color: 'var(--primary)' } }} className="h-full w-full"><LineChart accessibilityLayer data={points} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={value => String(value).slice(5)} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Line type="monotone" dataKey="events" stroke="var(--color-events)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /></LineChart></ChartContainer>
}

function FileDistributionChart({ data }: { data: { type: string; count: number; bytes: number }[] }) {
  if (data.length === 0) return <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">No file distribution data yet</div>
  const colors = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#f43f5e']
  return <div><ChartContainer config={{ files: { label: 'Files', color: '#0ea5e9' } }} className="h-44 w-full"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={data.slice(0, 5)} dataKey="count" nameKey="type" innerRadius={42} outerRadius={68} paddingAngle={4}>{data.slice(0, 5).map((item, index) => <Cell key={item.type} fill={colors[index % colors.length]} />)}</Pie></PieChart></ChartContainer><div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">{data.slice(0, 5).map((item, index) => <div key={item.type} className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="max-w-28 truncate" title={item.type}>{item.type}</span><span className="font-medium text-foreground">{item.count}</span></div>)}</div></div>
}

function localizedAction(action: string, language: 'en' | 'id'): string {
  if (language === 'id') return ({ upload: 'Diunggah', download: 'Diunduh', delete: 'Dipindahkan ke Sampah', restore: 'Dipulihkan', rename: 'Diubah nama', move: 'Dipindahkan', create_folder: 'Folder dibuat', update_system_setting: 'Pengaturan diperbarui', update_system_settings: 'Pengaturan diperbarui', reset_branding_asset: 'Branding direset' } as Record<string, string>)[action] ?? getActionLabel(action)
  return getActionLabel(action)
}

export default function AdminPage() {
  const { t, language } = useLanguage()
  const [showAllStats, setShowAllStats] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { data: users = [], isLoading: isLoadingUsers, isError: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  })

  const { data: logs = [], isLoading: isLoadingLogs, isError: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => fetchAdminLogs(),
  })

  const { data: health, isLoading: isLoadingHealth, isError: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: fetchAdminSystemHealth,
  })
  const { data: backups = [], isLoading: isLoadingBackups } = useQuery({ queryKey: ['admin-backups'], queryFn: fetchAdminBackups })
  const { data: storageOverview } = useQuery({ queryKey: ['admin-storage-overview'], queryFn: fetchAdminStorageOverview })
  const { data: analytics } = useQuery({ queryKey: ['admin-analytics'], queryFn: fetchAdminAnalytics })
  const { data: backupPreview, isLoading: isLoadingPreview } = useQuery({ queryKey: ['admin-backup-preview', previewName], queryFn: () => fetchAdminBackupPreview(previewName!), enabled: Boolean(previewName) })
  const backupMutation = useMutation({ mutationFn: runAdminBackup, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-backups'] }); toast.success('Backup completed') }, onError: () => toast.error('Backup failed. Check server logs.') })
  const deleteBackupMutation = useMutation({ mutationFn: deleteAdminBackup, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-backups'] }); toast.success('Backup deleted') }, onError: () => toast.error('Unable to delete backup') })
  const restoreBackupMutation = useMutation({ mutationFn: restoreAdminBackup, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-backups'] }); setPreviewName(null); toast.success('Backup restored successfully') }, onError: () => toast.error('Restore failed. Check server logs.') })
  const cleanupStorageMutation = useMutation({ mutationFn: cleanupAdminStorage, onSuccess: result => { queryClient.invalidateQueries({ queryKey: ['admin-storage-overview'] }); toast.success(`${result.removed} orphaned record(s) removed`) }, onError: () => toast.error('Storage cleanup failed') })

  const totalUsers = users.length
  const totalFiles = users.reduce((sum, u) => sum + (u.file_count ?? 0), 0)
  const totalStorage = users.reduce((sum, u) => sum + u.used_storage, 0)
  const totalQuota = users.reduce((sum, u) => sum + u.storage_quota, 0)
  const todayUploads = logs.filter(l => l.action === 'upload').length
  const quotaAlerts = users.filter(user => user.quota_percentage >= 80).length
  const fallbackActivity = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    return { date: date.toISOString().slice(0, 10), events: 0 }
  })
  const fallbackFileTypes = (storageOverview?.largest_files ?? []).reduce<{ type: string; count: number; bytes: number }[]>((items, file) => {
    const existing = items.find(item => item.type === file.mime_type)
    if (existing) existing.count += 1, existing.bytes += file.size
    else items.push({ type: file.mime_type || 'unknown', count: 1, bytes: file.size })
    return items
  }, [])
  const analyticsData = analytics ? { ...analytics, by_type: analytics.by_type.length > 0 ? analytics.by_type : fallbackFileTypes, activity_by_day: analytics.activity_by_day.length > 0 ? analytics.activity_by_day : fallbackActivity } : {
    period_days: 30,
    new_users: 0,
    uploads: logs.filter(log => log.action === 'upload').length,
    downloads: logs.filter(log => log.action === 'download').length,
    events: logs.length,
    by_type: fallbackFileTypes,
    activity_by_day: fallbackActivity,
  }

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Files', value: totalFiles.toLocaleString(), icon: Files, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Storage Used', value: formatBytes(totalStorage), icon: HardDrive, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Uploads', value: todayUploads, icon: Upload, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Quota Alerts', value: quotaAlerts, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  ]

  const topUsers = [...users].sort((a, b) => b.used_storage - a.used_storage).slice(0, 3)
  const isLoading = isLoadingUsers || isLoadingLogs || isLoadingHealth
  const isError = usersError || logsError || healthError

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cloud NL control center</p>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{language === 'id' ? 'Pantau pengguna, penyimpanan, aktivitas, dan kesehatan sistem.' : 'A clear view of your users, storage, activity, and system health.'}</p>
        </div>

        {isError ? (
          <ErrorState onRetry={() => Promise.all([refetchUsers(), refetchLogs(), refetchHealth()])} />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading stats...
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {stats.map(({ label, value, icon: Icon, color, bg }, index) => (
                <div key={label} className={cn('bg-card border border-border rounded-2xl p-5', index >= 4 && !showAllStats && 'hidden sm:block')}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowAllStats(value => !value)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent sm:hidden">
              {showAllStats ? <>Show less <ChevronUp className="size-4" /></> : <>View all stats <ChevronDown className="size-4" /></>}
            </button>

            {health && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> System Health</h2>
                    <p className="text-xs text-muted-foreground mt-1">Live checks for the Cloud core services</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full capitalize', health.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : health.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                    {health.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Database', check: health.checks.database, icon: Database },
                    { label: 'Storage', check: health.checks.storage, icon: HardDrive },
                    { label: 'Quota', check: health.checks.quota, icon: AlertTriangle },
                    { label: 'Queue', check: health.checks.queue, icon: ListChecks },
                    { label: 'Backup', check: health.checks.backup, icon: Archive },
                    { label: 'Antivirus', check: health.checks.antivirus, icon: ShieldCheck },
                    { label: 'API', check: health.checks.api, icon: Gauge },
                  ].map(({ label, check, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-border bg-secondary/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" />{label}</span>
                        {check.status === 'healthy' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : check.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{check.message}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => refetchHealth()} className="text-xs text-primary hover:underline mt-4">Refresh health checks</button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Archive className="size-4 text-primary" /> Backup management</h2><button type="button" onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><RefreshCw className={cn('size-3.5', backupMutation.isPending && 'animate-spin')} /> {backupMutation.isPending ? 'Running...' : 'Run backup'}</button></div>
                <div className="divide-y divide-border/70">{isLoadingBackups ? <p className="px-5 py-8 text-center text-xs text-muted-foreground">Loading backups...</p> : backups.length === 0 ? <p className="px-5 py-8 text-center text-xs text-muted-foreground">No backups created yet.</p> : backups.slice(0, 3).map(backup => <div key={backup.name} className="flex items-center justify-between gap-3 px-5 py-3"><button type="button" className="min-w-0 text-left" onClick={() => setPreviewName(backup.name)}><p className="truncate text-sm font-medium hover:text-primary">{backup.name}</p><p className="text-xs text-muted-foreground">{backup.files} files · {formatBytes(backup.bytes)}</p></button><button type="button" className="text-muted-foreground hover:text-destructive" title="Delete backup" onClick={() => { if (window.confirm(`Delete backup ${backup.name}?`)) deleteBackupMutation.mutate(backup.name) }}><Trash2 className="size-4" /></button></div>)}</div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><HardDrive className="size-4 text-primary" /> Storage operations</h2><div className="flex items-center gap-2"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', storageOverview?.orphaned_records ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{storageOverview?.orphaned_records ?? 0} orphaned</span>{Boolean(storageOverview?.orphaned_records) && <button type="button" disabled={cleanupStorageMutation.isPending} onClick={() => { if (window.confirm('Remove orphaned database records? This cannot be undone.')) cleanupStorageMutation.mutate() }} className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">{cleanupStorageMutation.isPending ? 'Cleaning...' : 'Clean up'}</button>}</div></div><div className="divide-y divide-border/70">{(storageOverview?.largest_files ?? []).slice(0, 4).map(file => <div key={file.uuid} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{file.user}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span></div>)}{storageOverview && storageOverview.largest_files.length === 0 && <p className="px-5 py-8 text-center text-xs text-muted-foreground">No files found.</p>}</div></div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm xl:grid xl:grid-cols-[1.5fr_1fr]">
              <div className="p-5 xl:border-r xl:border-border"><button type="button" onClick={() => setShowAnalytics(value => !value)} className="flex w-full items-center justify-between text-left"><span><h2 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="size-4 text-primary" /> Activity & file analytics</h2><p className="mt-1 text-xs text-muted-foreground">Last {analyticsData.period_days} days</p></span><ChevronDown className={cn('size-4 text-muted-foreground transition-transform sm:hidden', showAnalytics && 'rotate-180')} /></button><div className={cn('mt-4', !showAnalytics && 'hidden sm:block')}><div className="mb-3 flex justify-end"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{analyticsData.events} events</span></div><div className="h-44 w-full"><ActivityChart points={analyticsData.activity_by_day} /></div></div></div>
              <div className={cn('border-t border-border p-5 xl:border-t-0', !showAnalytics && 'hidden sm:block')}><h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Files className="size-4 text-primary" /> File distribution</h2><FileDistributionChart data={analyticsData.by_type} /></div>
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
                <div className="space-y-2 p-3 sm:p-4">
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
                  <h2 className="text-sm font-semibold">{t('recentActivity')}</h2>
                </div>
                <div>
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">{t('noActivity')}</div>
                  ) : (
                    logs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Activity className="size-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className={cn('inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none', getActionColor(log.action))}>{localizedAction(log.action, language)}</span>
                            <span className="max-w-full truncate text-sm font-medium text-foreground" title={log.subject_name}>{log.subject_name || 'System activity'}</span>
                          </div>
                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><span className="truncate">by {log.user_name}</span><span className="hidden text-border sm:inline">•</span><span>{formatDate(log.created_at)}</span></div>
                        </div>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Dialog open={Boolean(previewName)} onOpenChange={open => !open && setPreviewName(null)}><DialogContent><DialogHeader><DialogTitle>Backup preview</DialogTitle></DialogHeader>{isLoadingPreview ? <p className="py-8 text-center text-sm text-muted-foreground">Loading manifest...</p> : backupPreview && <><div className="grid grid-cols-2 gap-3 text-sm">{[['Backup', backupPreview.name], ['Created', backupPreview.created_at ? new Date(backupPreview.created_at).toLocaleString() : '-'], ['Users', backupPreview.users], ['Folders', backupPreview.folders], ['Files', backupPreview.files], ['Storage', formatBytes(backupPreview.storage_bytes)], ['Database', backupPreview.database]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-secondary/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>)}</div><div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-muted-foreground">Restore will replace the active database and stored files. A safety backup is created automatically before continuing.</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPreviewName(null)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">Cancel</button><button type="button" disabled={restoreBackupMutation.isPending} onClick={() => { if (window.confirm(`Restore backup ${backupPreview.name}? Current data will be replaced.`)) restoreBackupMutation.mutate(backupPreview.name) }} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{restoreBackupMutation.isPending ? 'Restoring...' : 'Restore backup'}</button></div></>}</DialogContent></Dialog>
    </div>
  )
}
