// ABI for nullpriest Quorum Voting Contract on Base L2
// Issue #50 — headless-markets quorum voting UI

export const QUORUM_ABI = [
  {
    name: 'getVoteState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    outputs: [
      { name: 'votesFor', type: 'uint256' },
      { name: 'votesAgainst', type: 'uint256' },
      { name: 'quorumRequired', type: 'uint256' },
      { name: 'executed', type: 'bool' },
      { name: 'deadline', type: 'uint256' }
    ]
  },
  {
    name: 'getAgentVote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'bytes32' },
      { name: 'agent', type: 'address' }
    ],
    outputs: [
      { name: 'hasVoted', type: 'bool' },
      { name: 'support', type: 'bool' }
    ]
  },
  {
    name: 'castVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'bytes32' },
      { name: 'support', type: 'bool' }
    ],
    outputs: []
  },
  {
    name: 'getRegisteredAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'agents', type: 'address[]' },
      { name: 'names', type: 'string[]' },
      { name: 'roles', type: 'string[]' }
    ]
  },
  {
    name: 'getActiveProposals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'proposalIds', type: 'bytes32[]' }]
  },
  {
    name: 'VoteCast',
    type: 'event',
    inputs: [
      { name: 'proposalId', type: 'bytes32', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'support', type: 'bool', indexed: false }
    ]
  },
  {
    name: 'QuorumReached',
    type: 'event',
    inputs: [
      { name: 'proposalId', type: 'bytes32', indexed: true },
      { name: 'totalVotes', type: 'uint256', indexed: false }
    ]
  }
] as const;

// Contract address on Base L2
export const QUORUM_CONTRACT_ADDRESS = '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F' as `0x${string}`;

// Base L2 chain config
export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';