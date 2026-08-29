'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  if (!installEvent || dismissed) return null

  const install = async () => {
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  return (
    <div className="fixed inset-x-3 bottom-4 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/20 bg-card p-3 shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Download className="size-5" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Install Cloud NL</p><p className="text-xs text-muted-foreground">Access your private cloud faster from your home screen.</p></div>
      <Button size="sm" onClick={install}>Install</Button>
      <button type="button" onClick={() => setDismissed(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Dismiss install prompt"><X className="size-4" /></button>
    </div>
  )
}
