'use client'

import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { RefreshCw, Wrench } from 'lucide-react'

export default function MaintenancePage() {
  const [message, setMessage] = useState('Cloud NL is temporarily under maintenance.')

  useEffect(() => {
    const savedMessage = localStorage.getItem('maintenance_message')
    if (savedMessage) setMessage(savedMessage)
  }, [])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute -left-32 -top-32 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 size-96 rounded-full bg-primary/10 blur-3xl" />
      <section className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-primary/5 sm:p-12">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-8 ring-primary/5"><Wrench className="size-9" /></div>
        <div className="mb-6 flex items-center justify-center gap-2"><BrandMark className="size-8" /><span className="text-lg font-semibold">Cloud NL</span></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Planned maintenance</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">We&apos;ll be back shortly</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"><RefreshCw className="size-4" />Try again</button>
      </section>
    </main>
  )
}
