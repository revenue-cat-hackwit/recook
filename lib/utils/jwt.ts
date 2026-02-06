import { decode } from 'base64-arraybuffer';

/**
 * Decode a JWT token using base64-arraybuffer to avoid 'atob' issues in React Native
 */
export const decodeJwt = (token: string): any => {
  try {
    if (!token) return {};
    
    const parts = token.split('.');
    if (parts.length < 2) return {};

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const arrayBuffer = decode(base64);
    
    // ArrayBuffer -> Binary String
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    // Process in chunks to avoid stack overflow with large tokens if using spread/apply
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Binary String -> UTF-8 String (handles special chars/emojis correctly)
    const jsonPayload = decodeURIComponent(
        binary.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return {};
  }
};
