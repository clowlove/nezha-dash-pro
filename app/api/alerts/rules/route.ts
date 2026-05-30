/**
 * Alert Rules API
 *
 * POST /api/alerts/rules  – create a new alert rule
 * GET  /api/alerts/rules  – list all alert rules
 */

import { NextResponse } from "next/server"
import { createErrorResponse, requireApiSession } from "@/lib/api-route"
import { getAllRules, createRule } from "@/lib/alerts/rules"
import type { CreateAlertRuleRequest } from "@/lib/alerts/types"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET /api/alerts/rules
// ---------------------------------------------------------------------------

export async function GET() {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const rules = getAllRules()
    return NextResponse.json({ rules, total: rules.length }, { status: 200 })
  } catch (error) {
    console.error("Error in GET /api/alerts/rules:", error)
    return createErrorResponse(error)
  }
}

// ---------------------------------------------------------------------------
// POST /api/alerts/rules
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) return unauthorizedResponse

  try {
    const body = (await request.json()) as CreateAlertRuleRequest

    if (!body.name || !body.metric || !body.operator || body.threshold === undefined) {
      return NextResponse.json(
        { error: "name, metric, operator, and threshold are required" },
        { status: 400 },
      )
    }

    const rule = createRule(body)
    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/alerts/rules:", error)
    return createErrorResponse(error)
  }
}
