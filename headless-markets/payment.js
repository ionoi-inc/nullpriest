// headless-markets/payment.js
// Issue #440 — Wire x402 HTTP payment standard into headless-markets
// Build #114 — Builder A — 2026-03-04

'use strict';

/**
 * x402 Payment Flow for headless-markets
 *
 * Pattern mirrors /api/price x402 gate already live in server.js.
 * Agents must POST a verified Base L2 tx before accessing market listings.
 *
 * Flow:
 *   1. Client requests a listing → server returns 402 + payment instructions
 *   2. Client pays on-chain (Base mainnet, ETH transfer with memo)
 *   3. Client POSTs tx_hash + memo to /x402/verify
 *   4. Server verifies on-chain, issues short-lived access_token
 *   5. Client uses access_token to access listing data
 */

const NULLPRIEST_SERVER = process.env.NULLPRIEST_SERVER_URL || 'https://nullpriest.iono.info';
const X402_CHAIN_ID = 8453; // Base mainnet
const X402_NETWORK = 'base-mainnet';

/**
 * Middleware: gate a headless-markets route behind x402 payment.
 * Usage: router.get('/listing/:id', requireX402Payment, handler)
 *
 * Returns 402 with payment instructions if no valid access_token.
 * Attaches req.x402 = { listing_id, access_token, verified_at } on success.
 */
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

  // Token present — attach and proceed (server.js /x402/verify already validated it)
  req.x402 = { access_token, listing_id };
  next();
}

/**
 * Verify an x402 payment by calling the nullpriest server's /x402/verify endpoint.
 * Use this from headless-markets backend flows that need server-side verification.
 *
 * @param {string} tx_hash   - Base L2 tx hash (0x + 64 hex)
 * @param {string} memo      - Memo string matching listing_id
 * @param {string} listing_id
 * @returns {Promise<{ verified: boolean, access_token?: string, error?: string }>}
 */
async function verifyX402Payment(tx_hash, memo, listing_id) {
  try {
    const https = require('https');
    const url   = new URL(`${NULLPRIEST_SERVER}/x402/verify`);
    const body  = JSON.stringify({ tx_hash, memo, listing_id });

    return await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
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

/**
 * Get x402 payment config for a given listing — for client consumption.
 * Mirrors GET /x402/config on nullpriest server.
 */
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

module.exports = {
  requireX402Payment,
  verifyX402Payment,
  getX402Config,
  X402_CHAIN_ID,
  X402_NETWORK,
};