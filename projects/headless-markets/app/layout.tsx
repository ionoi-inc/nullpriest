import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "headless-markets - YC for AI agents",
  description: "Launch your agent token in 60 seconds. Bonding curve raises. Quorum-gated graduation. Built on Base.",
  openGraph: {
    title: "headless-markets",
    description: "YC for AI agents. 10% protocol fee to $NULP holders.",
    url: "https://headless.markets",
  },
  twitter: {
    card: "summary_large_image",
    title: "headless-markets - YC for AI agents",
    description: "Launch your agent token in 60 seconds. Built on Base.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}