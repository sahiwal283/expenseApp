/**
 * Data Encryption Utilities
 * 
 * Provides client-side encryption for sensitive data stored in IndexedDB.
 * Uses Web Crypto API for AES-GCM encryption with derived keys.
 */

// ========== TYPE DEFINITIONS ==========

export interface EncryptedData {
  ciphertext: string;       // Base64 encoded encrypted data
  iv: string;               // Base64 encoded initialization vector
  salt: string;             // Base64 encoded salt for key derivation
  version: number;          // Encryption version for future upgrades
}

export interface EncryptionKey {
  key: CryptoKey;
  salt: Uint8Array;
}

// ========== CONSTANTS ==========

const ENCRYPTION_VERSION = 1;
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;  // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;  // PBKDF2 iterations

// ========== KEY MANAGEMENT ==========

/**
 * Generate encryption key from password/session token
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<EncryptionKey> {
  // Use provided salt or generate new one
  const keySalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: keySalt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,  // Not extractable
    ['encrypt', 'decrypt']
  );

  return { key, salt: keySalt };
}

/**
 * Get or create encryption key for current session
 */
let sessionKey: EncryptionKey | null = null;

export async function getSessionKey(): Promise<EncryptionKey> {
  if (sessionKey) {
    return sessionKey;
  }

  // Derive key from user session token + device fingerprint
  const sessionToken = getSessionToken();
  const deviceFingerprint = await getDeviceFingerprint();
  const keyMaterial = `${sessionToken}:${deviceFingerprint}`;

  sessionKey = await deriveKey(keyMaterial);
  console.log('[Encryption] Session key derived');
  
  return sessionKey;
}

/**
 * Clear session encryption key (on logout)
 */
export function clearSessionKey(): void {
  sessionKey = null;
  console.log('[Encryption] Session key cleared');
}

/**
 * Get session token from localStorage
 */
function getSessionToken(): string {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No session token found - user must be logged in');
  }
  return token;
}

/**
 * Generate device fingerprint
 */
async function getDeviceFingerprint(): Promise<string> {
  // Combine various browser characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform
  ];

  const fingerprint = components.join('|');
  
  // Hash the fingerprint
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// ========== ENCRYPTION/DECRYPTION ==========

/**
 * Encrypt data
 */
export async function encrypt(data: any): Promise<EncryptedData> {
  try {
    const { key, salt } = await getSessionKey();
    
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);
    const plaintext = new TextEncoder().encode(jsonString);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      plaintext
    );

    // Convert to base64 for storage
    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
      version: ENCRYPTION_VERSION
    };
  } catch (error: any) {
    console.error('[Encryption] Encrypt failed:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data
 */
export async function decrypt(encryptedData: EncryptedData): Promise<any> {
  try {
    // Check version
    if (encryptedData.version !== ENCRYPTION_VERSION) {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }

    // Convert from base64
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));

    // Derive key with stored salt
    const { key } = await deriveKey(
      `${getSessionToken()}:${await getDeviceFingerprint()}`,
      salt
    );

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(iv)
      },
      key,
      ciphertext
    );

    // Convert back to object
    const jsonString = new TextDecoder().decode(plaintext);
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error('[Encryption] Decrypt failed:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// ========== FIELD-LEVEL ENCRYPTION ==========

/**
 * Encrypt specific fields in an object
 */
export async function encryptFields(
  obj: any,
  fields: string[]
): Promise<any> {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[`${field}_encrypted`] = await encrypt(result[field]);
      delete result[field];  // Remove plaintext
    }
  }

  return result;
}

/**
 * Decrypt specific fields in an object
 */
export async function decryptFields(
  obj: any,
  fields: string[]
): Promise<any> {
  const result = { ...obj };

  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;
    if (result[encryptedField]) {
      try {
        result[field] = await decrypt(result[encryptedField]);
        delete result[encryptedField];  // Remove encrypted data
      } catch (error) {
        console.error(`[Encryption] Failed to decrypt field ${field}:`, error);
        result[field] = null;  // Set to null on decrypt failure
      }
    }
  }

  return result;
}

// ========== SENSITIVE FIELD DEFINITIONS ==========

/**
 * Define which fields should be encrypted for each entity type
 */
export const SENSITIVE_FIELDS = {
  expense: ['amount', 'merchant', 'description', 'receiptUrl'],
  user: ['email', 'name'],
  event: ['location', 'budget']
};

/**
 * Encrypt an expense object
 */
export async function encryptExpense(expense: any): Promise<any> {
  return await encryptFields(expense, SENSITIVE_FIELDS.expense);
}

/**
 * Decrypt an expense object
 */
export async function decryptExpense(expense: any): Promise<any> {
  return await decryptFields(expense, SENSITIVE_FIELDS.expense);
}

/**
 * Encrypt a user object
 */
export async function encryptUser(user: any): Promise<any> {
  return await encryptFields(user, SENSITIVE_FIELDS.user);
}

/**
 * Decrypt a user object
 */
export async function decryptUser(user: any): Promise<any> {
  return await decryptFields(user, SENSITIVE_FIELDS.user);
}

/**
 * Encrypt an event object
 */
export async function encryptEvent(event: any): Promise<any> {
  return await encryptFields(event, SENSITIVE_FIELDS.event);
}

/**
 * Decrypt an event object
 */
export async function decryptEvent(event: any): Promise<any> {
  return await decryptFields(event, SENSITIVE_FIELDS.event);
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ========== SECURE DELETION ==========

/**
 * Securely delete sensitive data from memory
 * Note: In JavaScript, true secure deletion is limited, but we do our best
 */
export function secureDelete(obj: any): void {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          // Overwrite string with zeros (limited effectiveness in JS)
          obj[key] = '\0'.repeat(obj[key].length);
        } else if (typeof obj[key] === 'object') {
          secureDelete(obj[key]);
        }
        delete obj[key];
      }
    }
  }
}

/**
 * Clear all encryption-related data on logout
 */
export async function clearEncryptionData(): Promise<void> {
  console.log('[Encryption] Clearing all encryption data...');
  
  // Clear session key
  clearSessionKey();
  
  // Clear any cached encrypted data
  // (This would be handled by offlineDb.clearAllData())
  
  console.log('[Encryption] Encryption data cleared');
}

// ========== TESTING/VALIDATION ==========

/**
 * Test encryption/decryption functionality
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = {
      text: 'Hello, World!',
      number: 12345,
      nested: { foo: 'bar' }
    };

    console.log('[Encryption] Testing encryption...');
    const encrypted = await encrypt(testData);
    console.log('[Encryption] Encrypted:', encrypted);

    const decrypted = await decrypt(encrypted);
    console.log('[Encryption] Decrypted:', decrypted);

    const isValid = JSON.stringify(testData) === JSON.stringify(decrypted);
    
    if (isValid) {
      console.log('[Encryption] ✓ Encryption test passed');
    } else {
      console.error('[Encryption] ✗ Encryption test failed - data mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('[Encryption] ✗ Encryption test failed:', error);
    return false;
  }
}

// ========== EXPORTS ==========

export default {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptExpense,
  decryptExpense,
  encryptUser,
  decryptUser,
  encryptEvent,
  decryptEvent,
  getSessionKey,
  clearSessionKey,
  clearEncryptionData,
  secureDelete,
  testEncryption
};

