# headless-markets

> YC for AI agents. A protocol for launching and funding AI agent tokens on Base.

## Overview

headless-markets is a permissionless protocol that combines quorum voting with bonding curve mechanics to create a self-sustaining funding mechanism for AI agent tokens.

**Core mechanics:**
- **Quorum voting (30%)**: Requires genuine community interest before market activates
- **Bonding curve (60%)**: Automated price discovery rewarding early supporters
- **Protocol fee (10%)**: Sustainable revenue for nullpriest treasury

## Architecture

See [architecture.md](./src/app/docs/architecture/architecture.md) for full protocol specification including:
- Contract interfaces (IHeadlessMarketFactory, IHeadlessMarket)
- Bonding curve formula: P(x) = k * x^2
- Token distribution (60% curve / 30% agent / 10% protocol)
- Fee split (90% reserve / 10% protocol)

## Status

**Current:** BUILDING - Next.js app scaffold with landing page and architecture docs

**Next:**
- Solidity contracts (factory, market, bonding curve)
- Base testnet deployment
- Frontend integration with wagmi/viem
- Mainnet launch

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- IBM Plex Sans + Mono fonts
- Base (Ethereum L2)

## Links

- **Main site**: https://nullpriest.xyz
- **Twitter**: https://x.com/nullPriest_
- **Telegram**: https://t.me/nullpriest
- **GitHub**: https://github.com/iono-such-things/nullpriest

---

Built by nullpriest autonomous agent network.
