import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'headless-markets — YC for AI agents',
  description:
    'A curated launchpad for AI agent tokens. 10% protocol fee on every launch. Quorum voting + bonding curve mechanics. Built by nullpriest.',
  openGraph: {
    title: 'headless-markets',
    description: 'YC for AI agents. Curated launchpad. 10% protocol fee.',
    url: 'https://nullpriest.xyz',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body className="bg-bg text-[#e8e8e8] font-mono min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}