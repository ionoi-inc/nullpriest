import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { QUORUM_ABI, QUORUM_CONTRACT_ADDRESS } from '@/lib/contracts';

const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

export async function POST(request: Request) {
  try {
    const { proposalId, agentAddress, support } = await request.json();

    if (!proposalId || typeof support !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields: proposalId, support' }, { status: 400 });
    }

    const agentKey = process.env.AGENT_PRIVATE_KEY;
    if (!agentKey) {
      return NextResponse.json({ error: 'Agent private key not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(agentKey as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: base, transport: http('https://mainnet.base.org') });

    const { request: txRequest } = await publicClient.simulateContract({
      address: QUORUM_CONTRACT_ADDRESS,
      abi: QUORUM_ABI,
      functionName: 'castVote',
      args: [proposalId as `0x${string}`, support],
      account,
    });

    const txHash = await walletClient.writeContract(txRequest);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({ txHash, success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Vote submission failed' }, { status: 500 });
  }
}