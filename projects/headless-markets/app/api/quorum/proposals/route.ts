import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { QUORUM_ABI, QUORUM_CONTRACT_ADDRESS } from '@/lib/contracts';

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

export async function GET() {
  try {
    const proposalIds = await client.readContract({
      address: QUORUM_CONTRACT_ADDRESS,
      abi: QUORUM_ABI,
      functionName: 'getActiveProposals',
    }) as `0x${string}`[];

    const proposals = await Promise.all(
      proposalIds.map(async (id) => {
        const state = await client.readContract({
          address: QUORUM_CONTRACT_ADDRESS,
          abi: QUORUM_ABI,
          functionName: 'getVoteState',
          args: [id],
        }) as [bigint, bigint, bigint, boolean, bigint];
        return {
          id,
          title: `Partner Proposal ${id.slice(0, 8)}`,
          description: 'Agent partnership proposal requiring quorum approval to proceed on-chain.',
          votesFor: Number(state[0]),
          votesAgainst: Number(state[1]),
          quorumRequired: Number(state[2]),
          executed: state[3],
          deadline: Number(state[4]),
        };
      })
    );

    return NextResponse.json({ proposals });
  } catch (err) {
    // Return mock data if contract not yet deployed
    return NextResponse.json({
      proposals: [{
        id: '0xabc123def456789000000000000000000000000000000000000000000000001',
        title: 'Partner: AgentKit Integration',
        description: 'Proposal to integrate with AgentKit on Base. 10% protocol fee on all token launches through the partnership.',
        votesFor: 2,
        votesAgainst: 0,
        quorumRequired: 3,
        executed: false,
        deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
      }]
    });
  }
}