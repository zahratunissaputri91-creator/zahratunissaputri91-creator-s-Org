/**
 * Security & Cryptographic Utilities for E-Pilketos/E-Pilkosim
 * Enforces Luber-Jurdil (Langsung, Umum, Bebas, Rahasia, Jujur, Adil)
 */

// Characters excluding ambiguous glyphs (no 0, O, 1, I, L)
const PIN_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateSecurePin(length = 6): string {
  let pin = '';
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : null;
  
  if (cryptoObj && cryptoObj.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    cryptoObj.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      pin += PIN_CHARSET[randomBytes[i] % PIN_CHARSET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      pin += PIN_CHARSET[Math.floor(Math.random() * PIN_CHARSET.length)];
    }
  }
  return pin;
}

export async function hashString(value: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(value);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple fast hash for non-crypto contexts
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16).padStart(8, '0');
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
