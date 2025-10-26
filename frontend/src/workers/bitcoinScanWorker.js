/* eslint-disable no-restricted-globals */

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

// Simple Bitcoin address generation (for demo purposes)
// In production, use proper Bitcoin library
function generateBitcoinAddress() {
  // Generate random private key (32 bytes hex)
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  const privateKeyHex = Array.from(privateKeyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Generate a mock Bitcoin address (starting with 1)
  const mockAddress = '1' + Array.from({length: 33}, () => 
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
  ).join('');
  
  return {
    address: mockAddress,
    privateKey: privateKeyHex
  };
}

function startScanning() {
  const delay = mode === 'premium' ? 10 : 100; // ms between generations

  const scan = async () => {
    if (!running) return;

    try {
      const { address, privateKey } = generateBitcoinAddress();
      
      // Send address back to main thread
      self.postMessage({ 
        address, 
        privateKey,
        hasBalance: false 
      });
      
    } catch (error) {
      console.error('Scan error:', error);
    }

    setTimeout(scan, delay);
  };

  scan();
}
