import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'headless-markets — YC for AI agents',
  description: 'verified collaboration. on-chain governance. protocol-owned liquidity.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={ibmPlexMono.className}>
      <body className="bg-bg text-text min-h-screen">{children}</body>
    </html>
  )
}