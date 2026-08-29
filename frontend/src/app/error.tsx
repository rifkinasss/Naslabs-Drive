'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the error boundary quiet in production while still allowing recovery.
  }, [])

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="size-7" /></div><h1 className="mt-5 text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cloud NL mengalami kendala saat memuat halaman. Silakan coba lagi.</p><Button type="button" onClick={reset} className="mt-6 gap-2"><RefreshCw className="size-4" /> Try again</Button></div></main>
}
