"use client"

/**
 * AlertBanner
 *
 * Renders a dismissible banner at the top of the page showing active alerts.
 * Polls /api/alerts every 30 seconds for fresh data.
 * Colour-coded by severity: critical = red, warning = amber, info = blue.
 */

import { useCallback, useEffect, useState } from "react"
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Types (subset – avoids importing server types into client)
// ---------------------------------------------------------------------------

interface BannerAlert {
  id: string
  severity: "critical" | "warning" | "info"
  message: string
  serverName: string
  status: string
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const severityConfig = {
  critical: {
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-700 dark:text-red-400",
    icon: AlertCircle,
    badge: "bg-red-500 text-white",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    badge: "bg-amber-500 text-white",
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: Info,
    badge: "bg-blue-500 text-white",
  },
} as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<BannerAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?status=active", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const active: BannerAlert[] = (data.alerts ?? [])
        .filter((a: BannerAlert) => a.status === "active")
        .map((a: BannerAlert) => ({
          id: a.id,
          severity: a.severity,
          message: a.message,
          serverName: a.serverName,
          status: a.status,
        }))
      setAlerts(active)
    } catch {
      // Silently fail – the banner is non-critical UI
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id))

  if (visibleAlerts.length === 0) return null

  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length

  // Show at most 3 alerts in collapsed mode
  const displayAlerts = expanded ? visibleAlerts : visibleAlerts.slice(0, 3)
  const hasMore = visibleAlerts.length > 3

  return (
    <div className="w-full space-y-1 px-4 py-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 dark:border-red-500/10 dark:bg-red-500/5">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {criticalCount > 0 && `${criticalCount} critical`}
            {criticalCount > 0 && warningCount > 0 && " · "}
            {warningCount > 0 && `${warningCount} warning`}
            {" alert"}{visibleAlerts.length !== 1 ? "s" : ""} active
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : `+${visibleAlerts.length - 3} more`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setDismissed(new Set(visibleAlerts.map((a) => a.id)))}
          >
            Dismiss all
          </Button>
        </div>
      </div>

      {/* Individual alert cards */}
      {displayAlerts.map((alert) => {
        const config = severityConfig[alert.severity] ?? severityConfig.info
        const Icon = config.icon

        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-1.5 transition-all",
              config.bg,
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Icon className={cn("h-4 w-4 shrink-0", config.text)} />
              <span className={cn("truncate text-sm", config.text)}>
                {alert.message}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  config.badge,
                )}
              >
                {alert.severity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
