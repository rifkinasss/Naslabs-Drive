'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchBranding } from '@/services/drive-api'

type BrandMarkProps = {
  className?: string
  title?: string
}

export function BrandMark({ className = 'w-6 h-6', title = 'Cloud NL' }: BrandMarkProps) {
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: fetchBranding, staleTime: 60_000 })
  if (branding?.logo_url) return <img src={branding.logo_url} className={className} alt={branding.app_name || title} />

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.6 37.5h20.1a8.8 8.8 0 0 0 1.7-17.43A12.1 12.1 0 0 0 13 16.8a9.9 9.9 0 0 0 1.6 20.7Z"
        fill="#0284C7"
      />
      <path d="M17 29.2h5.2l-3.8 4.1h4.2" stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28.2 33.3v-8.1m0 0h4.5m-4.5 4.1h3.8" stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
