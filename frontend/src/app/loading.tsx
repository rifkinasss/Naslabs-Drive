import { Loader2 } from 'lucide-react'

export default function Loading() {
  return <main className="flex min-h-[50vh] items-center justify-center bg-background"><div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm"><Loader2 className="size-5 animate-spin text-primary" /> Loading Cloud NL…</div></main>
}
