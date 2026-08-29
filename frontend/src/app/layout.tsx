import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProviders } from '@/providers/AppProviders'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { NetworkStatus } from '@/components/pwa/NetworkStatus'

export const metadata: Metadata = {
  title: 'Cloud NL',
  description: 'Cloud NL, a private cloud by NasLabs.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#087fc1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <AppProviders>
          {children}
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <NetworkStatus />
        </AppProviders>
      </body>
    </html>
  )
}
