"use client"

import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import type React from "react"

export interface MobileAlertSheetProps {
  /** Controls visibility */
  open: boolean
  /** Called when the sheet should close (swipe down or X button) */
  onClose: () => void
  /** Alert title */
  title: string
  /** Severity level */
  severity?: "info" | "warning" | "critical"
  /** Timestamp string */
  timestamp?: string
  /** Alert body / description */
  children: React.ReactNode
}

const severityStyles: Record<string, string> = {
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
  critical: "border-l-red-500",
}

const severityBadge: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

/**
 * Mobile bottom sheet for alert details.
 * Slides up from the bottom, dismissible by swiping down or tapping the close button.
 * Uses CSS transitions; the sheet lives in the DOM and is toggled with a class.
 */
export function MobileAlertSheet({
  open,
  onClose,
  title,
  severity = "info",
  timestamp,
  children,
}: MobileAlertSheetProps) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(0)

  /* ---- swipe-down-to-dismiss ---- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy) // only drag downward
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (dragY > 120) {
      onClose()
    }
    setDragY(0)
  }, [dragY, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn("mobile-sheet__backdrop", open && "mobile-sheet__backdrop--visible")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className={cn("mobile-sheet", open && "mobile-sheet--open")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: open ? `translateY(${dragY}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="mobile-sheet__handle" aria-hidden="true">
          <div className="mobile-sheet__handle-bar" />
        </div>

        {/* Header */}
        <div className={cn("mobile-sheet__header", `border-l-4 ${severityStyles[severity]}`)}>
          <div className="flex-1 min-w-0">
            <h2 className="mobile-sheet__title">{title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("mobile-sheet__badge", severityBadge[severity])}>
                {severity}
              </span>
              {timestamp && (
                <span className="text-xs text-muted-foreground">{timestamp}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mobile-sheet__close"
            aria-label="Close alert details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="mobile-sheet__body">{children}</div>
      </div>
    </>
  )
}
