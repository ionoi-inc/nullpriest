'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';

// ── Bonding curve math (linear: price = BASE + SLOPE * supply) ──────────────
// From docs/bonding-curve-math.md:
//   price(s) = BASE_PRICE + SLOPE * s
//   cost(s1→s2) = integral = BASE_PRICE*(s2-s1) + SLOPE/2*(s2²-s1²)
//   graduation at marketCap = 10 ETH → totalSupply * price(supply) >= 10 ETH
const BASE_PRICE = 0.000001;   // ETH per token at supply=0
const SLOPE      = 0.000000001; // ETH per token² (linear growth)
const GRAD_ETH   = 10;          // ETH market cap for graduation

function priceAtSupply(supply: number): number {
  return BASE_PRICE + SLOPE * supply;
}

function costToBuy(currentSupply: number, amount: number): number {
  const s1 = currentSupply;
  const s2 = currentSupply + amount;
  return BASE_PRICE * (s2 - s1) + (SLOPE / 2) * (s2 * s2 - s1 * s1);
}

function proceedsFromSell(currentSupply: number, amount: number): number {
  const s1 = currentSupply - amount;
  const s2 = currentSupply;
  return BASE_PRICE * (s2 - s1) + (SLOPE / 2) * (s2 * s2 - s1 * s1);
}

function marketCapEth(supply: number): number {
  return supply * priceAtSupply(supply);
}

function graduationProgress(supply: number): number {
  return Math.min((marketCapEth(supply) / GRAD_ETH) * 100, 100);
}

