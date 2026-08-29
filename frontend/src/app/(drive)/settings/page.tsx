'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Moon, Sun, Monitor, HardDrive, Key, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/providers/AuthProvider'
import { Language, useLanguage } from '@/providers/LanguageProvider'
import { Theme, useTheme } from '@/providers/ThemeProvider'
import { fetchSessions, revokeSession, logoutAllSessions, regenerateApiToken } from '@/services/drive-api'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-client'

export default function SettingsPage() {
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions, enabled: !!user })
  const [sessionPage, setSessionPage] = useState(1)
  const sessionPageSize = 10
  const sessionPageCount = Math.max(1, Math.ceil(sessions.length / sessionPageSize))
  const visibleSessions = sessions.slice((sessionPage - 1) * sessionPageSize, sessionPage * sessionPageSize)
  const revokeSessionMutation = useMutation({ mutationFn: revokeSession, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); setSessionPage(page => Math.min(page, Math.max(1, Math.ceil((sessions.length - 1) / sessionPageSize)))); toast.success('Session revoked') } })
  const logoutAllMutation = useMutation({ mutationFn: logoutAllSessions, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); setSessionPage(1); toast.success('All sessions revoked') } })

  const { theme, setTheme } = useTheme()
  const [defaultView, setDefaultView] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('drive_default_view') as 'grid' | 'list') || 'grid'
  })
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'size' | 'type'>(() => {
    if (typeof window === 'undefined') return 'name'
    return (localStorage.getItem('drive_sort_by') as 'name' | 'updated_at' | 'size' | 'type') || 'name'
  })


  const drive = user?.drive ?? {
    storage_quota: 107374182400,
    used_storage: 0,
    available_storage: 107374182400,
    quota_percentage: 0,
    is_drive_enabled: true,
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-base font-semibold">{t('settings')}</h1>
          <p className="text-xs text-muted-foreground">{t('customizeExperience')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-5 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Section 1: Preferences */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold">{t('preferences')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t('preferencesDescription')}</p>

          <div className="space-y-4 pt-2">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Appearance Theme</p>
                <p className="text-xs text-muted-foreground">Choose dark mode or system default theme</p>
              </div>
              <div className="flex items-center rounded-lg border border-border p-1 bg-secondary/30">
                {[
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'system', label: 'System', icon: Monitor },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      const nextTheme = id as Theme
                      setTheme(nextTheme)
                      toast.success(`Theme set to ${label}`)
                    }}
                    className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                      theme === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Default View */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Default Drive View</p>
                <p className="text-xs text-muted-foreground">Default layout when navigating folder contents</p>
              </div>
              <div className="flex items-center rounded-lg border border-border p-1 bg-secondary/30">
                <button
                  onClick={() => { setDefaultView('grid'); localStorage.setItem('drive_default_view', 'grid'); toast.success('Default view set to Grid') }}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                    defaultView === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  Grid View
                </button>
                <button
                  onClick={() => { setDefaultView('list'); localStorage.setItem('drive_default_view', 'list'); toast.success('Default view set to List') }}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                    defaultView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  List View
                </button>
              </div>
            </div>

            <Separator />

            {/* Default sorting */}
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Default Sort Order</p>
                <p className="text-xs text-muted-foreground">Choose how files are arranged in your Drive.</p>
              </div>
              <select
                value={sortBy}
                onChange={e => {
                  const nextSort = e.target.value as 'name' | 'updated_at' | 'size' | 'type'
                  setSortBy(nextSort)
                  localStorage.setItem('drive_sort_by', nextSort)
                }}
                className="h-10 min-w-44 rounded-xl border border-border bg-secondary/60 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="name">Name</option>
                <option value="updated_at">Last modified</option>
                <option value="size">File size</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Language */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">{t('language')}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t('languageDescription')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['en', t('english')],
              ['id', t('indonesian')],
            ] as [Language, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLanguage(value)
                  toast.success(t('languageSaved'))
                }}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                  language === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Section 5: Storage */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Storage</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Keep track of the space available in your private drive.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/35 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{formatBytes(drive.used_storage)}</p>
                <p className="text-sm text-muted-foreground mt-1">used of {formatBytes(drive.storage_quota)}</p>
              </div>
              <span className="text-sm font-semibold text-primary">{drive.quota_percentage}%</span>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-card border border-border/60">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(drive.quota_percentage, 100)}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(drive.available_storage)} available</span>
              <span>{drive.is_drive_enabled ? 'Drive active' : 'Drive disabled'}</span>
            </div>
          </div>
        </section>

        {/* Section 6: Active Sessions */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Active Sessions</h2><p className="text-xs text-muted-foreground mt-1">Manage devices currently signed in to Cloud NL.</p></div>
            <Button size="sm" variant="destructive" onClick={() => logoutAllMutation.mutate()} disabled={logoutAllMutation.isPending || sessions.length === 0}>Logout all</Button>
          </div>
          <div className="space-y-2">{visibleSessions.map(session => <div key={session.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{session.name} {session.is_current && <Badge variant="secondary" className="ml-1 text-[10px]">Current</Badge>}</p><p className="text-xs text-muted-foreground mt-1">Signed in {new Date(session.created_at).toLocaleDateString()} · {session.last_used_at ? `Last used ${new Date(session.last_used_at).toLocaleString()}` : 'Not used yet'}</p></div><Button size="sm" variant="outline" onClick={() => revokeSessionMutation.mutate(session.id)} disabled={session.is_current || revokeSessionMutation.isPending}>{session.is_current ? 'This device' : 'Revoke'}</Button></div>)}</div>
          {sessionPageCount > 1 && <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2"><p className="text-xs text-muted-foreground">Showing {(sessionPage - 1) * sessionPageSize + 1}–{Math.min(sessionPage * sessionPageSize, sessions.length)} of {sessions.length} sessions</p><div className="flex items-center gap-1"><Button size="icon-sm" variant="outline" onClick={() => setSessionPage(page => Math.max(1, page - 1))} disabled={sessionPage === 1} aria-label="Previous sessions page"><ChevronLeft className="w-4 h-4" /></Button>{Array.from({ length: sessionPageCount }, (_, index) => index + 1).map(page => <Button key={page} size="icon-sm" variant={page === sessionPage ? 'default' : 'outline'} onClick={() => setSessionPage(page)} aria-label={`Sessions page ${page}`}>{page}</Button>)}<Button size="icon-sm" variant="outline" onClick={() => setSessionPage(page => Math.min(sessionPageCount, page + 1))} disabled={sessionPage === sessionPageCount} aria-label="Next sessions page"><ChevronRight className="w-4 h-4" /></Button></div></div>}
        </section>

        {/* Section 7: API & Developer Access (Admin Only) */}
        {user?.role === 'admin' && (
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">API & Developer Access</h2>
              <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary">✦ Admin</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Personal Access Token for REST API integrations.</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between p-3.5 rounded-xl border border-border bg-secondary/30">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Badge variant="outline" className="font-mono text-[10px]">SANCTUM API TOKEN</Badge>
                <span className="text-xs font-mono text-muted-foreground break-anywhere">••••••••••••••••••••</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" onClick={() => {
                  const token = localStorage.getItem('drive_token')
                  if (token) {
                    navigator.clipboard.writeText(token)
                    toast.success('API Bearer Token copied to clipboard!')
                  } else {
                    toast.error('No token found. Please log in.')
                  }
                }} className="text-xs gap-1.5 w-full sm:w-auto">
                <Key className="w-3.5 h-3.5" /> Copy Bearer Token
                </Button>
                <Button size="sm" variant="destructive" onClick={async () => { const token = await regenerateApiToken(); localStorage.setItem('drive_token', token); toast.success('API token regenerated. Copy the new token now.') }} className="text-xs gap-1.5 w-full sm:w-auto">Regenerate</Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
