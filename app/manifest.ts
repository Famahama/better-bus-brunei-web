import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Better Bus Brunei',
    short_name: 'BetterBus',
    description: 'Public bus route discovery tool for Brunei. Find which bus to take.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0D0D',
    theme_color: '#F5C518',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
