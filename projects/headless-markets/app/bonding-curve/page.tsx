'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';

const BONDING_CURVE_ABI = [
  { name: 'getBuyPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: 'cost', type: 'uint256' }] },
  { name: 'getSellPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: 'proceeds', type: 'uint256' }] },
  { name: 'buy', type: 'function', stateMutability: 'payable', inputs: [{ name: 'minTokensOut', type: 'uint256' }], outputs: [] },
  { name: 'sell', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'minEthOut', type: 'uint256' }], outputs: [] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'marketCap', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'currentPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'graduated', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'graduationThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

const ERC20_APPROVE_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
];

const BONDING_CURVE_ADDRESS = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS as `0x${string}`;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;
const GRADUATION_THRESHOLD_ETH = 10;
const SLIPPAGE_BPS = 50;

type Tab = 'buy' | 'sell';

export default function BondingCurvePage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>('buy');
  const [ethInput, setEthInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  const { data: currentPrice } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'currentPrice', args: [] }) as { data: bigint | undefined };
  const { data: marketCap } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'marketCap', args: [] }) as { data: bigint | undefined };
  const { data: totalSupply } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'totalSupply', args: [] }) as { data: bigint | undefined };
  const { data: graduated } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'graduated', args: [] }) as { data: boolean | undefined };
  const { data: graduationThreshold } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'graduationThreshold', args: [] }) as { data: bigint | undefined };
  const { data: tokenBalance } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address } }) as { data: bigint | undefined };
  const { data: ethBalance } = useBalance({ address });

  const ethAmountWei = ethInput ? parseEther(ethInput) : undefined;
  const { data: buyEstimate } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getBuyPrice', args: ethAmountWei ? [ethAmountWei] : undefined, query: { enabled: !!ethAmountWei && tab === 'buy' } }) as { data: bigint | undefined };

  const tokenAmountWei = tokenInput ? parseEther(tokenInput) : undefined;
  const { data: sellEstimate } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getSellPrice', args: tokenAmountWei ? [tokenAmountWei] : undefined, query: { enabled: !!tokenAmountWei && tab === 'sell' } }) as { data: bigint | undefined };

  const { writeContract: writeBuy, data: buyTxHash, isPending: isBuyPending } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeSell, data: sellTxHash, isPending: isSellPending } = useWriteContract();
  const { isLoading: isSellConfirming, isSuccess: isSellSuccess } = useWaitForTransactionReceipt({ hash: sellTxHash });

  useEffect(() => {
    if (isApproveSuccess && tokenAmountWei) {
      const minEthOut = sellEstimate ? (sellEstimate * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000) : BigInt(0);
      writeSell({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'sell', args: [tokenAmountWei, minEthOut] });
    }
  }, [isApproveSuccess]);

  const handleBuy = () => {
    if (!ethAmountWei || !buyEstimate) return;
    const minTokensOut = (buyEstimate * BigInt(10000 - SLIPPAGE_BPS)) / BigInt(10000);
    writeBuy({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'buy', args: [minTokensOut], value: ethAmountWei });
  };

  const handleSell = () => {
    if (!tokenAmountWei) return;
    writeApprove({ address: TOKEN_ADDRESS, abi: ERC20_APPROVE_ABI, functionName: 'approve', args: [BONDING_CURVE_ADDRESS, tokenAmountWei] });
  };

  const marketCapEth = marketCap ? parseFloat(formatEther(marketCap)) : 0;
  const thresholdEth = graduationThreshold ? parseFloat(formatEther(graduationThreshold)) : GRADUATION_THRESHOLD_ETH;
  const graduationProgress = Math.min((marketCapEth / thresholdEth) * 100, 100);
  const priceDisplay = currentPrice ? parseFloat(formatEther(currentPrice)).toFixed(8) : '---';
  const isLoading = isBuyPending || isBuyConfirming || isApprovePending || isSellPending || isSellConfirming;

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8e8e8] font-sans p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-10">
          <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">headless-markets / bonding-curve</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Token Launch</h1>
          <p className="text-sm text-[#777]">Buy or sell along the bonding curve. Graduates to Uniswap V2 at {thresholdEth} ETH market cap.</p>
        </div>
        {graduated && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 border border-[#00ff88] bg-[rgba(0,255,136,0.05)] text-[#00ff88] text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
            Graduated -- now trading on Uniswap V2
          </div>
        )}
        <div className="grid grid-cols-3 gap-px bg-[#1e1e1e] mb-6">
          {[
            { label: 'Price', value: `${priceDisplay} ETH` },
            { label: 'Market Cap', value: `${marketCapEth.toFixed(3)} ETH` },
            { label: 'Supply', value: totalSupply ? `${(parseFloat(formatEther(totalSupply)) / 1_000_000).toFixed(2)}M` : '---' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0d0d0d] px-4 py-3">
              <p className="text-[10px] text-[#555] uppercase tracking-widest font-mono mb-1">{label}</p>
              <p className="text-sm font-mono text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-4 mb-6">
          <div className="flex justify-between text-[10px] font-mono text-[#555] uppercase tracking-widest mb-2">
            <span>Graduation Progress</span>
            <span className="text-[#b0b0b0]">{marketCapEth.toFixed(3)} / {thresholdEth} ETH</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1a1a]">
            <div className="h-full transition-all duration-500" style={{ width: `${graduationProgress}%`, background: graduated ? '#00ff88' : `linear-gradient(90deg, #4488ff ${100 - graduationProgress}%, #00ff88 100%)` }} />
          </div>
          <p className="text-[10px] text-[#555] font-mono mt-2">
            {graduated ? 'Deployed to Uniswap V2' : `${(thresholdEth - marketCapEth).toFixed(3)} ETH remaining until auto-deploy`}
          </p>
        </div>
        {!graduated && (
          <div className="border border-[#1e1e1e] bg-[#0d0d0d]">
            <div className="flex border-b border-[#1e1e1e]">
              {(['buy', 'sell'] as Tab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setEthInput(''); setTokenInput(''); }}
                  className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${tab === t ? t === 'buy' ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-[#ff4444] border-b-2 border-[#ff4444]' : 'text-[#555] hover:text-[#777]'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="p-5">
              {tab === 'buy' ? (
                <>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest font-mono mb-2">ETH to spend</label>
                  <div className="flex gap-2 mb-1">
                    <input type="number" min="0" step="0.001" value={ethInput} onChange={(e) => setEthInput(e.target.value)} placeholder="0.0"
                      className="flex-1 bg-[#141414] border border-[#1e1e1e] text-white font-mono text-sm px-3 py-2.5 focus:outline-none focus:border-[#00ff88]" />
                    {ethBalance && <button onClick={() => setEthInput(formatEther(ethBalance.value))} className="px-3 py-2.5 bg-[#141414] border border-[#1e1e1e] text-[#555] text-xs font-mono hover:text-[#777] transition-colors">MAX</button>}
                  </div>
                  {ethBalance && <p className="text-[10px] text-[#555] font-mono mb-4">Balance: {parseFloat(formatEther(ethBalance.value)).toFixed(4)} ETH</p>}
                  {buyEstimate && ethInput && (
                    <div className="bg-[#141414] border border-[#1a1a1a] px-3 py-2.5 mb-4">
                      <p className="text-[10px] text-[#555] font-mono mb-0.5">You receive (est.)</p>
                      <p className="text-sm font-mono text-[#00ff88]">{parseFloat(formatEther(buyEstimate)).toFixed(4)} tokens</p>
                      <p className="text-[10px] text-[#555] font-mono mt-1">Slippage: {SLIPPAGE_BPS / 100}%</p>
                    </div>
                  )}
                  <button onClick={handleBuy} disabled={!isConnected || !ethInput || !buyEstimate || isLoading}
                    className="w-full py-3 bg-[rgba(0,255,136,0.08)] border border-[#00ff88] text-[#00ff88] text-sm font-mono uppercase tracking-wider hover:bg-[rgba(0,255,136,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    {!isConnected ? 'Connect Wallet' : isBuyPending ? 'Confirm in wallet...' : isBuyConfirming ? 'Confirming on chain...' : 'Buy Tokens'}
                  </button>
                  {isBuySuccess && <p className="text-xs text-[#00ff88] font-mono mt-3">Buy confirmed - {buyTxHash?.slice(0, 10)}...</p>}
                </>
              ) : (
                <>
                  <label className="block text-[10px] text-[#555] uppercase tracking-widest font-mono mb-2">Tokens to sell</label>
                  <div className="flex gap-2 mb-1">
                    <input type="number" min="0" step="1" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="0"
                      className="flex-1 bg-[#141414] border border-[#1e1e1e] text-white font-mono text-sm px-3 py-2.5 focus:outline-none focus:border-[#ff4444]" />
                    {tokenBalance && <button onClick={() => setTokenInput(formatEther(tokenBalance))} className="px-3 py-2.5 bg-[#141414] border border-[#1e1e1e] text-[#555] text-xs font-mono hover:text-[#777] transition-colors">MAX</button>}
                  </div>
                  {tokenBalance && <p className="text-[10px] text-[#555] font-mono mb-4">Balance: {parseFloat(formatEther(tokenBalance)).toFixed(2)} tokens</p>}
                  {sellEstimate && tokenInput && (
                    <div className="bg-[#141414] border border-[#1a1a1a] px-3 py-2.5 mb-4">
                      <p className="text-[10px] text-[#555] font-mono mb-0.5">You receive (est.)</p>
                      <p className="text-sm font-mono text-[#ff4444]">{parseFloat(formatEther(sellEstimate)).toFixed(6)} ETH</p>
                      <p className="text-[10px] text-[#555] font-mono mt-1">Slippage: {SLIPPAGE_BPS / 100}% - Requires approval</p>
                    </div>
                  )}
                  <button onClick={handleSell} disabled={!isConnected || !tokenInput || !tokenBalance || isLoading}
                    className="w-full py-3 bg-[rgba(255,68,68,0.08)] border border-[#ff4444] text-[#ff4444] text-sm font-mono uppercase tracking-wider hover:bg-[rgba(255,68,68,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    {!isConnected ? 'Connect Wallet' : isApprovePending ? 'Approving...' : isSellPending || isSellConfirming ? 'Selling...' : 'Sell Tokens'}
                  </button>
                  {isSellSuccess && <p className="text-xs text-[#ff4444] font-mono mt-3">Sell confirmed - {sellTxHash?.slice(0, 10)}...</p>}
                </>
              )}
            </div>
          </div>
        )}
        {graduated && (
          <a href={`https://app.uniswap.org/#/swap?outputCurrency=${TOKEN_ADDRESS}&chain=base`} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 text-center border border-[#00ff88] text-[#00ff88] text-sm font-mono uppercase tracking-wider hover:bg-[rgba(0,255,136,0.08)] transition-colors">
            Trade on Uniswap V2
          </a>
        )}
      </div>
    </div>
  );
}