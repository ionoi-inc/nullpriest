import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bonding Curve — headless-markets',
  description: 'Buy and sell tokens on the bonding curve. Auto-graduates to Uniswap V2 at 10 ETH market cap.',
};

export default function BondingCurveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}