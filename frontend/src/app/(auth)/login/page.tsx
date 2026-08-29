'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/AuthProvider'
import { backendUrl, getApiErrorMessage } from '@/lib/api-client'
import { BrandMark } from '@/components/brand/BrandMark'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { requestPasswordReset, resendLoginOtp } from '@/services/drive-api'

export default function LoginPage() {
  const { login, verifyLoginOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [verificationStep, setVerificationStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@naslabs.id'
  const adminWhatsApp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP?.replace(/[^0-9]/g, '')

  useEffect(() => {
    if (!resendCooldown) return
    const timer = window.setInterval(() => setResendCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.verification_required) {
        setVerificationStep(true)
        setOtp('')
        setResendCooldown(60)
        setError('A verification code has been sent to your email.')
      } else {
        setError(getApiErrorMessage(err, 'Login failed. Please check your credentials.'))
      }
      setLoading(false)
    }
  }

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyLoginOtp(email, otp)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Verification failed. Check the code and try again.'))
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await resendLoginOtp(email)
      setResendCooldown(60)
      setError('A new verification code has been sent.')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to resend the verification code.'))
    } finally {
      setResendLoading(false)
    }
  }

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setForgotLoading(true)
    try {
      await requestPasswordReset(forgotEmail)
      setForgotSent(true)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to request a password reset.'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background gradient */}
      <div className="absolute -top-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm mx-4">
        {/* Glassy card */}
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-900/10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5 shadow-lg shadow-primary/10">
              <BrandMark className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{verificationStep ? 'Verify your email' : 'Welcome back'}</h1>
            <p className="text-sm font-medium text-primary mt-2">Cloud NL · NasLabs</p>
            <p className="text-sm text-muted-foreground mt-1">{verificationStep ? `Enter the 6-digit code sent to ${email}.` : 'Your private space for everything important.'}</p>
          </div>

          {verificationStep ? <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email verification code</label>
              <Input value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-12 rounded-xl bg-secondary/60 text-center text-xl tracking-[0.45em]" maxLength={6} required />
            </div>
            {error && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{error}</p>}
            <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={loading || otp.length !== 6}>{loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Verifying...</> : 'Verify and sign in'}</Button>
            <div className="flex items-center justify-between text-xs"><button type="button" onClick={() => { setVerificationStep(false); setError(''); setOtp('') }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to login</button><button type="button" onClick={handleResend} disabled={resendLoading || resendCooldown > 0} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">{resendLoading ? 'Sending...' : resendCooldown ? `Resend in ${resendCooldown}s` : 'Resend code'}</button></div>
          </form> : <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@naslabs.id"
                className="bg-secondary/60 border-border focus-visible:ring-primary h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/60 border-border focus-visible:ring-primary h-11 pr-10 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                'Sign in'
              )}
            </Button>
            <div className="relative my-5"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-[11px] uppercase tracking-widest"><span className="bg-card px-3 text-muted-foreground">or</span></div></div>
            <a href={backendUrl('/api/auth/google/redirect')} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background font-semibold transition-colors hover:bg-accent"><span className="text-base font-bold text-[#4285F4]">G</span> Continue with Google</a>
          </form>}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Forgot your password?{' '}
            <button type="button" onClick={() => { setForgotEmail(email); setForgotSent(false); setError(''); setContactOpen(true) }} className="font-medium text-primary hover:underline">Reset password</button>
          </p>
        </div>

      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Reset your password</DialogTitle>
            <DialogDescription>We will send a secure reset link to the email registered with Cloud NL.</DialogDescription>
          </DialogHeader>
          {forgotSent ? <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-700 dark:text-emerald-300">If the account exists, a password reset link has been sent. Check your inbox and spam folder.</div> : <form onSubmit={handleForgotPassword} className="mt-2 space-y-3">
            <Input type="email" value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} placeholder="you@naslabs.id" required />
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={forgotLoading}>{forgotLoading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Sending link...</> : 'Send reset link'}</Button>
          </form>}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <a href={`mailto:${adminEmail}?subject=Cloud%20NL%20account%20assistance`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-primary/50 hover:bg-accent">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="size-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold">Email admin</span><span className="mt-1 block truncate text-xs text-muted-foreground">{adminEmail}</span></span>
            </a>
            {adminWhatsApp ? <a href={`https://wa.me/${adminWhatsApp}?text=Halo%20Admin%20Cloud%20NL%2C%20saya%20memerlukan%20bantuan%20akun.`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><MessageCircle className="size-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold">WhatsApp admin</span><span className="mt-1 block truncate text-xs text-muted-foreground">Open chat</span></span>
            </a> : <div className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-border p-4 opacity-60 sm:col-span-1"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><MessageCircle className="size-5" /></span><span className="text-xs text-muted-foreground">WhatsApp admin belum dikonfigurasi.</span></div>}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Tidak menerima email? Hubungi admin tanpa mengirimkan password Anda.</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
