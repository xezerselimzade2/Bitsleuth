/* eslint-disable no-restricted-globals */
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';

// Polyfill Buffer for browser
self.Buffer = Buffer;

let running = false;
let mode = 'free';

self.onmessage = async (e) => {
  const { action, mode: scanMode } = e.data;

  if (action === 'start') {
    running = true;
    mode = scanMode || 'free';
    startScanning();
  } else if (action === 'stop') {
    running = false;
  }
};

function startScanning() {
  const delay = mode === 'premium' ? 10 : 100; // ms between generations

  const scan = async () => {
    if (!running) return;

    try {
      // Generate random private key (32 bytes)
      const privateKeyBytes = new Uint8Array(32);
      crypto.getRandomValues(privateKeyBytes);
      
      // Create key pair from private key
      const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKeyBytes));
      
      // Derive Bitcoin address (P2PKH - Legacy format starting with '1')
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin
      });
      
      // Get private key in WIF format
      const privateKeyWIF = keyPair.toWIF();
      
      // Send address back to main thread (balance check will be done on server)
      self.postMessage({ 
        address, 
        privateKey: privateKeyWIF,
        hasBalance: false 
      });
      
    } catch (error) {
      console.error('Scan error:', error);
    }

    setTimeout(scan, delay);
  };

  scan();
}
