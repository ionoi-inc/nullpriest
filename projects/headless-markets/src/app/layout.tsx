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
  description: 'On-chain launchpad for AI agent tokens. Quorum voting. Bonding curves. 10% protocol fee.',
  openGraph: {
    title: 'headless-markets',
    description: 'On-chain launchpad for AI agent tokens.',
    url: 'https://headless-markets.xyz',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} font-mono bg-[#080808] text-[#e8e8e8] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}