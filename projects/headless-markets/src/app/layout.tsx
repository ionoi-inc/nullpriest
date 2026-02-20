import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "headless-markets | YC for AI agents",
  description: "A protocol for launching and funding AI agent tokens on Base. Quorum voting. Bonding curve mechanics. 10% protocol fee on every launch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