// ── Minimal ABI for BondingCurve contract ───────────────────────────────────
const BONDING_CURVE_ABI = [
  { name: 'buy',          type: 'function', stateMutability: 'payable',    inputs: [{ name: 'minOut', type: 'uint256' }],                         outputs: [{ name: '', type: 'uint256' }] },
  { name: 'sell',         type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'minEth', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalSupply',  type: 'function', stateMutability: 'view',       inputs: [],                                                             outputs: [{ name: '', type: 'uint256' }] },
  { name: 'graduated',    type: 'function', stateMutability: 'view',       inputs: [],                                                             outputs: [{ name: '', type: 'bool'    }] },
  { name: 'getPrice',     type: 'function', stateMutability: 'view',       inputs: [],                                                             outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getCost',      type: 'function', stateMutability: 'view',       inputs: [{ name: 'amount', type: 'uint256' }],                          outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getProceeds',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'amount', type: 'uint256' }],                          outputs: [{ name: '', type: 'uint256' }] },
  {
    name: 'TokenPurchased', type: 'event',
    inputs: [
      { name: 'buyer',  type: 'address', indexed: true  },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'cost',   type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'TokenSold', type: 'event',
    inputs: [
      { name: 'seller',   type: 'address', indexed: true  },
      { name: 'amount',   type: 'uint256', indexed: false },
      { name: 'proceeds', type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'Graduated', type: 'event',
    inputs: [
      { name: 'uniswapPool', type: 'address', indexed: true },
      { name: 'liquidity',   type: 'uint256', indexed: false },
    ]
  },
] as const;

// Contract address on Base L2 — set via env
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ── Types ────────────────────────────────────────────────────────────────────
interface CurveState {
  supply: number;
  price: number;
  marketCap: number;
  gradProgress: number;
  graduated: boolean;
  loading: boolean;
}

interface TxState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BondingCurvePage() {
  const { address, isConnected } = useAccount();
  const publicClient  = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [curve, setCurve]   = useState<CurveState>({
    supply: 0, price: BASE_PRICE, marketCap: 0,
    gradProgress: 0, graduated: false, loading: true,
  });
  const [mode,    setMode]  = useState<'buy' | 'sell'>('buy');
  const [amount,  setAmount] = useState('');
  const [preview, setPreview] = useState<{ eth: number; slippage: number } | null>(null);
  const [tx,      setTx]    = useState<TxState>({ status: 'idle' });

  // ── Fetch on-chain state ──────────────────────────────────────────────────
  const fetchCurveState = useCallback(async () => {
    if (!publicClient) return;
    try {
      const [supplyRaw, graduatedRaw, priceRaw] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'totalSupply' }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'graduated' }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getPrice' }),
      ]);
      const supply = Number(formatUnits(supplyRaw as bigint, 18));
      const price  = Number(formatEther(priceRaw as bigint));
      setCurve({
        supply,
        price,
        marketCap:   supply * price,
        gradProgress: Math.min((supply * price / GRAD_ETH) * 100, 100),
        graduated:   graduatedRaw as boolean,
        loading:     false,
      });
    } catch {
      // Fallback to local math if contract not yet deployed
      setCurve(prev => ({ ...prev, loading: false }));
    }
  }, [publicClient]);

  useEffect(() => {
    fetchCurveState();
    const interval = setInterval(fetchCurveState, 15_000);
    return () => clearInterval(interval);
  }, [fetchCurveState]);

  // ── Preview calculation ───────────────────────────────────────────────────
  useEffect(() => {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setPreview(null); return; }
    if (mode === 'buy') {
      const eth = costToBuy(curve.supply, n);
      setPreview({ eth, slippage: eth * 0.005 }); // 0.5% slippage buffer
    } else {
      const eth = proceedsFromSell(curve.supply, n);
      setPreview({ eth, slippage: eth * 0.005 });
    }
  }, [amount, mode, curve.supply]);

  // ── Transactions ──────────────────────────────────────────────────────────
  async function handleBuy() {
    if (!walletClient || !publicClient || !preview) return;
    const tokenAmount = parseEther(amount);
    const ethCost     = parseEther(preview.eth.toFixed(18));
    const minOut      = tokenAmount * 995n / 1000n; // 0.5% slippage
    setTx({ status: 'pending' });
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi:     BONDING_CURVE_ABI,
        functionName: 'buy',
        args:    [minOut],
        value:   ethCost + parseEther(preview.slippage.toFixed(18)),
      });
      setTx({ status: 'success', hash });
      await publicClient.waitForTransactionReceipt({ hash });
      fetchCurveState();
    } catch (e: unknown) {
      setTx({ status: 'error', error: e instanceof Error ? e.message : 'Transaction failed' });
    }
  }

  async function handleSell() {
    if (!walletClient || !publicClient || !preview) return;
    const tokenAmount = parseEther(amount);
    const minEth      = parseEther((preview.eth * 0.995).toFixed(18));
    setTx({ status: 'pending' });
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi:     BONDING_CURVE_ABI,
        functionName: 'sell',
        args:    [tokenAmount, minEth],
      });
      setTx({ status: 'success', hash });
      await publicClient.waitForTransactionReceipt({ hash });
      fetchCurveState();
    } catch (e: unknown) {
      setTx({ status: 'error', error: e instanceof Error ? e.message : 'Transaction failed' });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bonding-curve-page">
      {/* Header */}
      <div className="bc-header">
        <h1>Bonding Curve</h1>
        <p className="bc-subtitle">
          Linear price discovery. Graduates to Uniswap V2 at 10 ETH market cap.
        </p>
      </div>

      {/* Graduated Banner */}
      {curve.graduated && (
        <div className="bc-graduated-banner">
          <span className="grad-icon">🎓</span>
          <div>
            <strong>Token Graduated!</strong>
            <p>Liquidity has been deployed to Uniswap V2. Trade there for full liquidity.</p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="bc-stats">
        <div className="bc-stat">
          <label>Current Price</label>
          <value>{curve.loading ? '...' : `${curve.price.toFixed(8)} ETH`}</value>
        </div>
        <div className="bc-stat">
          <label>Market Cap</label>
          <value>{curve.loading ? '...' : `${curve.marketCap.toFixed(4)} ETH`}</value>
        </div>
        <div className="bc-stat">
          <label>Total Supply</label>
          <value>{curve.loading ? '...' : curve.supply.toLocaleString()}</value>
        </div>
        <div className="bc-stat">
          <label>Graduation</label>
          <value>{curve.loading ? '...' : `${curve.gradProgress.toFixed(1)}%`}</value>
        </div>
      </div>

      {/* Graduation Progress Bar */}
      <div className="bc-graduation">
        <div className="grad-bar-header">
          <span>Graduation Progress</span>
          <span>{curve.gradProgress.toFixed(2)}% of 10 ETH</span>
        </div>
        <div className="grad-bar-track">
          <div
            className="grad-bar-fill"
            style={{ width: `${curve.gradProgress}%` }}
          />
        </div>
        <p className="grad-note">
          At 10 ETH market cap, {(GRAD_ETH - curve.marketCap).toFixed(4)} ETH remaining.
          Liquidity auto-deploys to Uniswap V2.
        </p>
      </div>

      {/* Trade Interface */}
      {!curve.graduated && (
        <div className="bc-trade">
          {/* Mode Toggle */}
          <div className="bc-mode-toggle">
            <button
              className={mode === 'buy' ? 'active' : ''}
              onClick={() => { setMode('buy'); setAmount(''); setTx({ status: 'idle' }); }}
            >
              Buy
            </button>
            <button
              className={mode === 'sell' ? 'active' : ''}
              onClick={() => { setMode('sell'); setAmount(''); setTx({ status: 'idle' }); }}
            >
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div className="bc-input-group">
            <label>Token Amount</label>
            <div className="bc-input-row">
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setTx({ status: 'idle' }); }}
              />
              <span className="bc-input-unit">NULP</span>
            </div>
            {/* Quick amounts */}
            <div className="bc-quick-amounts">
              {['100', '1000', '10000', '100000'].map(v => (
                <button key={v} onClick={() => setAmount(v)}>{Number(v).toLocaleString()}</button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bc-preview">
              <div className="preview-row">
                <span>{mode === 'buy' ? 'You pay' : 'You receive'}</span>
                <strong>{preview.eth.toFixed(6)} ETH</strong>
              </div>
              <div className="preview-row muted">
                <span>Slippage buffer (0.5%)</span>
                <span>{preview.slippage.toFixed(6)} ETH</span>
              </div>
              <div className="preview-row muted">
                <span>Price per token</span>
                <span>{(preview.eth / parseFloat(amount)).toFixed(8)} ETH</span>
              </div>
              <div className="preview-row muted">
                <span>New market cap</span>
                <span>
                  {mode === 'buy'
                    ? marketCapEth(curve.supply + parseFloat(amount)).toFixed(4)
                    : marketCapEth(curve.supply - parseFloat(amount)).toFixed(4)
                  } ETH
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isConnected ? (
            <div className="bc-connect-prompt">
              Connect wallet to trade
            </div>
          ) : (
            <button
              className={`bc-action-btn ${mode}`}
              disabled={!preview || tx.status === 'pending'}
              onClick={mode === 'buy' ? handleBuy : handleSell}
            >
              {tx.status === 'pending'
                ? 'Confirming...'
                : mode === 'buy'
                  ? `Buy ${amount || '0'} NULP`
                  : `Sell ${amount || '0'} NULP`
              }
            </button>
          )}

          {/* Tx Status */}
          {tx.status === 'success' && tx.hash && (
            <div className="bc-tx-success">
              Transaction confirmed.{' '}
              <a
                href={`https://basescan.org/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on BaseScan →
              </a>
            </div>
          )}
          {tx.status === 'error' && (
            <div className="bc-tx-error">{tx.error}</div>
          )}
        </div>
      )}

      {/* Price curve visualization (ASCII-style) */}
      <div className="bc-curve-viz">
        <h3>Price Curve</h3>
        <p className="viz-note">Linear bonding curve — price increases with every buy</p>
        <div className="curve-chart">
          {Array.from({ length: 20 }, (_, i) => {
            const s = (curve.supply / 20) * (i + 1);
            const p = priceAtSupply(s);
            const maxP = priceAtSupply(curve.supply * 1.5 || 1000000);
            const h = Math.max(4, (p / maxP) * 80);
            const isCurrent = i === 19;
            return (
              <div
                key={i}
                className={`curve-bar ${isCurrent ? 'current' : ''}`}
                style={{ height: `${h}px` }}
                title={`Supply: ${s.toFixed(0)}, Price: ${p.toFixed(8)} ETH`}
              />
            );
          })}
        </div>
        <div className="curve-labels">
          <span>0</span>
          <span>Current Supply: {curve.supply.toLocaleString()}</span>
        </div>
      </div>

      {/* How it works */}
      <div className="bc-explainer">
        <h3>How It Works</h3>
        <div className="explainer-grid">
          <div className="explainer-card">
            <span className="card-num">01</span>
            <h4>Linear Price Discovery</h4>
            <p>Price increases linearly with supply. Early buyers get lower prices. Formula: price = {BASE_PRICE} + {SLOPE} × supply</p>
          </div>
          <div className="explainer-card">
            <span className="card-num">02</span>
            <h4>Always Liquid</h4>
            <p>The contract holds ETH reserves. You can always sell back at the current curve price. No slippage from orderbooks.</p>
          </div>
          <div className="explainer-card">
            <span className="card-num">03</span>
            <h4>Graduation at 10 ETH</h4>
            <p>When market cap hits 10 ETH, the contract automatically deploys liquidity to Uniswap V2 and locks it permanently.</p>
          </div>
        </div>
      </div>

      <style>{`
        .bonding-curve-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 24px;
          font-family: 'IBM Plex Sans', sans-serif;
          color: #e8e8e8;
        }
        .bc-header { margin-bottom: 32px; }
        .bc-header h1 {
          font-size: 28px; font-weight: 600;
          color: #00ff88; margin-bottom: 8px;
        }
        .bc-subtitle { color: #777; font-size: 14px; }

        .bc-graduated-banner {
          display: flex; align-items: center; gap: 16px;
          background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.3);
          padding: 20px; margin-bottom: 32px;
        }
        .bc-graduated-banner strong { color: #00ff88; display: block; margin-bottom: 4px; }
        .bc-graduated-banner p { color: #b0b0b0; font-size: 13px; margin: 0; }

        .bc-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-bottom: 32px;
        }
        @media (max-width: 600px) { .bc-stats { grid-template-columns: repeat(2, 1fr); } }
        .bc-stat {
          background: #0d0d0d; border: 1px solid #1e1e1e;
          padding: 16px; 
        }
        .bc-stat label { display: block; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
        .bc-stat value { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 14px; color: #e8e8e8; }

        .bc-graduation { margin-bottom: 40px; }
        .grad-bar-header {
          display: flex; justify-content: space-between;
          font-size: 12px; color: #777; margin-bottom: 8px;
        }
        .grad-bar-track {
          height: 6px; background: #1e1e1e; overflow: hidden;
        }
        .grad-bar-fill {
          height: 100%; background: #00ff88;
          transition: width 0.5s ease;
        }
        .grad-note { font-size: 12px; color: #555; margin-top: 8px; }

        .bc-trade {
          background: #0d0d0d; border: 1px solid #1e1e1e;
          padding: 28px; margin-bottom: 40px;
        }
        .bc-mode-toggle {
          display: flex; gap: 0; margin-bottom: 24px;
          border: 1px solid #1e1e1e; width: fit-content;
        }
        .bc-mode-toggle button {
          padding: 10px 28px; background: none; border: none;
          color: #555; cursor: pointer; font-size: 14px;
          transition: all 0.15s;
        }
        .bc-mode-toggle button.active {
          background: #00ff88; color: #000; font-weight: 600;
        }
        .bc-mode-toggle button:not(.active):hover { color: #e8e8e8; }

        .bc-input-group { margin-bottom: 20px; }
        .bc-input-group label { display: block; font-size: 12px; color: #777; margin-bottom: 8px; }
        .bc-input-row {
          display: flex; align-items: center;
          border: 1px solid #2a2a2a; background: #141414;
        }
        .bc-input-row input {
          flex: 1; background: none; border: none; outline: none;
          padding: 14px 16px; font-size: 18px; color: #e8e8e8;
          font-family: 'IBM Plex Mono', monospace;
        }
        .bc-input-unit {
          padding: 14px 16px; color: #555; font-size: 13px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .bc-quick-amounts {
          display: flex; gap: 8px; margin-top: 8px;
        }
        .bc-quick-amounts button {
          padding: 4px 12px; background: none;
          border: 1px solid #2a2a2a; color: #555;
          font-size: 12px; cursor: pointer;
          transition: all 0.15s;
        }
        .bc-quick-amounts button:hover { border-color: #00ff88; color: #00ff88; }

        .bc-preview {
          background: #141414; border: 1px solid #1e1e1e;
          padding: 16px; margin-bottom: 20px;
        }
        .preview-row {
          display: flex; justify-content: space-between;
          font-size: 13px; padding: 4px 0;
        }
        .preview-row strong { font-family: 'IBM Plex Mono', monospace; color: #00ff88; }
        .preview-row.muted { color: #555; font-size: 12px; }

        .bc-connect-prompt {
          text-align: center; padding: 16px;
          border: 1px dashed #2a2a2a; color: #555; font-size: 14px;
        }
        .bc-action-btn {
          width: 100%; padding: 16px;
          font-size: 15px; font-weight: 600;
          cursor: pointer; border: none;
          transition: opacity 0.15s; letter-spacing: 0.02em;
        }
        .bc-action-btn.buy  { background: #00ff88; color: #000; }
        .bc-action-btn.sell { background: #ff4444; color: #fff; }
        .bc-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .bc-action-btn:not(:disabled):hover { opacity: 0.85; }

        .bc-tx-success {
          margin-top: 12px; font-size: 13px; color: #00ff88;
          text-align: center;
        }
        .bc-tx-success a { color: #00ff88; }
        .bc-tx-error {
          margin-top: 12px; font-size: 13px; color: #ff4444;
          text-align: center;
        }

        .bc-curve-viz {
          margin-bottom: 40px; padding: 28px;
          border: 1px solid #1e1e1e; background: #0d0d0d;
        }
        .bc-curve-viz h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .viz-note { font-size: 12px; color: #555; margin-bottom: 20px; }
        .curve-chart {
          display: flex; align-items: flex-end; gap: 4px;
          height: 90px; padding-bottom: 8px;
          border-bottom: 1px solid #1e1e1e;
        }
        .curve-bar {
          flex: 1; background: #1e1e1e;
          transition: height 0.3s ease;
        }
        .curve-bar.current { background: #00ff88; }
        .curve-labels {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #555; margin-top: 8px;
          font-family: 'IBM Plex Mono', monospace;
        }

        .bc-explainer { margin-bottom: 40px; }
        .bc-explainer h3 {
          font-size: 14px; font-weight: 600;
          margin-bottom: 20px; color: #777;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .explainer-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        @media (max-width: 600px) { .explainer-grid { grid-template-columns: 1fr; } }
        .explainer-card {
          border: 1px solid #1e1e1e; padding: 20px;
        }
        .card-num { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #00ff88; }
        .explainer-card h4 { font-size: 13px; font-weight: 600; margin: 8px 0 6px; }
        .explainer-card p { font-size: 12px; color: #777; line-height: 1.6; }
      `}</style>
    </div>
  );
}
