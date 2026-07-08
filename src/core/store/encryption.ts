/**
 * Client-side, PIN-derived encryption for financial data at rest.
 *
 * Sensitive keys are stored in localStorage as AES-GCM ciphertext, using a key
 * derived from the user's PIN via PBKDF2 (the same slow, salted derivation
 * family as the PIN hash). The key exists only in memory after unlock — only
 * ciphertext is ever written to disk.
 *
 * Deliberate limitations, stated honestly:
 *  - The cloud (Firestore) copy stays plaintext, protected by Firebase Auth +
 *    security rules. This is the safety net: a forgotten PIN never loses data —
 *    it re-syncs from the cloud and re-encrypts under the new PIN.
 *  - Because a PIN is short, ciphertext on a stolen device is theoretically
 *    brute-forceable offline; the PBKDF2 iteration count is what makes each
 *    guess expensive.
 */

const ENC_PREFIX = "enc:v1:";
const KDF_ITERATIONS = 200_000;
const SALT_KEY = "enc_salt";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Load (or lazily create) the persistent per-device KDF salt. The salt is not
 * secret — it only ensures the derived key isn't a plain hash of the PIN.
 */
function getEncryptionSalt(): Uint8Array<ArrayBuffer> {
  let stored = localStorage.getItem(SALT_KEY);
  if (!stored) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    stored = bytesToBase64(salt);
    localStorage.setItem(SALT_KEY, stored);
  }
  return base64ToBytes(stored);
}

/** Derive an AES-GCM encryption key from the PIN. Keep the result in memory only. */
export async function deriveKeyFromPin(pin: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: getEncryptionSalt(), iterations: KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** True if a stored raw string is one of our ciphertext blobs. */
export function isEncrypted(raw: string): boolean {
  return raw.startsWith(ENC_PREFIX);
}

/** Encrypt a JSON-serialisable value → `enc:v1:<base64(iv | ciphertext)>`. */
export async function encryptValue(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return ENC_PREFIX + bytesToBase64(packed);
}

/** Decrypt a blob from encryptValue. Throws on a wrong key or corrupt data. */
export async function decryptValue(key: CryptoKey, raw: string): Promise<unknown> {
  const packed = base64ToBytes(raw.slice(ENC_PREFIX.length));
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(decoder.decode(plaintext));
}
