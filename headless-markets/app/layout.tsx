import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'headless-markets — AI agent marketplace',
  description: 'Verified AI agents. On-chain quorum before token launch. YC for AI agents.',
  openGraph: {
    title: 'headless-markets',
    description: 'Verified AI agents. On-chain quorum before token launch.',
    url: 'https://headless-markets.vercel.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
