/**
 * Wallet Modal for NullPriest
 * Uses Web3Modal for multi-wallet support
 * Works with vanilla JS (no React needed)
 */

// Web3Modal CDN integration
// Add to HTML: <script src="https://unpkg.com/@web3modal/cdn"></script>

const WALLETCONNECT_PROJECT_ID = ''; // Need to get from WalletConnect Cloud (free)

const BASE_CHAIN = {
  chainId: 8453,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org'
};

let web3Modal = null;
let provider = null;
let userAddress = null;

async function initWalletModal() {
  // Check if Web3Modal CDN is loaded
  if (typeof window.Web3Modal === 'undefined') {
    console.warn('Web3Modal not loaded, falling back to window.ethereum');
    return false;
  }

  web3Modal = new window.Web3Modal.Web3Modal({
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: [BASE_CHAIN],
    defaultChain: BASE_CHAIN,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#8b5cf6', // Purple to match site
      '--w3m-background': '#0a0a0f'
    },
    // Enable these wallets
    enabledWallets: [
      'metamask',
      'rainbow',
      'coinbase',
      'phantom',
      'trust',
      'argent'
    ]
  });

  return true;
}

async function connectWalletModal() {
  // Try Web3Modal first
  if (web3Modal) {
    try {
      const connection = await web3Modal.open();
      if (connection) {
        provider = connection.provider;
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          userAddress = accounts[0];
          return userAddress;
        }
      }
    } catch (err) {
      console.error('Web3Modal error:', err);
    }
  }

  // Fallback to window.ethereum with wallet selection
  if (window.ethereum) {
    // Check for multiple wallets
    const providers = window.ethereum.providers || [window.ethereum];
    
    if (providers.length > 1) {
      // Multiple wallets detected - show selection
      const walletNames = providers.map(p => {
        if (p.isMetaMask) return 'MetaMask';
        if (p.isRainbow) return 'Rainbow';
        if (p.isCoinbaseWallet) return 'Coinbase';
        if (p.isPhantom) return 'Phantom';
        if (p.isTrust) return 'Trust';
        return 'Unknown Wallet';
      });
      
      const choice = await showWalletSelector(walletNames);
      if (choice >= 0) {
        provider = providers[choice];
      } else {
        return null;
      }
    } else {
      provider = window.ethereum;
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      userAddress = accounts[0];
      
      // Switch to Base
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // Base chainId in hex
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        }
      }
      
      return userAddress;
    } catch (err) {
      console.error('Wallet connection error:', err);
      return null;
    }
  }

  alert('Please install a Web3 wallet like MetaMask, Rainbow, or Coinbase Wallet');
  return null;
}

// Simple wallet selector modal (no dependencies)
function showWalletSelector(walletNames) {
  return new Promise((resolve) => {
    // Create modal
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #1a1a2e; border: 1px solid #8b5cf6; border-radius: 12px;
      padding: 24px; min-width: 280px; font-family: inherit;
    `;

    modal.innerHTML = `
      <h3 style="color: #8b5cf6; margin: 0 0 16px 0; font-size: 16px;">Select Wallet</h3>
      <div id="wallet-options"></div>
    `;

    const optionsDiv = modal.querySelector('#wallet-options');
    
    walletNames.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.style.cssText = `
        display: block; width: 100%; padding: 12px; margin: 8px 0;
        background: transparent; border: 1px solid #333; color: #fff;
        border-radius: 8px; cursor: pointer; font-size: 14px;
        transition: all 0.2s;
      `;
      btn.onmouseover = () => { btn.style.borderColor = '#8b5cf6'; };
      btn.onmouseout = () => { btn.style.borderColor = '#333'; };
      btn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(idx);
      };
      optionsDiv.appendChild(btn);
    });

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(-1);
      }
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

// Export for use
window.NullPriestWallet = {
  init: initWalletModal,
  connect: connectWalletModal,
  getAddress: () => userAddress,
  getProvider: () => provider
};
