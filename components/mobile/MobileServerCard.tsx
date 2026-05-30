"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, Cpu, HardDrive, MemoryStick, Wifi } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import type React from "react"

export type ServerStatus = "online" | "offline" | "warning" | "unknown"

export interface MobileServerCardProps {
  name: string
  host: string
  status: ServerStatus
  cpu: number
  memory: { used: number; total: number }
  disk: { used: number; total: number }
  network: { up: string; down: string }
  uptime?: string
  /** Extra detail rows rendered inside the expanded area */
  details?: React.ReactNode
}

const statusColorMap: Record<ServerStatus, string> = {
  online: "bg-green-500",
  offline: "bg-red-500",
  warning: "bg-amber-500",
  unknown: "bg-gray-400",
}

const statusLabelMap: Record<ServerStatus, string> = {
  online: "Online",
  offline: "Offline",
  warning: "Warning",
  unknown: "Unknown",
}

function formatBytes(gb: number) {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

function UsageBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="mobile-card__usage-track">
      <div
        className={cn("mobile-card__usage-fill", color)}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

/**
 * Touch-friendly server card for mobile.
 * - Compact layout by default
 * - Tap to expand inline details
 * - Swipe-left to reveal quick actions (future)
 * - Status indicator with color coding
 */
export function MobileServerCard(props: MobileServerCardProps) {
  const { name, host, status, cpu, memory, disk, network, uptime, details } = props
  const [expanded, setExpanded] = useState(false)
  const touchStartX = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const memPercent = (memory.used / memory.total) * 100
  const diskPercent = (disk.used / disk.total) * 100

  /* ---- swipe gesture handling ---- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    // Only allow left swipe (negative dx), capped at -80px
    if (dx < 0) setSwipeOffset(Math.max(dx, -80))
  }, [])

  const handleTouchEnd = useCallback(() => {
    // If swiped more than 60px left, could trigger action in future
    setSwipeOffset(0)
  }, [])

  return (
    <div
      className={cn("mobile-card", expanded && "mobile-card--expanded")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe reveal area (behind the card) */}
      <div className="mobile-card__swipe-actions" aria-hidden="true">
        <span className="text-xs text-muted-foreground">Actions</span>
      </div>

      {/* Main card content, translated on swipe */}
      <div
        className="mobile-card__content"
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        {/* Header row */}
        <button
          type="button"
          className="mobile-card__header"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${name} – ${statusLabelMap[status]}. Tap to ${expanded ? "collapse" : "expand"} details.`}
        >
          <div className="mobile-card__header-left">
            <span
              className={cn("mobile-card__status-dot", statusColorMap[status])}
              aria-label={statusLabelMap[status]}
            />
            <div className="mobile-card__title-group">
              <span className="mobile-card__name">{name}</span>
              <span className="mobile-card__host">{host}</span>
            </div>
          </div>

          <div className="mobile-card__header-right">
            {uptime && <span className="mobile-card__uptime">{uptime}</span>}
            <ChevronDown
              size={16}
              className={cn(
                "mobile-card__chevron transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Compact stats row */}
        <div className="mobile-card__stats">
          <div className="mobile-card__stat">
            <Cpu size={14} aria-hidden="true" />
            <span className="mobile-card__stat-label">CPU</span>
            <span className="mobile-card__stat-value">{cpu.toFixed(1)}%</span>
            <UsageBar
              percent={cpu}
              color={cpu > 90 ? "bg-red-500" : cpu > 70 ? "bg-amber-500" : "bg-green-500"}
            />
          </div>

          <div className="mobile-card__stat">
            <MemoryStick size={14} aria-hidden="true" />
            <span className="mobile-card__stat-label">RAM</span>
            <span className="mobile-card__stat-value">
              {formatBytes(memory.used)}/{formatBytes(memory.total)}
            </span>
            <UsageBar
              percent={memPercent}
              color={memPercent > 90 ? "bg-red-500" : memPercent > 70 ? "bg-amber-500" : "bg-blue-500"}
            />
          </div>

          <div className="mobile-card__stat">
            <HardDrive size={14} aria-hidden="true" />
            <span className="mobile-card__stat-label">Disk</span>
            <span className="mobile-card__stat-value">
              {formatBytes(disk.used)}/{formatBytes(disk.total)}
            </span>
            <UsageBar
              percent={diskPercent}
              color={diskPercent > 90 ? "bg-red-500" : diskPercent > 70 ? "bg-amber-500" : "bg-purple-500"}
            />
          </div>

          <div className="mobile-card__stat">
            <Wifi size={14} aria-hidden="true" />
            <span className="mobile-card__stat-label">Net</span>
            <span className="mobile-card__stat-value">↑{network.up} ↓{network.down}</span>
          </div>
        </div>

        {/* Expandable detail section */}
        {expanded && (
          <div className="mobile-card__details" role="region" aria-label={`${name} details`}>
            {details ?? (
              <p className="text-xs text-muted-foreground">No additional details available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
