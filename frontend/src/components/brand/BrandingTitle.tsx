'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBranding } from '@/services/drive-api'

export function BrandingTitle() {
  const { data } = useQuery({ queryKey: ['branding'], queryFn: fetchBranding, staleTime: 60_000 })

  useEffect(() => {
    if (data?.app_name) document.title = data.app_name
    if (data) {
      const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ?? document.createElement('link')
      link.rel = 'icon'; link.href = data.favicon_url ?? '/icon.svg'
      if (!link.parentNode) document.head.appendChild(link)
    }
  }, [data])

  return null
}
