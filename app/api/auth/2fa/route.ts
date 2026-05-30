/**
 * 2FA API Route
 * POST /api/auth/2fa - Enable, verify, or disable two-factor authentication
 */
import { type NextRequest, NextResponse } from "next/server"
import { requireApiSession, createErrorResponse } from "@/lib/api-route"
import {
  initiateTwoFactorSetup,
  verifyAndEnable,
  verifyTwoFactorCode,
  encryptSecret,
} from "@/lib/auth/2fa-setup"
import { verifyTOTP } from "@/lib/auth/totp"

/**
 * In-memory 2FA store (replace with database in production)
 * Maps user ID to their 2FA configuration
 */
const twoFactorStore = new Map<
  string,
  {
    enabled: boolean
    encryptedSecret?: string
    pendingSecret?: string
    recoveryCodes?: string[]
  }
>()

/**
 * POST /api/auth/2fa
 * Actions: setup, verify, enable, disable
 *
 * Body: { action: "setup" | "verify" | "enable" | "disable", code?: string, secret?: string }
 */
export async function POST(request: NextRequest) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const body = await request.json()
    const { action, code, secret } = body as {
      action: string
      code?: string
      secret?: string
    }

    // Use a fixed user ID for demo; replace with actual session user ID
    const userId = "admin"

    switch (action) {
      case "setup": {
        // Generate a new 2FA setup (secret + QR code)
        const setupState = initiateTwoFactorSetup(userId)

        // Store the pending secret temporarily
        const existing = twoFactorStore.get(userId) || { enabled: false }
        twoFactorStore.set(userId, {
          ...existing,
          pendingSecret: setupState.secret,
        })

        return NextResponse.json(
          {
            data: {
              secret: setupState.secret,
              otpauthUrl: setupState.otpauthUrl,
              qrCodeUrl: setupState.qrCodeUrl,
              recoveryCodes: setupState.recoveryCodes,
            },
          },
          { status: 200 },
        )
      }

      case "enable": {
        // Verify the code and enable 2FA
        if (!code) {
          return NextResponse.json(
            { error: "Verification code is required" },
            { status: 400 },
          )
        }

        const userData = twoFactorStore.get(userId)
        if (!userData?.pendingSecret) {
          return NextResponse.json(
            { error: "No pending 2FA setup. Please initiate setup first." },
            { status: 400 },
          )
        }

        const result = verifyAndEnable(userData.pendingSecret, code)
        if (!result.success) {
          return NextResponse.json(
            { error: "Invalid verification code. Please try again." },
            { status: 400 },
          )
        }

        // Enable 2FA for this user
        twoFactorStore.set(userId, {
          enabled: true,
          encryptedSecret: result.encryptedSecret,
          recoveryCodes: result.recoveryCodes,
        })

        return NextResponse.json(
          {
            data: {
              enabled: true,
              message: "Two-factor authentication has been enabled successfully.",
            },
          },
          { status: 200 },
        )
      }

      case "verify": {
        // Verify a 2FA code (used during login)
        if (!code) {
          return NextResponse.json(
            { error: "Verification code is required" },
            { status: 400 },
          )
        }

        const userData = twoFactorStore.get(userId)
        if (!userData?.enabled || !userData.encryptedSecret) {
          return NextResponse.json(
            { error: "Two-factor authentication is not enabled." },
            { status: 400 },
          )
        }

        const isValid = verifyTwoFactorCode(userData.encryptedSecret, code)
        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid verification code." },
            { status: 400 },
          )
        }

        return NextResponse.json(
          { data: { verified: true } },
          { status: 200 },
        )
      }

      case "disable": {
        // Disable 2FA — requires current code for security
        if (!code) {
          return NextResponse.json(
            { error: "Current verification code is required to disable 2FA." },
            { status: 400 },
          )
        }

        const userData = twoFactorStore.get(userId)
        if (!userData?.enabled || !userData.encryptedSecret) {
          return NextResponse.json(
            { error: "Two-factor authentication is not currently enabled." },
            { status: 400 },
          )
        }

        // Verify the current code before disabling
        const isValid = verifyTwoFactorCode(userData.encryptedSecret, code)
        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid verification code. Cannot disable 2FA." },
            { status: 400 },
          )
        }

        // Disable 2FA
        twoFactorStore.set(userId, { enabled: false })

        return NextResponse.json(
          {
            data: {
              enabled: false,
              message: "Two-factor authentication has been disabled.",
            },
          },
          { status: 200 },
        )
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Error in 2FA handler:", error)
    return createErrorResponse(error)
  }
}

/**
 * GET /api/auth/2fa
 * Get the current 2FA status for the authenticated user
 */
export async function GET() {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const userId = "admin"
    const userData = twoFactorStore.get(userId)

    return NextResponse.json(
      {
        data: {
          enabled: userData?.enabled || false,
          hasRecoveryCodes: (userData?.recoveryCodes?.length ?? 0) > 0,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in 2FA GET handler:", error)
    return createErrorResponse(error)
  }
}
