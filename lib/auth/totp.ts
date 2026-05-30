/**
 * TOTP (Time-based One-Time Password) implementation
 * Compatible with Google Authenticator, Authy, and other TOTP apps
 * Uses Node.js crypto module — no external dependencies
 */
import { createHmac, randomBytes } from "node:crypto"

/** TOTP configuration constants */
const TOTP_CONFIG = {
  /** Number of digits in the TOTP code */
  digits: 6,
  /** Time step in seconds */
  period: 30,
  /** HMAC algorithm */
  algorithm: "sha1" as const,
  /** Secret key length in bytes (160 bits for SHA-1) */
  secretLength: 20,
  /** Issuer name shown in authenticator apps */
  issuer: "NezhaDash",
} as const

/**
 * RFC 4648 Base32 encoding table
 */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/**
 * Encode a Buffer to Base32 string (RFC 4648)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = ""
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0")
  }

  let result = ""
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0")
    result += BASE32_CHARS[Number.parseInt(chunk, 2)]
  }

  return result
}

/**
 * Decode a Base32 string to Buffer
 */
export function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = ""

  for (const char of clean) {
    const index = BASE32_CHARS.indexOf(char)
    if (index === -1) throw new Error(`Invalid Base32 character: ${char}`)
    bits += index.toString(2).padStart(5, "0")
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2))
  }

  return Buffer.from(bytes)
}

/**
 * Generate a cryptographically random secret key
 * @returns Base32-encoded secret string
 */
export function generateSecret(): string {
  const buffer = randomBytes(TOTP_CONFIG.secretLength)
  return base32Encode(buffer)
}

/**
 * Compute the HMAC-SHA1 hash for a given counter value
 */
function hmacSha1(key: Buffer, counter: Buffer): Buffer {
  const hmac = createHmac(TOTP_CONFIG.algorithm, key)
  hmac.update(counter)
  return hmac.digest()
}

/**
 * Convert an integer to an 8-byte big-endian Buffer
 */
function intToBuffer(num: number): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(num / 0x100000000), 0)
  buffer.writeUInt32BE(num & 0xffffffff, 4)
  return buffer
}

/**
 * Generate a TOTP code for the current time
 * @param secret - Base32-encoded secret key
 * @param time - Current time in milliseconds (defaults to Date.now())
 * @returns The 6-digit TOTP code as a string (zero-padded)
 */
export function generateTOTP(secret: string, time?: number): string {
  const now = time ?? Date.now()
  const counter = Math.floor(now / 1000 / TOTP_CONFIG.period)
  return generateHOTP(secret, counter)
}

/**
 * Generate an HOTP code for a given counter (RFC 4226)
 */
function generateHOTP(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const counterBuffer = intToBuffer(counter)
  const hash = hmacSha1(key, counterBuffer)

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = hash[hash.length - 1]! & 0x0f
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff)

  const otp = binary % 10 ** TOTP_CONFIG.digits
  return otp.toString().padStart(TOTP_CONFIG.digits, "0")
}

/**
 * Verify a TOTP token with a configurable time window
 * Checks the current period and ±1 period to account for clock skew
 *
 * @param secret - Base32-encoded secret key
 * @param token - The 6-digit code to verify
 * @param window - Number of time steps to check before/after current (default: 1)
 * @returns true if the token is valid
 */
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const now = Date.now()

  for (let i = -window; i <= window; i++) {
    const adjustedTime = now + i * TOTP_CONFIG.period * 1000
    const expected = generateTOTP(secret, adjustedTime)

    // Constant-time comparison to prevent timing attacks
    if (constantTimeCompare(expected, token)) {
      return true
    }
  }

  return false
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Generate an otpauth:// URI for QR code generation
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 *
 * @param secret - Base32-encoded secret key
 * @param accountName - User account identifier (e.g., email)
 * @param issuer - Application name
 * @returns otpauth:// URI string
 */
export function generateOTPAuthURL(
  secret: string,
  accountName: string,
  issuer: string = TOTP_CONFIG.issuer,
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: TOTP_CONFIG.digits.toString(),
    period: TOTP_CONFIG.period.toString(),
  })

  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(accountName)

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?${params.toString()}`
}

/**
 * Generate a QR code data URL using an external QR service
 * For production, use a library like `qrcode` instead
 *
 * @param otpauthUrl - The otpauth:// URI
 * @param size - QR code image size in pixels (default: 256)
 * @returns URL to a QR code image
 */
export function generateQRCodeURL(otpauthUrl: string, size = 256): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(otpauthUrl)}`
}

/**
 * Get the remaining seconds until the next TOTP code rotation
 */
export function getRemainingSeconds(): number {
  const now = Math.floor(Date.now() / 1000)
  return TOTP_CONFIG.period - (now % TOTP_CONFIG.period)
}
