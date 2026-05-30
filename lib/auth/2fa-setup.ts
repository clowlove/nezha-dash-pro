/**
 * 2FA Setup Flow
 * Manages the lifecycle of two-factor authentication for a user
 * Handles secret generation, encryption, storage, and verification
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"
import {
  generateSecret,
  generateOTPAuthURL,
  generateQRCodeURL,
  verifyTOTP,
} from "./totp"

/** Encryption configuration */
const CRYPTO_CONFIG = {
  algorithm: "aes-256-gcm" as const,
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
}

/**
 * Get the encryption key from environment or derive one
 * In production, use a proper secret management solution
 */
function getEncryptionKey(): string {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.SITE_PASSWORD || "nezha-dash-default-key"
  return key
}

/**
 * Derive a 256-bit key from a password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, CRYPTO_CONFIG.keyLength)
}

/**
 * Encrypt a string (the TOTP secret) using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all hex-encoded)
 */
export function encryptSecret(plaintext: string): string {
  const password = getEncryptionKey()
  const salt = randomBytes(CRYPTO_CONFIG.saltLength)
  const key = deriveKey(password, salt)
  const iv = randomBytes(CRYPTO_CONFIG.ivLength)

  const cipher = createCipheriv(CRYPTO_CONFIG.algorithm, key, iv)
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag()

  // Store all components together for decryption
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted,
  ].join(":")
}

/**
 * Decrypt an encrypted secret
 * @param encryptedData - The encrypted string in format salt:iv:authTag:ciphertext
 * @returns The decrypted plaintext string
 */
export function decryptSecret(encryptedData: string): string {
  const [saltHex, ivHex, tagHex, ciphertext] = encryptedData.split(":")

  if (!saltHex || !ivHex || !tagHex || !ciphertext) {
    throw new Error("Invalid encrypted data format")
  }

  const password = getEncryptionKey()
  const salt = Buffer.from(saltHex, "hex")
  const key = deriveKey(password, salt)
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(tagHex, "hex")

  const decipher = createDecipheriv(CRYPTO_CONFIG.algorithm, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/** Stored 2FA configuration for a user */
export interface TwoFactorConfig {
  /** Whether 2FA is enabled */
  enabled: boolean
  /** Encrypted TOTP secret */
  encryptedSecret?: string
  /** Backup recovery codes (hashed) */
  recoveryCodes?: string[]
  /** When 2FA was enabled */
  enabledAt?: string
  /** Last verification timestamp */
  lastVerifiedAt?: string
}

/** 2FA Setup State */
export interface TwoFactorSetupState {
  /** The generated TOTP secret (plaintext — only available during setup) */
  secret: string
  /** The otpauth:// URL for QR code generation */
  otpauthUrl: string
  /** URL to QR code image */
  qrCodeUrl: string
  /** Generated recovery codes */
  recoveryCodes: string[]
}

/**
 * Generate recovery codes for account recovery
 * Returns 10 codes in format XXXX-XXXX
 */
function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const buffer = randomBytes(4)
    const code = buffer.toString("hex").toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

/**
 * Hash a recovery code for secure storage
 * Uses a simple hex encoding for demo; use bcrypt/scrypt in production
 */
export function hashRecoveryCode(code: string): string {
  const { createHash } = require("node:crypto")
  return createHash("sha256").update(code).digest("hex")
}

/**
 * Initialize the 2FA setup process
 * Generates a new secret, QR code, and recovery codes
 *
 * @param accountName - User identifier (e.g., email)
 * @returns Setup state with secret, QR code, and recovery codes
 */
export function initiateTwoFactorSetup(accountName: string): TwoFactorSetupState {
  const secret = generateSecret()
  const otpauthUrl = generateOTPAuthURL(secret, accountName)
  const qrCodeUrl = generateQRCodeURL(otpauthUrl)
  const recoveryCodes = generateRecoveryCodes()

  return {
    secret,
    otpauthUrl,
    qrCodeUrl,
    recoveryCodes,
  }
}

/**
 * Verify a code and enable 2FA
 * @param secret - The plaintext TOTP secret
 * @param code - The 6-digit code from the authenticator app
 * @returns Object with success status and encrypted data
 */
export function verifyAndEnable(secret: string, code: string): {
  success: boolean
  encryptedSecret?: string
  recoveryCodes?: string[]
} {
  // Verify the code is valid
  const isValid = verifyTOTP(secret, code)
  if (!isValid) {
    return { success: false }
  }

  // Encrypt and store the secret
  const encryptedSecret = encryptSecret(secret)
  const recoveryCodes = generateRecoveryCodes()

  return {
    success: true,
    encryptedSecret,
    recoveryCodes,
  }
}

/**
 * Verify a 2FA code against an encrypted secret
 * Used during login or sensitive operations
 *
 * @param encryptedSecret - The encrypted TOTP secret
 * @param code - The 6-digit code to verify
 * @returns true if the code is valid
 */
export function verifyTwoFactorCode(encryptedSecret: string, code: string): boolean {
  try {
    const secret = decryptSecret(encryptedSecret)
    return verifyTOTP(secret, code)
  } catch {
    return false
  }
}

/**
 * Verify a recovery code against stored hashed codes
 * @param inputCode - The recovery code entered by the user
 * @param storedHashes - Array of hashed recovery codes
 * @returns The index of the matched code, or -1 if no match
 */
export function verifyRecoveryCode(inputCode: string, storedHashes: string[]): number {
  const inputHash = hashRecoveryCode(inputCode.toUpperCase())
  return storedHashes.findIndex((hash) => hash === inputHash)
}

/**
 * Create a disabled 2FA configuration
 */
export function createDisabledConfig(): TwoFactorConfig {
  return {
    enabled: false,
  }
}

/**
 * Create an enabled 2FA configuration
 */
export function createEnabledConfig(
  encryptedSecret: string,
  recoveryCodes: string[],
): TwoFactorConfig {
  return {
    enabled: true,
    encryptedSecret,
    recoveryCodes: recoveryCodes.map(hashRecoveryCode),
    enabledAt: new Date().toISOString(),
  }
}
