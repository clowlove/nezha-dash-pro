"use client"

/**
 * AlertConfig
 *
 * Settings panel for managing alert rules.
 * Allows creating, editing, toggling, and deleting alert rules.
 */

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Save, X, Power } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Types (client-safe subset)
// ---------------------------------------------------------------------------

type AlertSeverity = "critical" | "warning" | "info"
type AlertMetricType = "cpu" | "memory" | "disk" | "packet_loss" | "offline" | "load" | "gpu" | "custom"
type ComparisonOperator = ">" | ">=" | "<" | "<=" | "==" | "!="

interface AlertRule {
  id: string
  name: string
  description?: string
  enabled: boolean
  metric: AlertMetricType
  operator: ComparisonOperator
  threshold: number
  severity: AlertSeverity
  duration: number
  cooldown: number
  notificationChannelIds: string[]
  serverIds?: number[]
  createdAt: string
  updatedAt: string
}

interface RuleFormData {
  name: string
  description: string
  metric: AlertMetricType
  operator: ComparisonOperator
  threshold: string
  severity: AlertSeverity
  duration: string
  cooldown: string
  enabled: boolean
}

const DEFAULT_FORM: RuleFormData = {
  name: "",
  description: "",
  metric: "cpu",
  operator: ">",
  threshold: "90",
  severity: "warning",
  duration: "0",
  cooldown: "600",
  enabled: true,
}

const METRIC_OPTIONS: { value: AlertMetricType; label: string }[] = [
  { value: "cpu", label: "CPU (%)" },
  { value: "memory", label: "Memory (%)" },
  { value: "disk", label: "Disk (%)" },
  { value: "packet_loss", label: "Packet Loss (%)" },
  { value: "offline", label: "Offline (seconds)" },
  { value: "load", label: "Load Average" },
  { value: "gpu", label: "GPU (%)" },
]

const OPERATOR_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
]

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "bg-red-500" },
  { value: "warning", label: "Warning", color: "bg-amber-500" },
  { value: "info", label: "Info", color: "bg-blue-500" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertConfig() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RuleFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch rules ----------------------------------------------------------------

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/alerts?includeRules=true", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch rules")
      const data = await res.json()
      setRules(data.rules ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  // Form helpers ---------------------------------------------------------------

  const openCreate = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (rule: AlertRule) => {
    setEditingId(rule.id)
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      metric: rule.metric,
      operator: rule.operator,
      threshold: String(rule.threshold),
      severity: rule.severity,
      duration: String(rule.duration),
      cooldown: String(rule.cooldown),
      enabled: rule.enabled,
    })
    setError(null)
    setDialogOpen(true)
  }

  const updateFormField = <K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // CRUD -----------------------------------------------------------------------

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Rule name is required")
      return
    }

    const threshold = Number(form.threshold)
    if (isNaN(threshold)) {
      setError("Threshold must be a number")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        metric: form.metric,
        operator: form.operator,
        threshold,
        severity: form.severity,
        duration: Number(form.duration) || 0,
        cooldown: Number(form.cooldown) || 600,
        enabled: form.enabled,
      }

      if (editingId) {
        const res = await fetch("/api/alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to update rule")
        }
      } else {
        const res = await fetch("/api/alerts/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to create rule")
        }
      }

      setDialogOpen(false)
      await fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this alert rule?")) return

    try {
      const res = await fetch(`/api/alerts?id=${ruleId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete rule")
      await fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handleToggle = async (rule: AlertRule) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      })
      if (!res.ok) throw new Error("Failed to toggle rule")
      await fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed")
    }
  }

  // Render ---------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Loading rules...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>
            Configure thresholds and notification channels for server alerts.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
            <Button variant="ghost" size="sm" className="ml-2 h-5 px-1" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alert rules configured. Click &quot;Add Rule&quot; to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const sev = SEVERITY_OPTIONS.find((s) => s.value === rule.severity)
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-all",
                    rule.enabled ? "bg-card" : "bg-muted/30 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => handleToggle(rule)}
                      aria-label={`Toggle ${rule.name}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{rule.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] text-white", sev?.color)}
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {rule.metric.toUpperCase()} {rule.operator} {rule.threshold}
                        {rule.duration > 0 && ` for ${rule.duration}s`}
                        {rule.cooldown > 0 && ` · cooldown ${rule.cooldown}s`}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rule" : "Create Alert Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                placeholder="High CPU Usage"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="rule-desc">Description</Label>
              <Input
                id="rule-desc"
                value={form.description}
                onChange={(e) => updateFormField("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {/* Metric + Operator + Threshold */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Metric</Label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={form.metric}
                  onChange={(e) => updateFormField("metric", e.target.value as AlertMetricType)}
                >
                  {METRIC_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Operator</Label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={form.operator}
                  onChange={(e) => updateFormField("operator", e.target.value as ComparisonOperator)}
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-threshold">Threshold</Label>
                <Input
                  id="rule-threshold"
                  type="number"
                  value={form.threshold}
                  onChange={(e) => updateFormField("threshold", e.target.value)}
                />
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <Label>Severity</Label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    variant={form.severity === s.value ? "default" : "outline"}
                    size="sm"
                    className={cn(form.severity === s.value && s.color, "text-xs")}
                    onClick={() => updateFormField("severity", s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration + Cooldown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rule-duration">Duration (seconds)</Label>
                <Input
                  id="rule-duration"
                  type="number"
                  value={form.duration}
                  onChange={(e) => updateFormField("duration", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-cooldown">Cooldown (seconds)</Label>
                <Input
                  id="rule-cooldown"
                  type="number"
                  value={form.cooldown}
                  onChange={(e) => updateFormField("cooldown", e.target.value)}
                />
              </div>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => updateFormField("enabled", checked)}
              />
              <Label>Enabled</Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
