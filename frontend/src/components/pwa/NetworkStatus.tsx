'use client'

import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'
import { toast } from 'sonner'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOffline = () => setIsOnline(false)
    const handleOnline = () => {
      setIsOnline(previous => {
        if (!previous) toast.success('Connection restored')
        return true
      })
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 top-3 z-[150] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-950 shadow-xl dark:border-amber-500/30 dark:bg-amber-950/90 dark:text-amber-50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300"><CloudOff className="size-5" /></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">You are offline</strong><span className="block text-xs opacity-75">Changes will resume when your connection returns.</span></span>
      <Wifi className="size-4 shrink-0 opacity-50" />
    </div>
  )
}
