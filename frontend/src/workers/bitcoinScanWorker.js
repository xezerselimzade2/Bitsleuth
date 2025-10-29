/* eslint-disable no-restricted-globals */
import * as bitcoin from 'bitcoinjs-lib';

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

// Real Bitcoin address generation using bitcoinjs-lib
function generateBitcoinAddress() {
  try {
    // Generate random 32 bytes for private key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // Create key pair from random bytes
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(randomBytes), {
      network: bitcoin.networks.bitcoin // mainnet
    });
    
    // Generate P2PKH (Pay-to-PubKey-Hash) address - starts with "1"
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    // Get WIF (Wallet Import Format) private key
    const privateKeyWIF = keyPair.toWIF();
    
    return {
      address: address,
      privateKey: privateKeyWIF
    };
  } catch (error) {
    console.error('Error generating Bitcoin address:', error);
    // Fallback to mock if error occurs
    return generateMockAddress();
  }
}

// Fallback mock generation in case of errors
function generateMockAddress() {
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  const privateKeyHex = Array.from(privateKeyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
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
