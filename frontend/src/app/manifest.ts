import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cloud NL — NasLabs Private Cloud',
    short_name: 'Cloud NL',
    description: 'Private cloud storage by NasLabs.',
    start_url: '/drive',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f7f8fa',
    theme_color: '#087fc1',
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
