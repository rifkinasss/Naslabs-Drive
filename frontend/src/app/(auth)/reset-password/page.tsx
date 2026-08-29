'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandMark } from '@/components/brand/BrandMark'
import { getApiErrorMessage } from '@/lib/api-client'
import { resetPassword } from '@/services/auth-api'

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true); setError(''); setMessage('')
    try {
      await resetPassword({
        token: params.get('token') || '',
        email: params.get('email') || '',
        password,
        password_confirmation: confirmation,
      })
      setMessage('Password berhasil diubah. Anda akan diarahkan ke halaman login.')
      window.setTimeout(() => router.push('/login'), 1400)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Link reset tidak valid atau sudah kedaluwarsa.'))
    } finally { setLoading(false) }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4"><div className="absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/10 blur-3xl" /><div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10"><div className="mb-8 flex flex-col items-center text-center"><div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 shadow-lg shadow-primary/10"><BrandMark className="size-12" /></div><h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1><p className="mt-2 text-sm text-muted-foreground">Create a secure password for your Cloud NL account.</p></div><form onSubmit={submit} className="space-y-4"><label className="block space-y-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">New password<Input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimum 8 characters" required className="mt-1 h-11 rounded-xl bg-secondary/60 text-sm normal-case tracking-normal" /></label><label className="block space-y-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password<Input type="password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Re-enter your password" required className="mt-1 h-11 rounded-xl bg-secondary/60 text-sm normal-case tracking-normal" /></label>{error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}{message && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}<Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={loading || !params.get('token') || !params.get('email')}>{loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : <><LockKeyhole className="mr-2 size-4" /> Save new password</>}</Button></form></div></main>
}
