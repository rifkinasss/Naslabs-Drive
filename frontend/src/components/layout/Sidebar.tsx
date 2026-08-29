'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HardDrive, Trash2, Search, User, Shield, Star,
  Users, FileText, ChevronRight, Settings, Share2, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { formatBytes } from '@/lib/helpers'
import { BrandMark } from '@/components/brand/BrandMark'
import { useLanguage } from '@/providers/LanguageProvider'
import { useQuery } from '@tanstack/react-query'
import { fetchBranding } from '@/services/drive-api'

const navItems = [
  { href: '/drive', key: 'myDrive', icon: HardDrive }, { href: '/favorites', key: 'favorites', icon: Star }, { href: '/storage', label: 'Storage cleanup', icon: Sparkles }, { href: '/trash', key: 'trash', icon: Trash2 }, { href: '/profile', key: 'profile', icon: User }, { href: '/settings', key: 'settings', icon: Settings }, { href: '/shared', key: 'shared', icon: Share2 },
]

const adminItems = [
  { href: '/admin', key: 'dashboard', icon: Shield }, { href: '/admin/users', key: 'users', icon: Users }, { href: '/admin/files', label: 'Global files', icon: HardDrive }, { href: '/admin/logs', key: 'logs', icon: FileText }, { href: '/admin/settings', label: 'System settings', icon: Settings },
]

export function Sidebar({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: fetchBranding, staleTime: 60_000 })

  const drive = user?.drive ?? {
    storage_quota: 107374182400,
    used_storage: 0,
    available_storage: 107374182400,
    quota_percentage: 0,
    is_drive_enabled: true,
  }
  const { used_storage, storage_quota, quota_percentage } = drive

  return (
    <aside className={cn('flex flex-col h-full bg-card/90 border-r border-border shrink-0 shadow-[4px_0_24px_oklch(0.25_0.02_255/0.03)] transition-[width] duration-200', collapsed ? 'w-[4.5rem]' : 'w-64')}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 py-6 border-b border-border/80', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 shadow-sm shadow-primary/10">
          {branding?.logo_url ? <img src={branding.logo_url} alt={branding.app_name} className="w-8 h-8 rounded-lg object-cover" /> : <BrandMark className="w-8 h-8" />}
        </div>
        <div className={cn(collapsed && 'hidden')}>
          <p className="font-semibold tracking-tight leading-none">{branding?.app_name ?? 'Cloud NL'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t('privateCloud')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ href, key, label, icon: Icon }) => {
          const active = href === '/drive'
            ? pathname === '/drive' || pathname.startsWith('/drive/')
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl text-sm font-medium transition-colors', collapsed ? 'justify-center px-3.5 py-3' : 'px-3.5 py-3',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={cn(collapsed && 'hidden')}>{t(label ?? key ?? '')}</span>
              {active && !collapsed && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          )
        })}

        {/* Admin section */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <div className={cn('pt-4 pb-1 px-3', collapsed && 'hidden')}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('admin')}</p>
            </div>
            {adminItems.filter(item => (item.href !== '/admin/files' && item.href !== '/admin/settings') || user?.role === 'admin').map(({ href, key, label, icon: Icon }) => {
              const active = href === '/admin'
                ? pathname === '/admin'
                : pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl text-sm font-medium transition-colors', collapsed ? 'justify-center px-3.5 py-3' : 'px-3.5 py-3',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={cn(collapsed && 'hidden')}>{t(label ?? key ?? '')}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Storage info */}
      <div className={cn('m-3 rounded-2xl bg-secondary/70 border border-border/70', collapsed ? 'p-2' : 'p-4')}>
        {collapsed ? <div className="flex justify-center py-1"><HardDrive className="size-4 text-muted-foreground" /></div> : <>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{t('storage')}</span>
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
        </>}
      </div>
    </aside>
  )
}
