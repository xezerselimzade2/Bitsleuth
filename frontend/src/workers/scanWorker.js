/* eslint-disable no-restricted-globals */
import TronWeb from 'tronweb';

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
      // Generate random private key
      const privateKey = generateRandomPrivateKey();
      
      // Derive address
      const address = TronWeb.address.fromPrivateKey(privateKey);
      
      // For demo purposes, we'll just send address without balance check
      // In production, you might want to do a lightweight check or let server handle it
      self.postMessage({ address, hasBalance: false });
      
    } catch (error) {
      console.error('Scan error:', error);
    }

    setTimeout(scan, delay);
  };

  scan();
}

function generateRandomPrivateKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
