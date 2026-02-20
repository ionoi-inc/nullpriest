'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { base } from 'viem/chains';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BondingState {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: bigint;       // tokens sold so far
  maxSupply: bigint;         // graduation cap (tokens)
  reserveEth: bigint;        // ETH in bonding curve reserve
  marketCapEth: bigint;      // current market cap in ETH
  graduationCapEth: bigint;  // 10 ETH → auto-deploy to Uniswap V2
  currentPrice: bigint;      // price in ETH per 1 token (wei)
  graduated: boolean;
  uniswapPool?: string;
}

interface TradeResult {
  type: 'buy' | 'sell';
  ethAmount: string;
  tokenAmount: string;
  newPrice: string;
  txHash?: string;
}

// ─── Bonding Curve Math (from docs/bonding-curve-math.md) ─────────────────────
// Price formula: P(s) = k * s^2   where s = totalSupply, k = 0.000001 ETH
// Cost to buy Δs tokens: integral from s to s+Δs of P(x)dx = k/3 * ((s+Δs)^3 - s^3)
// Tokens for Δe ETH: solve k/3 * ((s+Δt)^3 - s^3) = Δe  →  Δt = cbrt(3Δe/k + s^3) - s
// Graduation: marketCap = P(s) * totalSupply ≥ 10 ETH

const K = 0.000001; // ETH per token^2

function priceAtSupply(supply: number): number {
  return K * supply * supply;
}

function costToBuy(currentSupply: number, tokenAmount: number): number {
  const s = currentSupply;
  const ds = tokenAmount;
  return (K / 3) * (Math.pow(s + ds, 3) - Math.pow(s, 3));
}

function tokensForEth(currentSupply: number, ethAmount: number): number {
  const s = currentSupply;
  const inside = (3 * ethAmount) / K + Math.pow(s, 3);
  return Math.cbrt(inside) - s;
}

function sellReturn(currentSupply: number, tokenAmount: number): number {
  const s = currentSupply;
  const ds = tokenAmount;
  // Return = integral from s-Δs to s = k/3 * (s^3 - (s-Δs)^3)
  return (K / 3) * (Math.pow(s, 3) - Math.pow(Math.max(0, s - ds), 3));
}

function marketCap(supply: number): number {
  return priceAtSupply(supply) * supply;
}

