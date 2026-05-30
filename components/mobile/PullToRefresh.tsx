"use client"

import { Loader2 } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import type React from "react"

export interface PullToRefreshProps {
  /** Async callback fired when user pulls past threshold */
  onRefresh: () => Promise<void>
  /** Distance in px the user must pull to trigger refresh (default 80) */
  threshold?: number
  /** Maximum pull distance in px (default 150) */
  maxPull?: number
  children: React.ReactNode
}

type Phase = "idle" | "pulling" | "refreshing"

/**
 * Pull-to-refresh wrapper using touch events.
 * Works on mobile browsers. Purely client-side progressive enhancement.
 */
export function PullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 150,
  children,
}: PullToRefreshProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true
    return containerRef.current.scrollTop <= 0
  }, [])

  /* ---- touch handlers ---- */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (phase === "refreshing") return
      if (!isAtTop()) return
      startY.current = e.touches[0].clientY
    },
    [phase, isAtTop],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (phase === "refreshing") return
      if (!isAtTop()) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0) {
        // Apply rubber-band effect: diminishing returns past threshold
        const dampened = Math.min(dy * 0.5, maxPull)
        setPullDistance(dampened)
        setPhase("pulling")
      }
    },
    [phase, maxPull, isAtTop],
  )

  const handleTouchEnd = useCallback(async () => {
    if (phase === "refreshing") return
    if (pullDistance >= threshold) {
      setPhase("refreshing")
      setPullDistance(40) // snap to spinner height
      try {
        await onRefresh()
      } finally {
        setPhase("idle")
        setPullDistance(0)
      }
    } else {
      setPhase("idle")
      setPullDistance(0)
    }
  }, [phase, pullDistance, threshold, onRefresh])

  return (
    <div
      ref={containerRef}
      className="ptr-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="ptr-indicator"
        style={{
          height: pullDistance,
          opacity: phase === "pulling" ? Math.min(pullDistance / threshold, 1) : 1,
        }}
        aria-live="polite"
        aria-label={
          phase === "refreshing"
            ? "Refreshing content…"
            : pullDistance >= threshold
              ? "Release to refresh"
              : "Pull down to refresh"
        }
      >
        {phase === "refreshing" ? (
          <Loader2 className="ptr-spinner" size={22} aria-hidden="true" />
        ) : (
          <svg
            className="ptr-arrow"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: pullDistance >= threshold ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </div>

      {/* Page content */}
      <div className="ptr-content">{children}</div>
    </div>
  )
}
