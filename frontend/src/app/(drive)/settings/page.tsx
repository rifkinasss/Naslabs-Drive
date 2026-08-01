'use client'

import { useState } from 'react'
import { Settings, User, Lock, Moon, Sun, Monitor, HardDrive, Key, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/providers/AuthProvider'
import { updateUserProfile, updateUserPassword } from '@/services/drive-api'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, setUser } = useAuth()

  // Form states
  const [name, setName] = useState(user?.name ?? '')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [defaultView, setDefaultView] = useState<'grid' | 'list'>('grid')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const drive = user?.drive ?? {
    storage_quota: 5368709120,
    used_storage: 0,
    available_storage: 5368709120,
    quota_percentage: 0,
    is_drive_enabled: true,
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSavingProfile(true)
    try {
      const updatedUser = await updateUserProfile(name.trim())
      setUser(updatedUser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('drive_user', JSON.stringify(updatedUser))
      }
      toast.success('Profile name updated successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile name')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass !== confirmPass) {
      toast.error('New password and confirm password do not match')
      return
    }
    setSavingPass(true)
    try {
      await updateUserPassword({
        current_password: currentPass,
        password: newPass,
        password_confirmation: confirmPass,
      })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      toast.success('Password updated successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-base font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account preferences and security</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl w-full mx-auto px-6 py-8 space-y-8">

        {/* Section 1: Profile Settings */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Account Profile</h2>
          </div>
          <p className="text-xs text-muted-foreground">Update your personal account display information.</p>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your Name"
                  className="bg-secondary/50 border-border"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <Input
                  value={user?.email ?? ''}
                  disabled
                  className="bg-secondary/20 border-border opacity-70 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" type="submit" disabled={savingProfile} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save Profile
              </Button>
            </div>
          </form>
        </section>

        {/* Section 2: Security & Password */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold">Security & Password</h2>
          </div>
          <p className="text-xs text-muted-foreground">Ensure your account password stays strong and secure.</p>

          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current Password</label>
              <Input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/50 border-border max-w-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="bg-secondary/50 border-border"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  className="bg-secondary/50 border-border"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" type="submit" disabled={savingPass} className="gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Update Password
              </Button>
            </div>
          </form>
        </section>

        {/* Section 3: Preferences */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold">Preferences</h2>
          </div>
          <p className="text-xs text-muted-foreground">Customize your Drive display options.</p>

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
                      setTheme(id as any)
                      toast.success(`Theme set to ${label}`)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
                  onClick={() => { setDefaultView('grid'); toast.success('Default view set to Grid') }}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    defaultView === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  Grid View
                </button>
                <button
                  onClick={() => { setDefaultView('list'); toast.success('Default view set to List') }}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    defaultView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  List View
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: API & Developer Access (Admin Only) */}
        {user?.role === 'admin' && (
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">API & Developer Access</h2>
              <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary">✦ Admin</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Personal Access Token for REST API integrations.</p>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">SANCTUM API TOKEN</Badge>
                <span className="text-xs font-mono text-muted-foreground">••••••••••••••••••••</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const token = localStorage.getItem('drive_token')
                  if (token) {
                    navigator.clipboard.writeText(token)
                    toast.success('API Bearer Token copied to clipboard!')
                  } else {
                    toast.error('No token found. Please log in.')
                  }
                }}
                className="text-xs gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> Copy Bearer Token
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