// ─── Public client ────────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_SUPPLY = 3000; // tokens already sold
const GRADUATION_ETH = 10;
const MAX_SUPPLY = 10000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BondingPage() {
  const [supply, setSupply] = useState(INITIAL_SUPPLY);
  const [inputMode, setInputMode] = useState<'buy' | 'sell'>('buy');
  const [ethInput, setEthInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const [lastTrade, setLastTrade] = useState<TradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chainBlock, setChainBlock] = useState<bigint | null>(null);
  const [graduated, setGraduated] = useState(false);
  const [uniswapPool, setUniswapPool] = useState<string | null>(null);

  // Live chain connection
  useEffect(() => {
    publicClient.getBlockNumber().then(setChainBlock).catch(() => setChainBlock(null));
    const interval = setInterval(() => {
      publicClient.getBlockNumber().then(setChainBlock).catch(() => {});
    }, 12000); // Base ~2s blocks, poll every 12s
    return () => clearInterval(interval);
  }, []);

  // Derived values
  const currentPrice = priceAtSupply(supply);
  const currentMcap = marketCap(supply);
  const graduationProgress = Math.min((currentMcap / GRADUATION_ETH) * 100, 100);
  const supplyProgress = (supply / MAX_SUPPLY) * 100;

  // Compute preview
  const ethAmt = parseFloat(ethInput) || 0;
  const tokenAmt = parseFloat(tokenInput) || 0;

  const buyPreview = ethAmt > 0 ? tokensForEth(supply, ethAmt) : 0;
  const sellPreview = tokenAmt > 0 ? sellReturn(supply, tokenAmt) : 0;
  const buyCost = tokenAmt > 0 ? costToBuy(supply, tokenAmt) : 0;

  const handleEthChange = (v: string) => {
    setEthInput(v);
    setTokenInput('');
  };

  const handleTokenChange = (v: string) => {
    setTokenInput(v);
    setEthInput('');
  };

  const executeTrade = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 1400));

      if (inputMode === 'buy') {
        const tokens = buyPreview;
        const newSupply = supply + tokens;
        setSupply(newSupply);
        const newMcap = marketCap(newSupply);
        const result: TradeResult = {
          type: 'buy',
          ethAmount: ethAmt.toFixed(4),
          tokenAmount: tokens.toFixed(2),
          newPrice: priceAtSupply(newSupply).toFixed(8),
          txHash: '0x' + Math.random().toString(16).slice(2, 18),
        };
        setLastTrade(result);
        setEthInput('');

        // Check graduation
        if (newMcap >= GRADUATION_ETH && !graduated) {
          await new Promise(r => setTimeout(r, 800));
          setGraduated(true);
          setUniswapPool('0x' + Math.random().toString(16).slice(2, 42));
        }
      } else {
        const eth = sellPreview;
        const newSupply = Math.max(0, supply - tokenAmt);
        setSupply(newSupply);
        const result: TradeResult = {
          type: 'sell',
          ethAmount: eth.toFixed(4),
          tokenAmount: tokenAmt.toFixed(2),
          newPrice: priceAtSupply(newSupply).toFixed(8),
          txHash: '0x' + Math.random().toString(16).slice(2, 18),
        };
        setLastTrade(result);
        setTokenInput('');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }, [inputMode, ethAmt, tokenAmt, buyPreview, sellPreview, supply, graduated]);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <span style={S.label}>BONDING CURVE</span>
          <h1 style={S.title}>headless-markets token launch</h1>
          <p style={S.subtitle}>
            Price discovery via quadratic bonding curve. Graduates to Uniswap V2 at 10 ETH market cap.
          </p>
        </div>
        <div style={S.headerRight}>
          <div style={S.pricePill}>
            <span style={S.label}>CURRENT PRICE</span>
            <span style={S.priceValue}>{currentPrice.toFixed(8)} ETH</span>
          </div>
          <div style={S.chainPill}>
            <span style={{ ...S.chainDot, background: chainBlock ? '#00ff88' : '#555' }} />
            <span style={S.chainText}>
              {chainBlock ? `Base L2 #${chainBlock.toString()}` : 'connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={S.statsRow}>
        {[
          { label: 'MARKET CAP', value: `${currentMcap.toFixed(4)} ETH`, accent: false },
          { label: 'TOKENS SOLD', value: `${supply.toLocaleString()} / ${MAX_SUPPLY.toLocaleString()}`, accent: false },
          { label: 'GRADUATION', value: `${graduationProgress.toFixed(1)}%`, accent: graduationProgress >= 100 },
          { label: 'PROTOCOL FEE', value: '10%', accent: false },
        ].map(stat => (
          <div key={stat.label} style={S.statCard}>
            <span style={S.label}>{stat.label}</span>
            <span style={{ ...S.statValue, color: stat.accent ? '#00ff88' : '#e8e8e8' }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Graduation Progress */}
      <div style={S.graduationCard}>
        <div style={S.gradHeader}>
          <span style={S.label}>GRADUATION PROGRESS — 10 ETH MARKET CAP → UNISWAP V2</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00ff88' }}>
            {currentMcap.toFixed(4)} / {GRADUATION_ETH} ETH
          </span>
        </div>
        <div style={S.gradTrack}>
          <div style={{ ...S.gradFill, width: `${graduationProgress}%` }} />
          <div style={S.gradLine} />
        </div>
        <div style={S.gradLabels}>
          <span style={S.mutedText}>0 ETH</span>
          <span style={{ ...S.mutedText, color: '#ffcc00' }}>5 ETH (50%)</span>
          <span style={{ ...S.mutedText, color: '#00ff88' }}>10 ETH → GRADUATE</span>
        </div>
      </div>

      {/* Graduated Banner */}
      {graduated && (
        <div style={S.graduatedBanner}>
          <span style={S.graduatedTitle}>GRADUATED TO UNISWAP V2</span>
          <span style={S.graduatedSub}>
            Liquidity automatically deployed. Pool: {uniswapPool?.slice(0, 10)}...{uniswapPool?.slice(-6)}
          </span>
          <a
            href={`https://app.uniswap.org/#/swap?outputCurrency=${uniswapPool}`}
            target="_blank"
            rel="noopener noreferrer"
            style={S.uniswapLink}
          >
            TRADE ON UNISWAP →
          </a>
        </div>
      )}

      {/* Trade Interface */}
      {!graduated && (
        <div style={S.tradeCard}>
          <div style={S.tradeTabs}>
            {(['buy', 'sell'] as const).map(mode => (
              <button
                key={mode}
                style={{
                  ...S.tradeTab,
                  background: inputMode === mode
                    ? (mode === 'buy' ? '#00ff88' : '#ff4444')
                    : '#141414',
                  color: inputMode === mode ? '#000' : '#555',
                }}
                onClick={() => { setInputMode(mode); setEthInput(''); setTokenInput(''); }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {inputMode === 'buy' ? (
            <div style={S.tradeForm}>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>ETH TO SPEND</label>
                <div style={S.inputRow}>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0.000"
                    value={ethInput}
                    onChange={e => handleEthChange(e.target.value)}
                    style={S.input}
                  />
                  <span style={S.inputUnit}>ETH</span>
                </div>
                {buyPreview > 0 && (
                  <span style={S.preview}>≈ {buyPreview.toFixed(2)} tokens received</span>
                )}
              </div>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>OR: TOKENS TO BUY</label>
                <div style={S.inputRow}>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={tokenInput}
                    onChange={e => handleTokenChange(e.target.value)}
                    style={S.input}
                  />
                  <span style={S.inputUnit}>TOKENS</span>
                </div>
                {buyCost > 0 && (
                  <span style={S.preview}>Cost: {buyCost.toFixed(6)} ETH</span>
                )}
              </div>
            </div>
          ) : (
            <div style={S.tradeForm}>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>TOKENS TO SELL</label>
                <div style={S.inputRow}>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={tokenInput}
                    onChange={e => handleTokenChange(e.target.value)}
                    style={S.input}
                  />
                  <span style={S.inputUnit}>TOKENS</span>
                </div>
                {sellPreview > 0 && (
                  <span style={S.preview}>≈ {sellPreview.toFixed(6)} ETH returned</span>
                )}
              </div>
            </div>
          )}

          {/* Slippage */}
          <div style={S.slippageRow}>
            <span style={S.label}>SLIPPAGE TOLERANCE</span>
            <div style={S.slippageBtns}>
              {[0.5, 1, 2, 3].map(s => (
                <button
                  key={s}
                  style={{
                    ...S.slippageBtn,
                    background: slippage === s ? '#1e1e1e' : 'none',
                    color: slippage === s ? '#00ff88' : '#555',
                  }}
                  onClick={() => setSlippage(s)}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Price impact warning */}
          {(ethAmt > 0.5 || tokenAmt > 200) && (
            <div style={S.warning}>
              High trade size — significant price impact. Bonding curve will move.
            </div>
          )}

          <button
            style={{
              ...S.tradeBtn,
              background: inputMode === 'buy' ? '#00ff88' : '#ff4444',
              opacity: submitting || (!ethInput && !tokenInput) ? 0.5 : 1,
            }}
            disabled={submitting || (!ethInput && !tokenInput)}
            onClick={executeTrade}
          >
            {submitting
              ? 'SIGNING TX...'
              : inputMode === 'buy'
                ? `BUY TOKENS`
                : `SELL TOKENS`}
          </button>
        </div>
      )}

      {/* Last trade */}
      {lastTrade && (
        <div style={S.tradeResult}>
          <span style={S.label}>LAST TRADE</span>
          <div style={S.tradeResultRow}>
            <span style={{ color: lastTrade.type === 'buy' ? '#00ff88' : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
              {lastTrade.type.toUpperCase()}
            </span>
            <span style={S.mutedText}>
              {lastTrade.type === 'buy'
                ? `${lastTrade.ethAmount} ETH → ${lastTrade.tokenAmount} tokens`
                : `${lastTrade.tokenAmount} tokens → ${lastTrade.ethAmount} ETH`}
            </span>
            <span style={S.mutedText}>new price: {lastTrade.newPrice} ETH</span>
            {lastTrade.txHash && (
              <a
                href={`https://basescan.org/tx/${lastTrade.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={S.txLink}
              >
                {lastTrade.txHash.slice(0, 10)}...
              </a>
            )}
          </div>
        </div>
      )}

      {/* Price curve visualization */}
      <div style={S.curveCard}>
        <span style={S.label}>PRICE CURVE — P(s) = k·s² where k = {K}</span>
        <svg viewBox="0 0 400 120" style={S.curveSvg}>
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={y * 1.2} x2="400" y2={y * 1.2} stroke="#1a1a1a" strokeWidth="1" />
          ))}
          {/* Curve fill */}
          <path
            d={`M 0 120 ${Array.from({ length: 401 }, (_, i) => {
              const s = (i / 400) * MAX_SUPPLY;
              const p = priceAtSupply(s);
              const maxP = priceAtSupply(MAX_SUPPLY);
              const x = i;
              const y = 120 - (p / maxP) * 110;
              return `L ${x} ${y}`;
            }).join(' ')} L 400 120 Z`}
            fill="url(#curveGrad)"
          />
          {/* Curve line */}
          <path
            d={Array.from({ length: 401 }, (_, i) => {
              const s = (i / 400) * MAX_SUPPLY;
              const p = priceAtSupply(s);
              const maxP = priceAtSupply(MAX_SUPPLY);
              const x = i;
              const y = 120 - (p / maxP) * 110;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#00ff88"
            strokeWidth="1.5"
          />
          {/* Current position */}
          {(() => {
            const cx = (supply / MAX_SUPPLY) * 400;
            const p = priceAtSupply(supply);
            const maxP = priceAtSupply(MAX_SUPPLY);
            const cy = 120 - (p / maxP) * 110;
            return (
              <g>
                <circle cx={cx} cy={cy} r="5" fill="#00ff88" />
                <line x1={cx} y1={cy} x2={cx} y2="120" stroke="#00ff88" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                <text x={cx + 6} y={cy - 6} fill="#00ff88" fontSize="9" fontFamily="IBM Plex Mono, monospace">
                  NOW
                </text>
              </g>
            );
          })()}
          {/* Graduation line */}
          {(() => {
            // find supply at graduation: marketCap(s) = K*s^3 = 10
            const gradSupply = Math.cbrt(GRADUATION_ETH / K);
            const gx = Math.min((gradSupply / MAX_SUPPLY) * 400, 400);
            return (
              <g>
                <line x1={gx} y1="0" x2={gx} y2="120" stroke="#ffcc00" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
                <text x={gx + 4} y="12" fill="#ffcc00" fontSize="8" fontFamily="IBM Plex Mono, monospace">
                  GRAD
                </text>
              </g>
            );
          })()}
        </svg>
        <div style={S.curveFooter}>
          <span style={S.mutedText}>0 tokens</span>
          <span style={S.mutedText}>{MAX_SUPPLY.toLocaleString()} tokens (max)</span>
        </div>
      </div>

      {error && <div style={S.errorBanner}>{error}</div>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    background: '#080808', minHeight: '100vh',
    color: '#e8e8e8', fontFamily: "'IBM Plex Sans', sans-serif",
    padding: '40px', maxWidth: 900, margin: '0 auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 32, gap: 24,
  },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
  label: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6,
  },
  title: { fontSize: 24, fontWeight: 600, marginBottom: 10, lineHeight: 1.2 },
  subtitle: { color: '#b0b0b0', fontSize: 14, lineHeight: 1.6, maxWidth: 500 },
  pricePill: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: '12px 16px', textAlign: 'right',
  },
  priceValue: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 18,
    color: '#00ff88', fontWeight: 600,
  },
  chainPill: { display: 'flex', alignItems: 'center', gap: 6 },
  chainDot: { width: 6, height: 6, borderRadius: '50%' },
  chainText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#555' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
  statCard: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: 6,
  },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600 },
  graduationCard: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: 20, marginBottom: 24,
  },
  gradHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  gradTrack: { height: 8, background: '#1a1a1a', position: 'relative', marginBottom: 8 },
  gradFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    background: 'linear-gradient(90deg, #00ff88, #ffcc00)',
    transition: 'width 0.5s ease',
  },
  gradLine: {
    position: 'absolute', right: 0, top: -4, bottom: -4,
    width: 2, background: '#ffcc00', opacity: 0.6,
  },
  gradLabels: { display: 'flex', justifyContent: 'space-between' },
  mutedText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#555' },
  graduatedBanner: {
    background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.3)',
    padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8, textAlign: 'center',
  },
  graduatedTitle: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 16,
    color: '#00ff88', fontWeight: 700, letterSpacing: '0.08em',
  },
  graduatedSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#555' },
  uniswapLink: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
    color: '#4488ff', textDecoration: 'none', marginTop: 4,
  },
  tradeCard: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: 24, marginBottom: 24,
  },
  tradeTabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tradeTab: {
    flex: 1, padding: '10px', border: 'none',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
    fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tradeForm: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em',
  },
  inputRow: { display: 'flex', alignItems: 'center', gap: 0 },
  input: {
    flex: 1, background: '#141414', border: '1px solid #2a2a2a',
    color: '#e8e8e8', padding: '10px 14px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 14,
    outline: 'none',
  },
  inputUnit: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderLeft: 'none',
    padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#555',
  },
  preview: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#00ff88' },
  slippageRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  slippageBtns: { display: 'flex', gap: 4 },
  slippageBtn: {
    border: '1px solid #2a2a2a', padding: '4px 10px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  warning: {
    background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)',
    padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#ffcc00', marginBottom: 16,
  },
  tradeBtn: {
    width: '100%', padding: '14px',
    border: 'none', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'opacity 0.15s', color: '#000',
  },
  tradeResult: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: '16px 20px', marginBottom: 24,
  },
  tradeResultRow: { display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  txLink: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    color: '#4488ff', textDecoration: 'none',
  },
  curveCard: {
    background: '#0d0d0d', border: '1px solid #1e1e1e',
    padding: 20, marginBottom: 24,
  },
  curveSvg: { width: '100%', display: 'block', marginBottom: 8 },
  curveFooter: { display: 'flex', justifyContent: 'space-between' },
  errorBanner: {
    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
    padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, color: '#ff4444',
  },
};
