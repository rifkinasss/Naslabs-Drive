'use client'

import { HardDrive, Upload, Download, FileText, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/providers/AuthProvider'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  const userName = user?.name ?? 'User'
  const userEmail = user?.email ?? ''
  const userRole = user?.role ?? 'user'

  const drive = user?.drive ?? {
    storage_quota: 5368709120,
    used_storage: 0,
    available_storage: 5368709120,
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
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        {/* User card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
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
                {userRole === 'admin' ? '✦ Admin' : 'User'}
              </Badge>
            </div>
            <button
              onClick={logout}
              className="ml-auto flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
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
      </div>
    </div>
  )
}
