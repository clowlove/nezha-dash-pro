/**
 * AI Diagnosis Module
 *
 * Calls an LLM API to analyse alerts and provide actionable fix suggestions.
 * Supports OpenAI-compatible APIs (OpenAI, Azure, local LLMs, etc.).
 */

import type { AIDiagnosisRequest, AIDiagnosisResult } from "./types"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface AIConfig {
  /** Base URL of the LLM API (e.g. https://api.openai.com/v1) */
  apiBaseUrl: string
  /** API key for authentication */
  apiKey: string
  /** Model to use (e.g. gpt-4o, gpt-3.5-turbo) */
  model: string
  /** Request timeout in ms */
  timeout: number
}

function getAIConfig(): AIConfig | null {
  const apiBaseUrl = process.env.AI_DIAGNOSIS_API_BASE_URL || process.env.OPENAI_API_BASE_URL
  const apiKey = process.env.AI_DIAGNOSIS_API_KEY || process.env.OPENAI_API_KEY
  const model = process.env.AI_DIAGNOSIS_MODEL || "gpt-4o-mini"

  if (!apiBaseUrl || !apiKey) {
    return null
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    apiKey,
    model,
    timeout: Number(process.env.AI_DIAGNOSIS_TIMEOUT) || 30000,
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPrompt(request: AIDiagnosisRequest): string {
  const metricDescriptions: Record<string, string> = {
    cpu: "CPU usage percentage",
    memory: "Memory usage percentage",
    disk: "Disk usage percentage",
    packet_loss: "Network packet loss percentage",
    offline: "Server offline duration in seconds",
    load: "System load average (1-min)",
    gpu: "GPU usage percentage",
    custom: "Custom metric",
  }

  const contextBlock = request.context
    ? `\nAdditional context:\n\`\`\`json\n${JSON.stringify(request.context, null, 2).slice(0, 2000)}\n\`\`\``
    : ""

  return `You are a senior Linux/Windows sysadmin and SRE assistant.
A server monitoring alert has been triggered. Analyse the situation and provide a concise root-cause analysis and actionable fix suggestions.

## Alert Details
- **Server**: ${request.serverName}
- **Metric**: ${request.metric} (${metricDescriptions[request.metric] || request.metric})
- **Current Value**: ${request.metricValue}
- **Threshold**: ${request.threshold}
- **Severity**: ${request.severity}
${contextBlock}

## Response Format (JSON only, no markdown fences)
{
  "rootCause": "<one-line root cause summary>",
  "suggestions": ["<step 1>", "<step 2>", "..."],
  "actionable": true|false
}`
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function callLLM(config: AIConfig, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout)

  try {
    const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: "You are a helpful server monitoring assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown")
      throw new Error(`LLM API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ""
    return content.trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

// ---------------------------------------------------------------------------
// Parse LLM response
// ---------------------------------------------------------------------------

function parseDiagnosisResponse(raw: string, alertId: string): AIDiagnosisResult | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned)

    if (!parsed.rootCause || !Array.isArray(parsed.suggestions)) {
      return null
    }

    return {
      alertId,
      rootCause: String(parsed.rootCause).slice(0, 500),
      suggestions: parsed.suggestions.map((s: unknown) => String(s).slice(0, 500)),
      actionable: Boolean(parsed.actionable),
      rawResponse: raw,
      diagnosedAt: new Date().toISOString(),
    }
  } catch {
    // If JSON parsing fails, wrap the raw text as a single suggestion
    return {
      alertId,
      rootCause: "AI analysis completed but response format was unexpected",
      suggestions: [raw.slice(0, 1000)],
      actionable: false,
      rawResponse: raw,
      diagnosedAt: new Date().toISOString(),
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Request an AI diagnosis for an alert.
 * Returns null if AI is not configured or the call fails.
 */
export async function requestAIDiagnosis(
  request: AIDiagnosisRequest,
): Promise<AIDiagnosisResult | null> {
  const config = getAIConfig()
  if (!config) {
    console.warn("[AI Diagnosis] No LLM API configured – skipping diagnosis")
    return null
  }

  try {
    const prompt = buildPrompt(request)
    const rawResponse = await callLLM(config, prompt)
    const result = parseDiagnosisResponse(rawResponse, request.alertId)

    if (!result) {
      console.error("[AI Diagnosis] Failed to parse LLM response:", rawResponse.slice(0, 200))
      return null
    }

    console.info(`[AI Diagnosis] Alert ${request.alertId} diagnosed: ${result.rootCause}`)
    return result
  } catch (error) {
    console.error("[AI Diagnosis] Error:", error)
    return null
  }
}

/**
 * Batch-diagnose multiple alerts (sequential with concurrency limit).
 */
export async function batchDiagnose(
  requests: AIDiagnosisRequest[],
  concurrency = 3,
): Promise<Map<string, AIDiagnosisResult>> {
  const results = new Map<string, AIDiagnosisResult>()

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((req) => requestAIDiagnosis(req)),
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      if (result.status === "fulfilled" && result.value) {
        results.set(batch[j].alertId, result.value)
      }
    }
  }

  return results
}
