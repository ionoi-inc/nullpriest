'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatEther, parseEther } from 'viem';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Bonding curve math: price = k * supply^2 (from docs/bonding-curve-math.md)
// k = 0.000001 ETH — each token costs more as supply grows
const K = 0.000001;
const GRADUATION_CAP_ETH = 10; // Auto-deploys to Uniswap V2 at 10 ETH market cap

function calculatePrice(supply: number): number {
  return K * supply * supply;
}

function calculateBuyCost(currentSupply: number, amount: number): number {
  const s = currentSupply;
  const a = amount;
  return K * (a * s * s + a * a * s + (a * a * a) / 3);
}

function calculateSellReturn(currentSupply: number, amount: number): number {
  const s = currentSupply;
  const a = amount;
  return K * (a * s * s - a * a * s + (a * a * a) / 3);
}

const BONDING_CURVE_ABI = [
  { name: 'buy', type: 'function', stateMutability: 'payable', inputs: [{ name: 'minTokens', type: 'uint256' }], outputs: [{ name: 'tokensBought', type: 'uint256' }] },
  { name: 'sell', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenAmount', type: 'uint256' }, { name: 'minEth', type: 'uint256' }], outputs: [{ name: 'ethReceived', type: 'uint256' }] },
  { name: 'getPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'price', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'supply', type: 'uint256' }] },
  { name: 'reserveBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'graduated', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
] as const;

export default function BondingCurvePage() {
  const params = useParams();
  const contractAddress = params?.address as `0x${string}` | undefined;
  const { address: userAddress, isConnected } = useAccount();

  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  const { data: currentPrice, refetch: refetchPrice } = useReadContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'getPrice' });
  const { data: totalSupplyRaw, refetch: refetchSupply } = useReadContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'totalSupply' });
  const { data: reserveBalanceRaw, refetch: refetchReserve } = useReadContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'reserveBalance' });
  const { data: isGraduated } = useReadContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'graduated' });

  const totalSupply = totalSupplyRaw ? Number(formatEther(totalSupplyRaw)) : 0;
  const reserveBalance = reserveBalanceRaw ? Number(formatEther(reserveBalanceRaw)) : 0;
  const pricePerToken = currentPrice ? Number(formatEther(currentPrice)) : calculatePrice(totalSupply);
  const marketCap = pricePerToken * totalSupply;
  const graduationProgress = Math.min((marketCap / GRADUATION_CAP_ETH) * 100, 100);

  const parsedInput = parseFloat(inputAmount) || 0;
  const estimatedCost = mode === 'buy' ? calculateBuyCost(totalSupply, parsedInput) : calculateSellReturn(totalSupply, parsedInput);

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) { refetchPrice(); refetchSupply(); refetchReserve(); setInputAmount(''); }
  }, [isConfirmed, refetchPrice, refetchSupply, refetchReserve]);

  function handleTrade() {
    if (!contractAddress || !parsedInput) return;
    if (mode === 'buy') {
      const minTokens = parsedInput * (1 - slippage / 100);
      writeContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'buy', args: [parseEther(minTokens.toFixed(18))], value: parseEther(estimatedCost.toFixed(18)) });
    } else {
      const minEth = estimatedCost * (1 - slippage / 100);
      writeContract({ address: contractAddress, abi: BONDING_CURVE_ABI, functionName: 'sell', args: [parseEther(parsedInput.toFixed(18)), parseEther(minEth.toFixed(18))] });
    }
  }

  if (isGraduated) {
    return (
      <div className="graduated-banner">
        <div className="grad-icon">🎓</div>
        <h2>Token Graduated</h2>
        <p>This token reached 10 ETH market cap and has been deployed to Uniswap V2.</p>
        <a href={`https://app.uniswap.org/swap?outputCurrency=${contractAddress}`} target="_blank" rel="noopener noreferrer" className="btn-uniswap">Trade on Uniswap</a>
      </div>
    );
  }

  return (
    <div className="bonding-curve-page">
      <div className="price-panel">
        <div className="price-stat"><span className="label">Current Price</span><span className="value accent">{pricePerToken.toFixed(8)} ETH</span></div>
        <div className="price-stat"><span className="label">Market Cap</span><span className="value">{marketCap.toFixed(4)} ETH</span></div>
        <div className="price-stat"><span className="label">Total Supply</span><span className="value">{totalSupply.toLocaleString()}</span></div>
        <div className="price-stat"><span className="label">Reserve</span><span className="value">{reserveBalance.toFixed(4)} ETH</span></div>
      </div>
      <div className="graduation-section">
        <div className="grad-header"><span className="grad-label">Graduation Progress</span><span className="grad-pct">{graduationProgress.toFixed(1)}%</span></div>
        <div className="grad-bar-track"><div className="grad-bar-fill" style={{ width: `${graduationProgress}%` }} /></div>
        <p className="grad-hint">At 10 ETH market cap, liquidity auto-deploys to Uniswap V2</p>
      </div>
      <div className="trade-panel">
        <div className="mode-tabs">
          <button className={`tab ${mode === 'buy' ? 'active' : ''}`} onClick={() => setMode('buy')}>Buy</button>
          <button className={`tab ${mode === 'sell' ? 'active' : ''}`} onClick={() => setMode('sell')}>Sell</button>
        </div>
        <div className="input-group">
          <label>{mode === 'buy' ? 'Tokens to buy' : 'Tokens to sell'}</label>
          <input type="number" min="0" step="any" placeholder="0.00" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} className="amount-input" />
        </div>
        {parsedInput > 0 && (
          <div className="estimate-row">
            <span className="est-label">{mode === 'buy' ? 'Cost' : 'You receive'}</span>
            <span className="est-value accent">{estimatedCost.toFixed(6)} ETH</span>
          </div>
        )}
        <div className="slippage-row">
          <span className="slip-label">Slippage</span>
          <div className="slip-options">
            {[0.5, 1, 2].map((s) => (<button key={s} className={`slip-btn ${slippage === s ? 'active' : ''}`} onClick={() => setSlippage(s)}>{s}%</button>))}
          </div>
        </div>
        {!isConnected ? (
          <div className="connect-wrapper"><ConnectButton /></div>
        ) : (
          <button className="btn-trade" onClick={handleTrade} disabled={!parsedInput || isTxPending || isConfirming}>
            {isTxPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming on-chain…' : mode === 'buy' ? `Buy ${parsedInput || ''} tokens` : `Sell ${parsedInput || ''} tokens`}
          </button>
        )}
        {txError && <p className="tx-error">Error: {txError.message?.slice(0, 120)}</p>}
        {isConfirmed && <p className="tx-success">Transaction confirmed! <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">View on BaseScan</a></p>}
      </div>
      <style jsx>{`
        .bonding-curve-page { max-width: 520px; margin: 40px auto; display: flex; flex-direction: column; gap: 24px; padding: 0 16px; font-family: 'IBM Plex Mono', monospace; }
        .price-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .price-stat { background: #0d0d0d; border: 1px solid #1e1e1e; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
        .label, .grad-label, .slip-label, .est-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { font-size: 15px; color: #e8e8e8; font-weight: 500; }
        .accent { color: #00ff88 !important; }
        .graduation-section { background: #0d0d0d; border: 1px solid #1e1e1e; padding: 20px; }
        .grad-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .grad-pct { font-size: 13px; color: #00ff88; font-weight: 500; }
        .grad-bar-track { background: #1a1a1a; height: 6px; width: 100%; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
        .grad-bar-fill { height: 100%; background: #00ff88; border-radius: 3px; transition: width 0.4s ease; }
        .grad-hint { font-size: 11px; color: #555; }
        .trade-panel { background: #0d0d0d; border: 1px solid #1e1e1e; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .mode-tabs { display: flex; gap: 2px; background: #141414; padding: 4px; border: 1px solid #1e1e1e; }
        .tab { flex: 1; padding: 8px; font-size: 13px; font-family: 'IBM Plex Mono', monospace; background: none; border: none; color: #555; cursor: pointer; transition: all 0.15s; }
        .tab.active { background: #1a1a1a; color: #00ff88; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.08em; }
        .amount-input { width: 100%; padding: 12px; background: #141414; border: 1px solid #2a2a2a; color: #e8e8e8; font-family: 'IBM Plex Mono', monospace; font-size: 16px; outline: none; transition: border-color 0.15s; }
        .amount-input:focus { border-color: #00ff88; }
        .estimate-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.1); }
        .est-value { font-size: 15px; font-weight: 600; }
        .slippage-row { display: flex; align-items: center; justify-content: space-between; }
        .slip-options { display: flex; gap: 6px; }
        .slip-btn { padding: 4px 10px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; background: #141414; border: 1px solid #2a2a2a; color: #777; cursor: pointer; transition: all 0.15s; }
        .slip-btn.active { border-color: #00ff88; color: #00ff88; }
        .btn-trade { width: 100%; padding: 14px; background: #00ff88; color: #000; font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: opacity 0.15s; letter-spacing: 0.04em; }
        .btn-trade:hover:not(:disabled) { opacity: 0.85; }
        .btn-trade:disabled { opacity: 0.4; cursor: not-allowed; }
        .connect-wrapper { display: flex; justify-content: center; }
        .tx-error { font-size: 12px; color: #ff4444; word-break: break-word; }
        .tx-success { font-size: 12px; color: #00ff88; }
        .tx-success a { color: #00ff88; }
        .graduated-banner { max-width: 520px; margin: 80px auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px; background: #0d0d0d; border: 1px solid #2a2a2a; font-family: 'IBM Plex Mono', monospace; }
        .grad-icon { font-size: 48px; }
        .graduated-banner h2 { color: #00ff88; font-size: 22px; }
        .graduated-banner p { color: #777; font-size: 13px; }
        .btn-uniswap { padding: 12px 28px; background: #00ff88; color: #000; text-decoration: none; font-weight: 600; font-size: 14px; }
      `}</style>
    </div>
  );
}