'use client';

import { useState, useEffect, useCallback } from 'react';

const K = 0.000001;
const N = 1;
const GRADUATION_ETH = 10;
const PROTOCOL_FEE = 0.10;
const BONDING_CURVE_CONTRACT = '0x2128cf8f508dde2202c6cd5df70be635f975a4f9';

function spotPrice(supply: number): number { return K * Math.pow(supply, N); }
function buyCost(supply: number, amount: number): number { return (K / 2) * (Math.pow(supply + amount, 2) - Math.pow(supply, 2)); }
function sellReturn(supply: number, amount: number): number { const gross = (K / 2) * (Math.pow(supply, 2) - Math.pow(supply - amount, 2)); return gross * (1 - PROTOCOL_FEE); }
function marketCap(supply: number): number { return spotPrice(supply) * supply; }
function graduationPct(supply: number): number { return Math.min((marketCap(supply) / GRADUATION_ETH) * 100, 100); }

interface TokenState { symbol: string; name: string; supply: number; reserveETH: number; graduated: boolean; }
interface TradeHistory { type: 'buy' | 'sell'; amount: number; ethValue: number; timestamp: Date; address: string; }

const INITIAL_TOKEN: TokenState = { symbol: 'AGKT', name: 'AgentKit Protocol', supply: 125_000, reserveETH: 0.78, graduated: false };
const MOCK_HISTORY: TradeHistory[] = [
  { type: 'buy', amount: 5000, ethValue: 0.0156, timestamp: new Date(Date.now() - 8*60000), address: '0xScout...' },
  { type: 'buy', amount: 15000, ethValue: 0.0563, timestamp: new Date(Date.now() - 22*60000), address: '0xStrat...' },
  { type: 'sell', amount: 2000, ethValue: 0.0031, timestamp: new Date(Date.now() - 45*60000), address: '0xAnon1...' },
  { type: 'buy', amount: 50000, ethValue: 0.3125, timestamp: new Date(Date.now() - 2*3600000), address: '0xAnon2...' },
];

function PriceChart({ supply }: { supply: number }) {
  const points = 40;
  const maxSupply = supply * 1.3;
  const prices = Array.from({ length: points }, (_, i) => ({ s: (i / (points - 1)) * maxSupply, p: spotPrice((i / (points - 1)) * maxSupply) }));
  const maxP = prices[prices.length - 1].p;
  const w = 100; const h = 48;
  const toSVG = (s: number, p: number) => `${(s / maxSupply) * w},${h - (p / maxP) * h}`;
  const polyline = prices.map(({ s, p }) => toSVG(s, p)).join(' ');
  const curX = (supply / maxSupply) * w;
  const curY = h - (spotPrice(supply) / maxP) * h;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Price Curve (k·s^n)</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80, display: 'block' }}>
        <defs><linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4488ff" stopOpacity="0.15" /><stop offset="100%" stopColor="#4488ff" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,${h} ${polyline} ${w},${h}`} fill="url(#curveGrad)" />
        <polyline points={polyline} fill="none" stroke="#4488ff" strokeWidth="0.6" strokeLinejoin="round" />
        <line x1={curX} y1="0" x2={curX} y2={h} stroke="#00ff88" strokeWidth="0.4" strokeDasharray="1,1" />
        <circle cx={curX} cy={curY} r="1.2" fill="#00ff88" />
      </svg>
    </div>
  );
}

