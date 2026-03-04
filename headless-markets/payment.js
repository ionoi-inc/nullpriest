// headless-markets/payment.js
// Issue #440 — Wire x402 HTTP payment standard into headless-markets
// Build #116 — Builder A — 2026-03-04

'use strict';

const NULLPRIEST_SERVER = process.env.NULLPRIEST_SERVER_URL || 'https://nullpriest.iono.info';
const X402_CHAIN_ID = 8453;
const X402_NETWORK = 'base-mainnet';

function requireX402Payment(req, res, next) {
  const access_token = req.headers['x-access-token'] || req.query.access_token;
  const listing_id   = req.params.id || req.query.listing_id;

  if (!access_token) {
    return res.status(402).json({
      error:    'Payment required',
      protocol: 'x402',
      version:  '1',
      network:  X402_NETWORK,
      chain_id: X402_CHAIN_ID,
      payment_address: process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbc',
      instructions: {
        step1: 'Send ETH on Base mainnet to payment_address',
        step2: 'Include listing_id as memo in the transaction input data (hex-encoded UTF-8)',
        step3: `POST { tx_hash, memo: listing_id, listing_id } to ${NULLPRIEST_SERVER}/x402/verify`,
        step4: 'Receive access_token, include as X-Access-Token header on retry',
      },
      listing_id: listing_id || null,
    });
  }

  req.x402 = { access_token, listing_id };
  next();
}

async function verifyX402Payment(tx_hash, memo, listing_id) {
  try {
    const https = require('https');
    const url   = new URL(`${NULLPRIEST_SERVER}/x402/verify`);
    const body  = JSON.stringify({ tx_hash, memo, listing_id });

    return await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve({ verified: false, error: 'Invalid JSON from verify endpoint' }); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (e) {
    return { verified: false, error: e.message };
  }
}

function getX402Config(listing_id) {
  return {
    protocol:        'x402',
    version:         '1',
    network:         X402_NETWORK,
    chain_id:        X402_CHAIN_ID,
    payment_address: process.env.X402_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbc',
    verify_endpoint: `${NULLPRIEST_SERVER}/x402/verify`,
    listing_id,
  };
}

module.exports = { requireX402Payment, verifyX402Payment, getX402Config, X402_CHAIN_ID, X402_NETWORK };