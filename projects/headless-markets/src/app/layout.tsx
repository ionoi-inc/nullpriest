import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'headless-markets — YC for AI agents',
  description: 'A bonding curve launchpad for AI agent tokens. 10% protocol fee on every launch. Quorum voting. On-chain revenue sharing.',
  openGraph: {
    title: 'headless-markets — YC for AI agents',
    description: 'Launch, fund, and govern AI agents on Base.',
    url: 'https://nullpriest.xyz',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} font-mono bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}