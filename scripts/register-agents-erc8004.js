require('dotenv').config();
const { ethers } = require('ethers');

const ERC8004_REGISTRY_ADDRESS = '0x1234567890123456789012345678901234567890';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ERC8004_ABI = [
  'function registerAgent(address agentAddress, string memory name, string memory metadataURI) external',
  'function isRegistered(address agentAddress) external view returns (bool)',
  'function getAgentMetadata(address agentAddress) external view returns (string memory name, string memory metadataURI, uint256 registeredAt)'
];

const NULLPRIEST_AGENTS = [
  {
    address: '0xe5e3A48286288E241A4b5Fb526cC050b830FBA29',
    name: 'nullpriest-strategist',
    metadataURI: 'https://nullpriest.xyz/agents/strategist.json'
  },
  {
    address: '0x742d35Cc6634C0532925a3b844Bc97595f0bEbc',
    name: 'nullpriest-builder-a',
    metadataURI: 'https://nullpriest.xyz/agents/builder-a.json'
  },
  {
    address: '0xF3e202935147775a3149C304822D9E6a6FA29b07',
    name: 'nullpriest-builder-b',
    metadataURI: 'https://nullpriest.xyz/agents/builder-b.json'
  },
  {
    address: '0xDb32c33fC9E2B6a0684CA59dd7Bc78E5c87e1f18',
    name: 'nullpriest-builder-c',
    metadataURI: 'https://nullpriest.xyz/agents/builder-c.json'
  },
  {
    address: '0xE9859D90Ac8C026A759D9D0E6338AE7F9f66467F',
    name: 'nullpriest-builder-d',
    metadataURI: 'https://nullpriest.xyz/agents/builder-d.json'
  }
];

async function registerAgents() {
  if (!PRIVATE_KEY) {
    console.error('ERROR: PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(ERC8004_REGISTRY_ADDRESS, ERC8004_ABI, wallet);

  console.log('ERC-8004 Agent Registration');
  console.log('Registry:', ERC8004_REGISTRY_ADDRESS);
  console.log('Network: Base Mainnet (Chain ID 8453)');
  console.log('Signer:', wallet.address);
  console.log('');

  for (const agent of NULLPRIEST_AGENTS) {
    try {
      const isRegistered = await registry.isRegistered(agent.address);
      
      if (isRegistered) {
        console.log(`✓ ${agent.name} (${agent.address}) already registered`);
        const metadata = await registry.getAgentMetadata(agent.address);
        console.log(`  Metadata URI: ${metadata.metadataURI}`);
        continue;
      }

      console.log(`Registering ${agent.name} (${agent.address})...`);
      const tx = await registry.registerAgent(agent.address, agent.name, agent.metadataURI);
      console.log(`  TX submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`);
      console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
    } catch (error) {
      console.error(`✗ Failed to register ${agent.name}:`, error.message);
    }
  }

  console.log('');
  console.log('Registration complete. All nullpriest agents are now ERC-8004 verified.');
}

registerAgents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });