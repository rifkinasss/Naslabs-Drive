'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { AuthProvider } from '@/providers/AuthProvider'
import { LanguageProvider } from '@/providers/LanguageProvider'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { BrandingTitle } from '@/components/brand/BrandingTitle'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 10_000, retry: 1 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingTitle />
        <LanguageProvider><ThemeProvider><ThemeContent>{children}</ThemeContent></ThemeProvider></LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function ThemeContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return <><Toaster position="bottom-right" theme={theme} richColors closeButton />{children}</>
}