function GraduationBar({ supply }: { supply: number }) {
  const pct = graduationPct(supply);
  const mc = marketCap(supply);
  const graduated = pct >= 100;
  return (
    <div style={{ margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
        <span style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Graduation Progress</span>
        <span style={{ color: graduated ? '#00ff88' : '#b0b0b0' }}>{mc.toFixed(4)} / {GRADUATION_ETH} ETH ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: graduated ? '#00ff88' : 'linear-gradient(90deg, #4488ff, #aa88ff)', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      {!graduated && <div style={{ marginTop: 6, fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>{(GRADUATION_ETH - mc).toFixed(4)} ETH until Uniswap V2 deployment</div>}
      {graduated && <div style={{ marginTop: 8, fontSize: 11, color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>GRADUATED → Deploying to Uniswap V2...</div>}
    </div>
  );
}

function TradePanel({ token, onTrade }: { token: TokenState; onTrade: (type: 'buy' | 'sell', amount: number) => void }) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const amount = parseFloat(inputAmount) || 0;
  const cost = mode === 'buy' ? buyCost(token.supply, amount) : sellReturn(token.supply, amount);
  const fee = mode === 'buy' ? cost * PROTOCOL_FEE : 0;
  const netCost = mode === 'buy' ? cost + fee : cost;

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1800));
    onTrade(mode, amount);
    setInputAmount('');
    setSubmitting(false);
  };

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 2, padding: 20 }}>
      <div style={{ display: 'flex', marginBottom: 20, border: '1px solid #1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
        {(['buy', 'sell'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px 0', background: mode === m ? (m === 'buy' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)') : 'transparent', border: 'none', color: mode === m ? (m === 'buy' ? '#00ff88' : '#ff4444') : '#555', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m}</button>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Token Amount</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="number" value={inputAmount} onChange={e => setInputAmount(e.target.value)} placeholder="0" style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 2, padding: '10px 12px', color: '#e8e8e8', fontSize: 16, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
          <span style={{ fontSize: 13, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>${token.symbol}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[1000, 5000, 10000, 50000].map(n => (
            <button key={n} onClick={() => setInputAmount(String(n))} style={{ padding: '3px 8px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 2, color: '#777', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer' }}>{n >= 1000 ? `${n/1000}K` : n}</button>
          ))}
        </div>
      </div>
      {amount > 0 && (
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 2, padding: 12, marginBottom: 16, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#777' }}><span>{mode === 'buy' ? 'Cost' : 'Gross Return'}</span><span>{cost.toFixed(6)} ETH</span></div>
          {mode === 'buy' && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}><span>Protocol Fee (10%)</span><span>{fee.toFixed(6)} ETH</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #1e1e1e', color: '#e8e8e8', fontWeight: 500 }}><span>{mode === 'buy' ? 'Total ETH' : 'Net Return'}</span><span style={{ color: mode === 'buy' ? '#4488ff' : '#00ff88' }}>{netCost.toFixed(6)} ETH</span></div>
        </div>
      )}
      <button onClick={handleSubmit} disabled={submitting || !amount || token.graduated} style={{ width: '100%', padding: '12px 0', background: token.graduated ? '#1a1a1a' : (mode === 'buy' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.08)'), border: `1px solid ${token.graduated ? '#2a2a2a' : mode === 'buy' ? '#00ff88' : '#ff4444'}`, borderRadius: 2, color: token.graduated ? '#555' : mode === 'buy' ? '#00ff88' : '#ff4444', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, cursor: token.graduated || submitting || !amount ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {token.graduated ? 'GRADUATED — Trade on Uniswap' : submitting ? 'CONFIRMING TX...' : `${mode.toUpperCase()} ${amount > 0 ? amount.toLocaleString() : ''} $${token.symbol}`}
      </button>
    </div>
  );
}

export default function BondingCurvePage() {
  const [token, setToken] = useState<TokenState>(INITIAL_TOKEN);
  const [history, setHistory] = useState<TradeHistory[]>(MOCK_HISTORY);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/price').then(r => r.json()).then(d => setEthPrice(d?.price ?? d?.ethereum?.usd ?? null)).catch(() => setEthPrice(null));
  }, []);

  const handleTrade = useCallback((type: 'buy' | 'sell', amount: number) => {
    setToken(prev => {
      const newSupply = type === 'buy' ? prev.supply + amount : Math.max(0, prev.supply - amount);
      const ethDelta = type === 'buy' ? buyCost(prev.supply, amount) : -sellReturn(prev.supply, amount);
      return { ...prev, supply: newSupply, reserveETH: Math.max(0, prev.reserveETH + ethDelta), graduated: marketCap(newSupply) >= GRADUATION_ETH };
    });
    setHistory(prev => [{ type, amount, ethValue: type === 'buy' ? buyCost(token.supply, amount) : sellReturn(token.supply, amount), timestamp: new Date(), address: '0xBuilderA...' }, ...prev.slice(0, 19)]);
  }, [token.supply]);

  const spot = spotPrice(token.supply);
  const mc = marketCap(token.supply);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '40px 40px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>headless-markets / bonding-curve</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 6px', letterSpacing: '-0.02em' }}>${token.symbol} · {token.name}</h1>
          <p style={{ fontSize: 13, color: '#777', margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>Base L2 · Bonding Curve · {PROTOCOL_FEE * 100}% protocol fee</p>
          <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
            {[{ label: 'Spot Price', value: `${spot.toFixed(8)} ETH`, color: '#4488ff' }, { label: 'Market Cap', value: `${mc.toFixed(4)} ETH`, color: '#e8e8e8' }, { label: 'Supply', value: token.supply.toLocaleString(), color: '#e8e8e8' }, { label: 'Reserve', value: `${token.reserveETH.toFixed(4)} ETH`, color: '#aa88ff' }].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
                {ethPrice && label !== 'Supply' && <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>${(parseFloat(value) * ethPrice).toFixed(2)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        <div>
          <PriceChart supply={token.supply} />
          <GraduationBar supply={token.supply} />
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 2, padding: '14px 18px', marginBottom: 24, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#555' }}>
            <div style={{ marginBottom: 4 }}>CONTRACT: <span style={{ color: '#777' }}>{BONDING_CURVE_CONTRACT}</span></div>
            <div style={{ marginBottom: 4 }}>CHAIN: <span style={{ color: '#4488ff' }}>Base L2 (chainId: 8453)</span></div>
            <div>FORMULA: <span style={{ color: '#aa88ff' }}>P(s) = {K} × s^{N} · graduation at {GRADUATION_ETH} ETH mcap</span></div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Recent Trades</div>
            {history.map((t, i) => {
              const ago = Math.round((Date.now() - t.timestamp.getTime()) / 60000);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #141414', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: t.type === 'buy' ? '#00ff88' : '#ff4444', fontWeight: 600, width: 32 }}>{t.type.toUpperCase()}</span>
                    <span style={{ color: '#b0b0b0' }}>{t.amount.toLocaleString()}</span>
                    <span style={{ color: '#555' }}>{t.address}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#e8e8e8' }}>{t.ethValue.toFixed(4)} ETH</div>
                    <div style={{ color: '#555', fontSize: 10 }}>{ago}m ago</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <TradePanel token={token} onTrade={handleTrade} />
          <div style={{ marginTop: 20, background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 2, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>How it works</div>
            {[{ step: '01', text: 'Price rises with every buy — bonding curve math.' }, { step: '02', text: '10% protocol fee on every trade → NULP holders.' }, { step: '03', text: 'At 10 ETH market cap, auto-deploys to Uniswap V2.' }, { step: '04', text: 'Quorum of 5 agents voted to launch this token.' }].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#555', flexShrink: 0 }}>{step}</span>
                <span style={{ color: '#b0b0b0', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; } input[type=number] { -moz-appearance: textfield; }`}</style>
    </div>
  );
}