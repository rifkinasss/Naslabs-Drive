'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Search, Bell, LogOut, User, Settings, Menu, AlertTriangle, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'
import { fetchNotifications, markNotificationsRead } from '@/services/drive-api'
import { useLanguage } from '@/providers/LanguageProvider'

interface HeaderProps {
  onMenuClick?: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }: HeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const notificationsRef = useRef<HTMLDivElement>(null)
  const notificationSnapshot = useRef<string>('')
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications, refetchInterval: 60000 })
  const unreadNotifications = notifications.filter(notification => !(notification.read || readNotificationIds.has(notification.id)))

  const markAllNotificationsRead = async () => {
    const next = new Set(readNotificationIds)
    notifications.forEach(notification => next.add(notification.id))
    setReadNotificationIds(next)
    await markNotificationsRead(notifications.map(notification => notification.id))
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !notifications.length) return
    const snapshot = notifications.map(item => item.id).join('|')
    if (notificationSnapshot.current && notificationSnapshot.current !== snapshot && Notification.permission === 'granted') {
      new Notification(notifications[0].title, { body: notifications[0].message, icon: '/icon.svg' })
    }
    notificationSnapshot.current = snapshot
  }, [notifications])

  const enableBrowserNotifications = async () => {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  }

  useEffect(() => {
    if (!notificationsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false) }
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [notificationsOpen])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('drive-search-input')?.focus()
      }

      if (event.key.toLowerCase() === 'u') {
        event.preventDefault()
        window.dispatchEvent(new Event('cloud:open-upload'))
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  const userName = user?.name ?? 'User'
  const userRole = user?.role ?? 'user'

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="relative z-50 min-h-[4.5rem] border-b border-border/80 bg-card/70 backdrop-blur-sm flex items-center gap-2 sm:gap-3 px-3 sm:px-5 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button onClick={onSidebarToggle} className="hidden rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:inline-flex" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {sidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="drive-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search')}
            className="pl-10 bg-secondary/75 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 h-10 text-sm rounded-xl"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div ref={notificationsRef} className="relative z-[100]">
        <button onClick={() => { setNotificationsOpen(open => !open); void enableBrowserNotifications() }} className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label={t('notifications')} aria-expanded={notificationsOpen} aria-haspopup="dialog">
          <Bell className="w-4 h-4" />
          {unreadNotifications.length > 0 && <span className="absolute right-1 top-1 flex min-w-1.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-3 text-primary-foreground">{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>}
        </button>
        {notificationsOpen && <div role="dialog" aria-label={t('notifications')} className="absolute right-0 top-full z-[110] mt-5 w-[min(26rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><p className="text-sm font-semibold">{t('notifications')}</p><div className="flex items-center gap-2"><span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{unreadNotifications.length} unread</span>{notifications.length > 0 && unreadNotifications.length > 0 && <button type="button" onClick={() => { void markAllNotificationsRead() }} className="text-xs font-medium text-primary hover:underline">Mark all read</button>}</div></div>{notifications.length === 0 ? <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t('caughtUp')}</p> : <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">{notifications.map(notification => <div key={notification.id} className={cn('flex gap-3 border-b border-border/60 px-4 py-3 last:border-0', notification.read || readNotificationIds.has(notification.id) ? 'opacity-60' : 'bg-primary/[0.03]')}><div className={cn('mt-0.5 shrink-0', notification.type === 'warning' ? 'text-amber-500' : 'text-primary')}>{notification.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}</div><div className="min-w-0"><p className="break-words text-xs font-semibold">{notification.title}</p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{notification.message}</p></div></div>)}</div>}</div>}
        </div>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent transition-colors">
          <Avatar className="w-9 h-9">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={`${userName} profile photo`} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className={cn(
                'text-[10px] leading-none mt-0.5 font-medium',
                userRole === 'admin' ? 'text-primary' : 'text-muted-foreground'
              )}>
                {userRole === 'admin' ? `✦ ${t('admin')}` : t('user')}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="w-4 h-4 mr-2" /> {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" /> {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" /> {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
