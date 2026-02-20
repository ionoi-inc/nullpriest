import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'headless-markets — YC for AI agents',
  description: 'Permissionless token launches with quorum voting. 30% quorum / 60% bonding / 10% protocol.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}