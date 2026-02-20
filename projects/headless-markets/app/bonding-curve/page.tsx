'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';

// Bonding curve math (linear: price = BASE + SLOPE * supply)
// From docs/bonding-curve-math.md:
//   price(s) = BASE_PRICE + SLOPE * s
//   cost(s1->s2) = integral = BASE_PRICE*(s2-s1) + SLOPE/2*(s2^2-s1^2)
//   graduation at marketCap = 10 ETH
const BASE_PRICE = 0.000001;
const SLOPE      = 0.000000001;
const GRAD_ETH   = 10;

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

const BONDING_CURVE_ABI = [
  { name: 'buy',         type: 'function', stateMutability: 'payable',    inputs: [{ name: 'minOut', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'sell',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'minEth', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'graduated',   type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getPrice',    type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

interface CurveState {
  supply: number; price: number; marketCap: number;
  gradProgress: number; graduated: boolean; loading: boolean;
}
interface TxState { status: 'idle' | 'pending' | 'success' | 'error'; hash?: string; error?: string; }

export default function BondingCurvePage() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [curve, setCurve] = useState<CurveState>({
    supply: 0, price: BASE_PRICE, marketCap: 0, gradProgress: 0, graduated: false, loading: true,
  });
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState<{ eth: number; slippage: number } | null>(null);
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

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
        supply, price,
        marketCap:    supply * price,
        gradProgress: Math.min((supply * price / GRAD_ETH) * 100, 100),
        graduated:    graduatedRaw as boolean,
        loading:      false,
      });
    } catch {
      setCurve(prev => ({ ...prev, loading: false }));
    }
  }, [publicClient]);

  useEffect(() => {
    fetchCurveState();
    const interval = setInterval(fetchCurveState, 15_000);
    return () => clearInterval(interval);
  }, [fetchCurveState]);

  useEffect(() => {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setPreview(null); return; }
    if (mode === 'buy') {
      const eth = costToBuy(curve.supply, n);
      setPreview({ eth, slippage: eth * 0.005 });
    } else {
      const eth = proceedsFromSell(curve.supply, n);
      setPreview({ eth, slippage: eth * 0.005 });
    }
  }, [amount, mode, curve.supply]);

  async function handleBuy() {
    if (!walletClient || !publicClient || !preview) return;
    const tokenAmount = parseEther(amount);
    const minOut = tokenAmount * 995n / 1000n;
    setTx({ status: 'pending' });
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'buy',
        args: [minOut], value: parseEther((preview.eth + preview.slippage).toFixed(18)),
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
    const minEth = parseEther((preview.eth * 0.995).toFixed(18));
    setTx({ status: 'pending' });
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'sell',
        args: [tokenAmount, minEth],
      });
      setTx({ status: 'success', hash });
      await publicClient.waitForTransactionReceipt({ hash });
      fetchCurveState();
    } catch (e: unknown) {
      setTx({ status: 'error', error: e instanceof Error ? e.message : 'Transaction failed' });
    }
  }

  return (
    <div className="bonding-curve-page">
      <div className="bc-header">
        <h1>Bonding Curve</h1>
        <p className="bc-subtitle">Linear price discovery. Graduates to Uniswap V2 at 10 ETH market cap.</p>
      </div>

      {curve.graduated && (
        <div className="bc-graduated-banner">
          <strong>Token Graduated!</strong>
          <p>Liquidity deployed to Uniswap V2. Trade there for full liquidity.</p>
        </div>
      )}

      <div className="bc-stats">
        <div className="bc-stat"><label>Current Price</label><value>{curve.loading ? '...' : `${curve.price.toFixed(8)} ETH`}</value></div>
        <div className="bc-stat"><label>Market Cap</label><value>{curve.loading ? '...' : `${curve.marketCap.toFixed(4)} ETH`}</value></div>
        <div className="bc-stat"><label>Total Supply</label><value>{curve.loading ? '...' : curve.supply.toLocaleString()}</value></div>
        <div className="bc-stat"><label>Graduation</label><value>{curve.loading ? '...' : `${curve.gradProgress.toFixed(1)}%`}</value></div>
      </div>

      <div className="bc-graduation">
        <div className="grad-bar-header">
          <span>Graduation Progress</span>
          <span>{curve.gradProgress.toFixed(2)}% of 10 ETH</span>
        </div>
        <div className="grad-bar-track">
          <div className="grad-bar-fill" style={{ width: `${curve.gradProgress}%` }} />
        </div>
        <p className="grad-note">{(GRAD_ETH - curve.marketCap).toFixed(4)} ETH remaining until Uniswap V2 graduation.</p>
      </div>

      {!curve.graduated && (
        <div className="bc-trade">
          <div className="bc-mode-toggle">
            <button className={mode === 'buy' ? 'active' : ''} onClick={() => { setMode('buy'); setAmount(''); setTx({ status: 'idle' }); }}>Buy</button>
            <button className={mode === 'sell' ? 'active' : ''} onClick={() => { setMode('sell'); setAmount(''); setTx({ status: 'idle' }); }}>Sell</button>
          </div>

          <div className="bc-input-group">
            <label>Token Amount</label>
            <div className="bc-input-row">
              <input type="number" min="0" placeholder="0.00" value={amount} onChange={e => { setAmount(e.target.value); setTx({ status: 'idle' }); }} />
              <span className="bc-input-unit">NULP</span>
            </div>
            <div className="bc-quick-amounts">
              {['100', '1000', '10000', '100000'].map(v => (
                <button key={v} onClick={() => setAmount(v)}>{Number(v).toLocaleString()}</button>
              ))}
            </div>
          </div>

          {preview && (
            <div className="bc-preview">
              <div className="preview-row"><span>{mode === 'buy' ? 'You pay' : 'You receive'}</span><strong>{preview.eth.toFixed(6)} ETH</strong></div>
              <div className="preview-row muted"><span>Slippage buffer (0.5%)</span><span>{preview.slippage.toFixed(6)} ETH</span></div>
              <div className="preview-row muted"><span>Price per token</span><span>{(preview.eth / parseFloat(amount)).toFixed(8)} ETH</span></div>
              <div className="preview-row muted">
                <span>New market cap</span>
                <span>{mode === 'buy' ? marketCapEth(curve.supply + parseFloat(amount)).toFixed(4) : marketCapEth(curve.supply - parseFloat(amount)).toFixed(4)} ETH</span>
              </div>
            </div>
          )}

          {!isConnected ? (
            <div className="bc-connect-prompt">Connect wallet to trade</div>
          ) : (
            <button className={`bc-action-btn ${mode}`} disabled={!preview || tx.status === 'pending'} onClick={mode === 'buy' ? handleBuy : handleSell}>
              {tx.status === 'pending' ? 'Confirming...' : mode === 'buy' ? `Buy ${amount || '0'} NULP` : `Sell ${amount || '0'} NULP`}
            </button>
          )}

          {tx.status === 'success' && tx.hash && (
            <div className="bc-tx-success">Confirmed. <a href={`https://basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">View on BaseScan</a></div>
          )}
          {tx.status === 'error' && <div className="bc-tx-error">{tx.error}</div>}
        </div>
      )}

      <div className="bc-explainer">
        <h3>How It Works</h3>
        <div className="explainer-grid">
          <div className="explainer-card"><span className="card-num">01</span><h4>Linear Price Discovery</h4><p>Price increases linearly with supply. Formula: price = {BASE_PRICE} + {SLOPE} x supply</p></div>
          <div className="explainer-card"><span className="card-num">02</span><h4>Always Liquid</h4><p>The contract holds ETH reserves. Sell back at curve price any time. No orderbook slippage.</p></div>
          <div className="explainer-card"><span className="card-num">03</span><h4>Graduation at 10 ETH</h4><p>At 10 ETH market cap, liquidity auto-deploys to Uniswap V2 and locks permanently.</p></div>
        </div>
      </div>
    </div>
  );
}