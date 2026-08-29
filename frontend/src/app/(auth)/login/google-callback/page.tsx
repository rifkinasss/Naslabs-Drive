'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { apiClient } from '@/lib/api-client'

export default function GoogleCallbackPage() {
  const params = useSearchParams()
  const { setUser } = useAuth()
  const [message, setMessage] = useState('Completing Google sign-in...')

  useEffect(() => {
    const ticket = params.get('ticket')
    if (!ticket) { setMessage('Google sign-in ticket is missing.'); return }
    apiClient.post<{ token: string; user: Parameters<typeof setUser>[0] }>('/auth/google/exchange', { ticket }).then(({ data }) => {
      localStorage.setItem('drive_token', data.token)
      localStorage.setItem('drive_user', JSON.stringify(data.user))
      setUser(data.user)
      window.location.href = '/drive'
    }).catch(() => setMessage('Google sign-in failed or the link has expired.'))
  }, [params, setUser])

  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">{message}</main>
}
