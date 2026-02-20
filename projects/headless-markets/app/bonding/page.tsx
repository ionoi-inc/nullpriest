'use client';

/**
 * app/bonding/page.tsx — headless-markets bonding curve UI
 * Issue #53: bonding curve contract interactions
 *
 * Displays live price discovery, buy/sell interface, graduation progress.
 * Reads on-chain state from Base L2. Uses wagmi + viem.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  spotPrice,
  buyQuote,
  sellQuote,
  marketCap,
  graduationProgress,
  tokensForEth,
  splitFunds,
  fmtEth,
  fmtTokens,
  fmtUsd,
  GRADUATION_CAP,
} from '../../lib/bondingCurve';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChainState {
  supply: number;
  reserveEth: number;
  graduated: boolean;
  loading: boolean;
  error: string | null;
}

interface TradeQuote {
  ethAmount: number;
  tokenAmount: number;
  priceImpact: number;
  protocolFee: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────────

const ETH_PRICE_USD = 3400;
const BONDING_CONTRACT = '0x0000000000000000000000000000000000000000'; // TODO: deploy
const BASE_CHAIN_ID = 8453;

// ── Hook: on-chain state ────────────────────────────────────────────────────────────

function useBondingState(): ChainState {
  const [state, setState] = useState<ChainState>({
    supply: 0,
    reserveEth: 0,
    graduated: false,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    try {
      // TODO: replace with wagmi useReadContract once contract deployed
      await new Promise((r) => setTimeout(r, 600));
      setState({
        supply: 24_380,
        reserveEth: 5.31,
        graduated: false,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return state;
}

// ── Sub-components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: '#0d0d0d', border: `1px solid ${accent ? '#00ff8833' : '#1e1e1e'}`, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ? '#00ff88' : '#e8e8e8', fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function GraduationBar({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#777', fontFamily: 'IBM Plex Mono, monospace' }}>GRADUATION PROGRESS</span>
        <span style={{ fontSize: 12, color: pct >= 80 ? '#00ff88' : '#b0b0b0', fontFamily: 'IBM Plex Mono, monospace' }}>
          {pct}% — {fmtEth(progress * GRADUATION_CAP)} / {GRADUATION_CAP} ETH
        </span>
      </div>
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#00ff88' : pct >= 50 ? '#44aaff' : '#555', transition: 'width 0.6s ease', borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
        Graduates to Uniswap V2 at {GRADUATION_CAP} ETH market cap. Protocol collects 10% fee on every trade.
      </div>
    </div>
  );
}

function FundSplit({ ethIn }: { ethIn: number }) {
  if (ethIn <= 0) return null;
  const split = splitFunds(ethIn);
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px 16px', marginTop: 12, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ color: '#555', marginBottom: 8 }}>FUND SPLIT</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b0b0b0', marginBottom: 4 }}>
        <span>Bonding pool (liquidity)</span><span style={{ color: '#44aaff' }}>{fmtEth(split.bondingPool, 4)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b0b0b0', marginBottom: 4 }}>
        <span>Quorum pool (locked)</span><span style={{ color: '#aa88ff' }}>{fmtEth(split.quorumPool, 4)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b0b0b0' }}>
        <span>Protocol fee (nullpriest)</span><span style={{ color: '#00ff88' }}>{fmtEth(split.protocolFee, 4)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────────

export default function BondingPage() {
  const chain = useBondingState();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [ethInput, setEthInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const supply = chain.supply;
  const price = spotPrice(supply);
  const cap = marketCap(supply);
  const progress = graduationProgress(supply);

  useEffect(() => {
    if (chain.loading) return;
    try {
      if (mode === 'buy' && ethInput) {
        const eth = parseFloat(ethInput);
        if (isNaN(eth) || eth <= 0) { setQuote(null); return; }
        const tokens = tokensForEth(supply, eth);
        const impact = (eth / chain.reserveEth) * 100;
        const fee = eth * 0.10;
        setQuote({ ethAmount: eth, tokenAmount: tokens, priceImpact: impact, protocolFee: fee });
        setTokenInput(fmtTokens(tokens));
      } else if (mode === 'sell' && tokenInput) {
        const raw = tokenInput.replace(/[KMkm]/g, '');
        const mult = tokenInput.toUpperCase().endsWith('M') ? 1e6 : tokenInput.toUpperCase().endsWith('K') ? 1e3 : 1;
        const tokens = parseFloat(raw) * mult;
        if (isNaN(tokens) || tokens <= 0) { setQuote(null); return; }
        const eth = sellQuote(supply, tokens);
        const impact = (tokens / supply) * 100;
        const fee = eth * 0.10;
        setQuote({ ethAmount: eth, tokenAmount: tokens, priceImpact: impact, protocolFee: fee });
        setEthInput(eth.toFixed(4));
      } else {
        setQuote(null);
      }
    } catch { setQuote(null); }
  }, [ethInput, tokenInput, mode, supply, chain.reserveEth, chain.loading]);

  const handleTrade = async () => {
    if (!quote || chain.graduated) return;
    setTxStatus('pending');
    // TODO: wagmi writeContract — buy(uint256 minTokens) or sell(uint256 tokenAmount)
    await new Promise((r) => setTimeout(r, 1800));
    setTxStatus('success');
    setTimeout(() => setTxStatus('idle'), 3000);
  };

  const clearInputs = () => { setEthInput(''); setTokenInput(''); setQuote(null); };

  if (chain.loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#555', fontSize: 13 }}>loading chain state...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <a href="/" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#555', textDecoration: 'none' }}>← nullpriest</a>
          <span style={{ color: '#333', margin: '0 8px' }}>/</span>
          <a href="/headless-markets" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#555', textDecoration: 'none' }}>headless-markets</a>
          <span style={{ color: '#333', margin: '0 8px' }}>/</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#b0b0b0' }}>bonding</span>
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: chain.graduated ? '#00ff88' : '#ffcc00' }}>
          {chain.graduated ? '✓ GRADUATED → UNISWAP V2' : '● BONDING CURVE ACTIVE'}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
            headless-markets — token launch
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em', margin: 0, color: '#e8e8e8' }}>Bonding Curve</h1>
          <p style={{ color: '#777', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
            Linear bonding curve on Base L2. Buy early, price rises with supply. Protocol earns 10% on every trade. Graduates to Uniswap V2 at {GRADUATION_CAP} ETH market cap.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <StatCard label="Current Price" value={fmtEth(price, 5)} sub={fmtUsd(price, ETH_PRICE_USD)} accent />
          <StatCard label="Market Cap" value={fmtEth(cap, 3)} sub={fmtUsd(cap, ETH_PRICE_USD)} />
          <StatCard label="Total Supply" value={fmtTokens(supply)} sub="tokens minted" />
          <StatCard label="Reserve" value={fmtEth(chain.reserveEth, 3)} sub="ETH in curve" />
        </div>

        <GraduationBar progress={progress} />

        {chain.graduated ? (
          <div style={{ marginTop: 40, padding: '32px', background: '#0d0d0d', border: '1px solid #00ff8833', textAlign: 'center' }}>
            <div style={{ color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, marginBottom: 8 }}>TOKEN GRADUATED</div>
            <div style={{ color: '#777', fontSize: 13 }}>Trading has moved to Uniswap V2 on Base. <a href="#" style={{ color: '#44aaff' }}>Trade on Uniswap →</a></div>
          </div>
        ) : (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Trade</div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #1e1e1e', width: 'fit-content' }}>
              {(['buy', 'sell'] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); clearInputs(); }}
                  style={{ padding: '10px 28px', background: mode === m ? (m === 'buy' ? '#00ff8815' : '#ff444415') : 'transparent', border: 'none', color: mode === m ? (m === 'buy' ? '#00ff88' : '#ff4444') : '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s' }}>
                  {m}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
              {mode === 'buy' ? (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 6 }}>ETH TO SPEND</label>
                    <div style={{ position: 'relative' }}>
                      <input type="number" min="0" step="0.01" placeholder="0.0" value={ethInput}
                        onChange={(e) => { setEthInput(e.target.value); setTokenInput(''); }}
                        style={{ width: '100%', padding: '14px 60px 14px 16px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#e8e8e8', fontSize: 18, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>ETH</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 6 }}>TOKENS RECEIVED (EST.)</label>
                    <div style={{ padding: '14px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, color: quote ? '#00ff88' : '#333' }}>{tokenInput || '—'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 6 }}>TOKENS TO SELL</label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" placeholder="0" value={tokenInput}
                        onChange={(e) => { setTokenInput(e.target.value); setEthInput(''); }}
                        style={{ width: '100%', padding: '14px 80px 14px 16px', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#e8e8e8', fontSize: 18, fontFamily: 'IBM Plex Mono, monospace', outline: 'none', boxSizing: 'border-box' }} />
                      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>TOKENS</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 6 }}>ETH RETURNED (EST.)</label>
                    <div style={{ padding: '14px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, color: quote ? '#ff4444' : '#333' }}>{ethInput || '—'}</div>
                  </div>
                </>
              )}

              {quote && (
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '12px 16px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', marginBottom: 4 }}>
                    <span>Price impact</span>
                    <span style={{ color: quote.priceImpact > 5 ? '#ff4444' : '#b0b0b0' }}>{quote.priceImpact.toFixed(2)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777' }}>
                    <span>Protocol fee (10%)</span>
                    <span style={{ color: '#00ff88' }}>{fmtEth(quote.protocolFee, 4)}</span>
                  </div>
                </div>
              )}

              {mode === 'buy' && quote && <FundSplit ethIn={quote.ethAmount} />}

              <button onClick={handleTrade} disabled={!quote || txStatus === 'pending'}
                style={{ padding: '16px', background: !quote || txStatus === 'pending' ? '#1a1a1a' : mode === 'buy' ? '#00ff88' : '#ff4444', color: !quote || txStatus === 'pending' ? '#555' : '#000', border: 'none', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', cursor: quote && txStatus === 'idle' ? 'pointer' : 'not-allowed', textTransform: 'uppercase', transition: 'all 0.15s', marginTop: 4 }}>
                {txStatus === 'pending' ? 'CONFIRMING...' : txStatus === 'success' ? '✓ TRADE CONFIRMED' : mode === 'buy' ? 'BUY TOKENS' : 'SELL TOKENS'}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid #1a1a1a', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Contract</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>{BONDING_CONTRACT}</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Base L2 · Chain ID {BASE_CHAIN_ID}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Curve Formula</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#555' }}>price(s) = 0.001 + 0.0001 × s</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Linear · always liquid · no rug</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Revenue</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00ff88' }}>10% protocol fee</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Every buy + sell → nullpriest treasury</div>
          </div>
        </div>
      </div>
    </main>
  );
}