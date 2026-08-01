'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HardDrive, Trash2, Search, User, Shield,
  Users, FileText, ChevronRight, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { formatBytes } from '@/lib/helpers'

const navItems = [
  { href: '/drive', label: 'My Drive', icon: HardDrive },
  { href: '/trash', label: 'Trash', icon: Trash2 },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const adminItems = [
  { href: '/admin', label: 'Dashboard', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const drive = user?.drive ?? {
    storage_quota: 5368709120,
    used_storage: 0,
    available_storage: 5368709120,
    quota_percentage: 0,
    is_drive_enabled: true,
  }
  const { used_storage, storage_quota, quota_percentage } = drive

  return (
    <aside className="flex flex-col h-full w-60 bg-card border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <HardDrive className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">NasLabs</p>
          <p className="text-xs text-muted-foreground mt-0.5">Drive</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/drive'
            ? pathname === '/drive' || pathname.startsWith('/drive/')
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          )
        })}

        {/* Admin section */}
        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/admin'
                ? pathname === '/admin'
                : pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Storage info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Storage</span>
          <span className="text-xs font-medium">{quota_percentage}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              quota_percentage > 90 ? 'bg-destructive' :
              quota_percentage > 70 ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${quota_percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {formatBytes(used_storage)} / {formatBytes(storage_quota)}
        </p>
      </div>
    </aside>
  )
}
