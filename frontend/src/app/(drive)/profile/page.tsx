'use client'

import Link from 'next/link'
import { useState } from 'react'
import { HardDrive, Upload, Download, FileText, LogOut, Clock3, Star, Lock, Save, Activity, ExternalLink, Link2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/providers/AuthProvider'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor'
import { fetchDriveInsights, fetchUserActivity, updateUserProfile, updateUserPassword } from '@/services/drive-api'
import { disconnectUserGoogleDrive, fetchUserGoogleDriveStatus, getUserGoogleDriveConnectUrl } from '@/services/auth-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/LanguageProvider'

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth()
  const { t } = useLanguage()
  const { data: insights } = useQuery({ queryKey: ['drive-insights'], queryFn: fetchDriveInsights, enabled: !!user })
  const { data: activities = [] } = useQuery({ queryKey: ['user-activity'], queryFn: fetchUserActivity, enabled: !!user })
  const { data: googleDriveConnected = false, refetch: refetchGoogleDrive } = useQuery({ queryKey: ['user-google-drive-status'], queryFn: fetchUserGoogleDriveStatus, enabled: !!user })
  const [name, setName] = useState(user?.name ?? '')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSavingProfile(true)
    try {
      const updatedUser = await updateUserProfile(name.trim())
      setUser(updatedUser)
      localStorage.setItem('drive_user', JSON.stringify(updatedUser))
      toast.success('Profile updated successfully')
    } catch (error) { toast.error(getApiErrorMessage(error, 'Unable to update profile')) }
    finally { setSavingProfile(false) }
  }

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPass !== confirmPass) return toast.error('New password and confirmation do not match')
    setSavingPass(true)
    try {
      await updateUserPassword({ current_password: currentPass, password: newPass, password_confirmation: confirmPass })
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      toast.success('Password updated successfully')
    } catch (error) { toast.error(getApiErrorMessage(error, 'Unable to update password')) }
    finally { setSavingPass(false) }
  }

  const connectGoogleDrive = async () => {
    try { window.location.href = await getUserGoogleDriveConnectUrl() } catch (error) { toast.error(getApiErrorMessage(error, 'Unable to connect Google Drive')) }
  }

  const disconnectGoogle = async () => {
    try { await disconnectUserGoogleDrive(); await refetchGoogleDrive(); toast.success('Google Drive disconnected') } catch (error) { toast.error(getApiErrorMessage(error, 'Unable to disconnect Google Drive')) }
  }

  const userName = user?.name ?? 'User'
  const userEmail = user?.email ?? ''
  const userRole = user?.role ?? 'user'

  const drive = user?.drive ?? {
    storage_quota: 107374182400,
    used_storage: 0,
    available_storage: 107374182400,
    quota_percentage: 0,
    is_drive_enabled: true,
  }

  const { used_storage, storage_quota, quota_percentage, available_storage } = drive

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const stats = [
    { label: 'Storage Quota', value: formatBytes(storage_quota), icon: HardDrive, color: 'text-primary' },
    { label: 'Used Storage', value: formatBytes(used_storage), icon: FileText, color: 'text-blue-400' },
    { label: 'Available', value: formatBytes(available_storage), icon: Upload, color: 'text-emerald-400' },
    { label: 'Usage', value: `${quota_percentage}%`, icon: Download, color: 'text-purple-400' },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="w-full px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* User card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 text-center sm:text-left">
            <Avatar className="w-16 h-16">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={`${userName} profile photo`} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{userName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{userEmail}</p>
              <Badge
                variant="secondary"
                className={cn('mt-2 text-xs', userRole === 'admin' ? 'bg-primary/15 text-primary' : '')}
              >
                {userRole === 'admin' ? `✦ ${t('admin')}` : t('user')}
              </Badge>
            </div>
            <Button
              onClick={logout}
              variant="destructive"
              size="sm"
              className="ml-0 sm:ml-auto self-stretch sm:self-auto gap-2"
            >
              <LogOut className="w-4 h-4" /> <span>{t('signOut')}</span>
            </Button>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <ProfileAvatarEditor />
          </div>
          <form onSubmit={handleSaveProfile} className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{t('fullName')}</label><Input value={name} onChange={event => setName(event.target.value)} required /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{t('emailAddress')}</label><Input value={userEmail} disabled className="opacity-70" /></div>
            <div className="flex justify-end sm:col-span-2"><Button size="sm" type="submit" disabled={savingProfile} className="gap-1.5"><Save className="size-4" /> Save profile</Button></div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2"><Lock className="size-4 text-amber-500" /><p className="text-sm font-semibold">Security & Password</p></div>
            <p className="mt-1 text-xs text-muted-foreground">Change your Cloud NL account password.</p>
            <form onSubmit={handleSavePassword} className="mt-4 space-y-3">
              <Input type="password" value={currentPass} onChange={event => setCurrentPass(event.target.value)} placeholder="Current password" required />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input type="password" value={newPass} onChange={event => setNewPass(event.target.value)} placeholder="New password" minLength={8} required /><Input type="password" value={confirmPass} onChange={event => setConfirmPass(event.target.value)} placeholder="Confirm new password" required /></div>
              <div className="flex justify-end"><Button size="sm" type="submit" disabled={savingPass} className="gap-1.5"><Lock className="size-4" /> Update password</Button></div>
            </form>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold">Drive status</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={cn('h-2.5 w-2.5 rounded-full', drive.is_drive_enabled ? 'bg-emerald-500' : 'bg-red-500')} />
              <span className="text-sm text-foreground/80">{drive.is_drive_enabled ? 'Ready to store files' : 'Drive access disabled'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatBytes(available_storage)} available for your files.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2"><Link2 className="size-4 text-primary" /><p className="text-sm font-semibold">Google editing</p></div>
            <p className="mt-1 text-xs text-muted-foreground">Open your Office files in Google Docs, Sheets, or Slides using your own Google Drive.</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3"><div className="flex min-w-0 items-center gap-2"><span className={cn('size-2.5 rounded-full', googleDriveConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40')} /><span className="truncate text-sm">{googleDriveConnected ? 'Google Drive connected' : 'Not connected'}</span></div>{googleDriveConnected ? <Button type="button" size="sm" variant="outline" onClick={disconnectGoogle}>Disconnect</Button> : <Button type="button" size="sm" onClick={connectGoogleDrive}><ExternalLink className="mr-1.5 size-4" /> Connect</Button>}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <Icon className={cn('w-5 h-5 mb-2', color)} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><HardDrive className="size-4 text-primary" /> Storage analytics</h2>
            <span className="text-xs text-muted-foreground">{insights?.analytics.total_files ?? 0} files · {insights?.analytics.total_folders ?? 0} folders</span>
          </div>
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
            <div className="space-y-3">
              {(insights?.analytics.by_type ?? []).slice(0, 5).map(type => <div key={type.type} className="flex items-center gap-3"><span className="w-12 text-xs font-medium text-muted-foreground">{type.type}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, Math.min(100, (type.size / Math.max(1, used_storage)) * 100))}%` }} /></div><span className="w-20 text-right text-xs text-muted-foreground">{formatBytes(type.size)}</span></div>)}
              {insights && insights.analytics.by_type.length === 0 && <p className="text-xs text-muted-foreground">Upload files to see storage distribution.</p>}
            </div>
            <div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Largest files</p><div className="space-y-2">{(insights?.analytics.largest_files ?? []).slice(0, 3).map(file => <div key={file.uuid} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2"><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-xs">{file.name}</span><span className="text-xs font-medium">{formatBytes(file.size)}</span></div>)}{insights && insights.analytics.largest_files.length === 0 && <p className="text-xs text-muted-foreground">No files yet.</p>}</div></div>
          </div>
        </div>

        {/* Storage bar */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Storage Usage</h2>
            <span className="text-xs text-muted-foreground">
              {formatBytes(used_storage)} / {formatBytes(storage_quota)}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                quota_percentage > 90 ? 'bg-destructive' :
                quota_percentage > 70 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${quota_percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">{quota_percentage}% used</span>
            <span className="text-xs text-muted-foreground">{formatBytes(available_storage)} free</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary" /> Recent files</h2><Link href="/drive" className="text-xs text-primary hover:underline">Open Drive</Link></div>
            <div className="divide-y divide-border/60">{(insights?.recent.files ?? []).slice(0, 5).map(file => <div key={file.uuid} className="flex items-center gap-3 px-5 py-3"><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span></div>)}{insights && insights.recent.files.length === 0 && <p className="px-5 py-6 text-center text-xs text-muted-foreground">No recent files yet.</p>}</div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Star className="size-4 text-amber-500" /> Favorites</h2><Link href="/favorites" className="text-xs text-primary hover:underline">View all</Link></div>
            <div className="divide-y divide-border/60">{[...(insights?.favorites.folders ?? []), ...(insights?.favorites.files ?? [])].slice(0, 5).map(item => <div key={item.uuid} className="flex items-center gap-3 px-5 py-3"><Star className="size-4 shrink-0 fill-amber-400 text-amber-400" /><span className="min-w-0 flex-1 truncate text-sm">{item.name}</span></div>)}{insights && insights.favorites.files.length + insights.favorites.folders.length === 0 && <p className="px-5 py-6 text-center text-xs text-muted-foreground">Add items to Favorites from the Drive menu.</p>}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" /> Activity timeline</h2><span className="text-xs text-muted-foreground">Last 20 activities</span></div>
          <div className="divide-y divide-border/60">{activities.slice(0, 8).map(activity => <div key={activity.id} className="flex items-center gap-3 px-5 py-3"><span className="size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="text-sm"><span className="font-medium capitalize">{activity.action.replaceAll('_', ' ')}</span><span className="text-muted-foreground"> · {activity.subject_name}</span></p><p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</p></div></div>)}{activities.length === 0 && <p className="px-5 py-6 text-center text-xs text-muted-foreground">Your activity will appear here.</p>}</div>
        </div>
      </div>
    </div>
  )
}
