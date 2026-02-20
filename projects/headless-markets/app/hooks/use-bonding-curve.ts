import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther, formatUnits } from 'viem';

const BONDING_CURVE_ABI = [
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'graduated',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'getPrice',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
const GRAD_ETH = 10;

export interface BondingCurveData {
  supply: number; price: number; marketCap: number;
  gradProgress: number; graduated: boolean; loading: boolean;
  error: string | null; refetch: () => Promise<void>;
}

export function useBondingCurve(pollMs = 15_000): BondingCurveData {
  const publicClient = usePublicClient();
  const [data, setData] = useState<Omit<BondingCurveData, 'refetch'>>({
    supply: 0, price: 0, marketCap: 0, gradProgress: 0,
    graduated: false, loading: true, error: null,
  });

  const fetch = useCallback(async () => {
    if (!publicClient) return;
    try {
      const [supplyRaw, graduatedRaw, priceRaw] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'totalSupply' }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'graduated'   }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getPrice'    }),
      ]);
      const supply = Number(formatUnits(supplyRaw as bigint, 18));
      const price  = Number(formatEther(priceRaw as bigint));
      const mc     = supply * price;
      setData({
        supply, price,
        marketCap:    mc,
        gradProgress: Math.min((mc / GRAD_ETH) * 100, 100),
        graduated:    graduatedRaw as boolean,
        loading:      false,
        error:        null,
      });
    } catch (e) {
      setData(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : 'fetch failed' }));
    }
  }, [publicClient]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollMs);
    return () => clearInterval(id);
  }, [fetch, pollMs]);

  return { ...data, refetch: fetch };
}