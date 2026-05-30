"use client"

import { cn } from "@/lib/utils"
import {
  Home,
  Server,
  Network,
  Bell,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  /** Optional badge count shown on the icon */
  badge?: number
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/network", label: "Network", icon: Network },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
]

/**
 * Mobile bottom tab navigation bar.
 * Hidden on screens > 768px via CSS class `mobile-nav`.
 * Uses native <nav> semantics so the menu is accessible even without JS.
 */
export function MobileNav() {
  const pathname = usePathname()

  /** Determine active tab based on current route */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="mobile-nav"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="mobile-nav__inner">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "mobile-nav__item",
                active && "mobile-nav__item--active",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-nav__icon-wrapper">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  aria-hidden="true"
                />
                {badge != null && badge > 0 && (
                  <span className="mobile-nav__badge" aria-label={`${badge} alerts`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="mobile-nav__label">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
