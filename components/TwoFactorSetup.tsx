"use client"

import { useEffect, useState, useCallback } from "react"
import { ShieldCheck, ShieldAlert, Copy, Check, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** 2FA setup steps */
type SetupStep = "init" | "scan" | "verify" | "complete"

/** Setup data from the API */
interface SetupData {
  secret: string
  otpauthUrl: string
  qrCodeUrl: string
  recoveryCodes: string[]
}

interface TwoFactorSetupProps {
  /** Callback when 2FA state changes */
  onStatusChange?: (enabled: boolean) => void
  /** Whether 2FA is currently enabled */
  initialEnabled?: boolean
  /** Custom class name */
  className?: string
}

export function TwoFactorSetup({
  onStatusChange,
  initialEnabled = false,
  className,
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>(initialEnabled ? "complete" : "init")
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDisable, setShowDisable] = useState(false)

  /**
   * Initiate 2FA setup — fetches QR code and secret
   */
  const handleInitiateSetup = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to initiate 2FA setup")

      setSetupData(data.data)
      setStep("scan")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Verify the entered code and enable 2FA
   */
  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code: verificationCode }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Verification failed")

      setEnabled(true)
      setStep("complete")
      onStatusChange?.(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }, [verificationCode, onStatusChange])

  /**
   * Disable 2FA
   */
  const handleDisable = useCallback(async () => {
    if (disableCode.length !== 6) {
      setError("Please enter a 6-digit verification code to disable 2FA")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code: disableCode }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to disable 2FA")

      setEnabled(false)
      setStep("init")
      setSetupData(null)
      setDisableCode("")
      setShowDisable(false)
      onStatusChange?.(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA")
    } finally {
      setLoading(false)
    }
  }, [disableCode, onStatusChange])

  /**
   * Copy secret to clipboard
   */
  const handleCopySecret = useCallback(async () => {
    if (!setupData?.secret) return
    await navigator.clipboard.writeText(setupData.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [setupData])

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          )}
          <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          {enabled
            ? "2FA is currently enabled. Your account has an extra layer of security."
            : "Add an extra layer of security to your account with 2FA."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step: Init — Start setup or show disable option */}
        {step === "init" && !enabled && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Scan a QR code with your authenticator app (Google Authenticator, Authy, etc.)
              to enable two-factor authentication.
            </p>
            <Button onClick={handleInitiateSetup} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set up 2FA
            </Button>
          </div>
        )}

        {/* Step: Scan — Show QR code and secret */}
        {step === "scan" && setupData && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Scan this QR code with your authenticator app, or manually enter the secret key.
            </p>

            {/* QR Code */}
            <div className="flex justify-center rounded-lg bg-white p-4">
              <img
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                className="h-48 w-48"
              />
            </div>

            {/* Secret key */}
            <div className="space-y-2">
              <Label className="text-xs">Secret Key (manual entry)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                  {setupData.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Recovery codes */}
            <div className="space-y-2">
              <Label className="text-xs">Recovery Codes (save these somewhere safe)</Label>
              <div className="grid grid-cols-2 gap-1 rounded bg-muted p-3 font-mono text-xs">
                {setupData.recoveryCodes.map((code) => (
                  <span key={code} className="text-muted-foreground">
                    {code}
                  </span>
                ))}
              </div>
            </div>

            <Button onClick={() => setStep("verify")} className="w-full">
              Continue to Verify
            </Button>
          </div>
        )}

        {/* Step: Verify — Enter code */}
        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code from your authenticator app to verify the setup.
            </p>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "")
                  setVerificationCode(val)
                  setError(null)
                }}
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("scan")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete — 2FA is enabled */}
        {step === "complete" && enabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-600 dark:text-green-400">
              <ShieldCheck className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-medium text-sm">2FA is enabled</p>
                <p className="text-xs opacity-80">
                  Your account is protected with two-factor authentication.
                </p>
              </div>
            </div>

            {!showDisable ? (
              <Button
                variant="destructive"
                onClick={() => setShowDisable(true)}
                className="w-full"
              >
                Disable 2FA
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
                <p className="text-muted-foreground text-sm">
                  Enter your current 2FA code to disable two-factor authentication.
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => {
                    setDisableCode(e.target.value.replace(/\D/g, ""))
                    setError(null)
                  }}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisable(false)
                      setDisableCode("")
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={loading || disableCode.length !== 6}
                    className="flex-1"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Disable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
