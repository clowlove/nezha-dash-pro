/**
 * Alert REST API
 *
 * GET  /api/alerts              – list alerts (query: status, severity, serverId)
 * POST /api/alerts              – evaluate rules against current server data
 * POST /api/alerts/acknowledge  – acknowledge an alert
 * POST /api/alerts/resolve      – resolve an alert
 * POST /api/alerts/rules        – create a new alert rule
 * PUT  /api/alerts/rules        – update an existing alert rule
 * DELETE /api/alerts/rules      – delete an alert rule
 */

import { NextResponse } from "next/server"
import { createErrorResponse, requireApiSession } from "@/lib/api-route"
import { GetServerData } from "@/lib/serverFetchV2"
import {
  evaluateAllRules,
  getAllAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  getAlertsByServer,
  getAlertsBySeverity,
  purgeStaleAlerts,
} from "@/lib/alerts/alert-manager"
import {
  getAllRules,
  createRule,
  updateRule,
  deleteRule,
} from "@/lib/alerts/rules"
import type {
  AcknowledgeAlertRequest,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from "@/lib/alerts/types"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET /api/alerts
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const severity = url.searchParams.get("severity")
    const serverId = url.searchParams.get("serverId")
    const includeRules = url.searchParams.get("includeRules") === "true"

    let alerts = getAllAlerts()

    if (status === "active") {
      alerts = alerts.filter((a) => a.status === "active")
    } else if (status === "resolved") {
      alerts = alerts.filter((a) => a.status === "resolved")
    } else if (status === "acknowledged") {
      alerts = alerts.filter((a) => a.status === "acknowledged")
    }

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity)
    }

    if (serverId) {
      const id = Number(serverId)
      if (!isNaN(id)) {
        alerts = alerts.filter((a) => a.serverId === id)
      }
    }

    const response: Record<string, unknown> = {
      alerts,
      total: alerts.length,
      activeCount: getActiveAlerts().length,
    }

    if (includeRules) {
      response.rules = getAllRules()
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Error in GET /api/alerts:", error)
    return createErrorResponse(error)
  }
}

// ---------------------------------------------------------------------------
// POST /api/alerts  – trigger evaluation
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action as string

    // --- Acknowledge ---
    if (action === "acknowledge") {
      const { alertId, acknowledgedBy } = body as AcknowledgeAlertRequest & { action: string }
      if (!alertId) {
        return NextResponse.json({ error: "alertId is required" }, { status: 400 })
      }
      const alert = acknowledgeAlert(alertId, acknowledgedBy)
      return NextResponse.json({ alert }, { status: 200 })
    }

    // --- Resolve ---
    if (action === "resolve") {
      const { alertId } = body as { alertId: string; action: string }
      if (!alertId) {
        return NextResponse.json({ error: "alertId is required" }, { status: 400 })
      }
      const alert = resolveAlert(alertId)
      return NextResponse.json({ alert }, { status: 200 })
    }

    // --- Evaluate (default) ---
    const serverData = await GetServerData()
    const newAlerts = evaluateAllRules(serverData)

    // Purge stale alerts on each evaluation
    const purged = purgeStaleAlerts()

    return NextResponse.json(
      {
        newAlerts,
        triggered: newAlerts.length,
        purged,
        activeCount: getActiveAlerts().length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in POST /api/alerts:", error)
    return createErrorResponse(error)
  }
}

// ---------------------------------------------------------------------------
// PUT /api/alerts  – update rule
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const body = (await request.json()) as UpdateAlertRuleRequest
    if (!body.id) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 })
    }
    const rule = updateRule(body)
    return NextResponse.json({ rule }, { status: 200 })
  } catch (error) {
    console.error("Error in PUT /api/alerts:", error)
    return createErrorResponse(error)
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/alerts  – delete rule
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const url = new URL(request.url)
    const ruleId = url.searchParams.get("id")
    if (!ruleId) {
      return NextResponse.json({ error: "Rule id query parameter is required" }, { status: 400 })
    }
    deleteRule(ruleId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error in DELETE /api/alerts:", error)
    return createErrorResponse(error)
  }
}
