'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Currency = 'USD' | 'CNY' | 'EUR';

interface CostRate {
  uploadPerGB: number;
  downloadPerGB: number;
  totalPerGB: number;
  useDirectionalRates: boolean;
}

interface AlertThresholds {
  dailyTrafficGB: number;
  monthlyTrafficGB: number;
  monthlyCost: number;
  spikeMultiplier: number;
}

interface BillingConfig {
  currency: Currency;
  rates: Record<Currency, CostRate>;
  billingCycleStart: number;
  alertThresholds: AlertThresholds;
}

interface BillingSettingsProps {
  className?: string;
  onSaved?: (config: BillingConfig) => void;
}

const CURRENCIES: Currency[] = ['USD', 'CNY', 'EUR'];
const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD ($) — US Dollar',
  CNY: 'CNY (¥) — Chinese Yuan',
  EUR: 'EUR (€) — Euro',
};

export default function BillingSettings({ className, onSaved }: BillingSettingsProps) {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editCurrency, setEditCurrency] = useState<Currency>('USD');
  const [editRate, setEditRate] = useState<CostRate>({
    uploadPerGB: 0, downloadPerGB: 0, totalPerGB: 0, useDirectionalRates: false,
  });
  const [editThresholds, setEditThresholds] = useState<AlertThresholds>({
    dailyTrafficGB: 100, monthlyTrafficGB: 1000, monthlyCost: 100, spikeMultiplier: 3,
  });
  const [billingCycleStart, setBillingCycleStart] = useState(1);

  // Load current config
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/billing?action=config');
        const json = await res.json();
        setConfig(json.config);
        setEditCurrency(json.config.currency);
        setEditRate(json.config.rates[json.config.currency]);
        setEditThresholds(json.config.alertThresholds);
        setBillingCycleStart(json.config.billingCycleStart);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load config' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // When switching the rate editor currency, load that rate
  const handleCurrencySwitch = useCallback((c: Currency) => {
    setEditCurrency(c);
    if (config) setEditRate(config.rates[c]);
  }, [config]);

  // Save rate for current currency
  const handleSaveRate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rate', currency: editCurrency, rate: editRate }),
      });
      const json = await res.json();
      if (res.ok) {
        setConfig(json.config);
        setMessage({ type: 'success', text: `Rate saved for ${editCurrency}` });
        onSaved?.(json.config);
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Save failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  // Save thresholds + billing cycle + default currency
  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'config',
          config: {
            currency: editCurrency,
            billingCycleStart,
            alertThresholds: editThresholds,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setConfig(json.config);
        setMessage({ type: 'success', text: 'Settings saved' });
        onSaved?.(json.config);
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Save failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-400">Loading settings...</CardContent>
      </Card>
    );
  }

  return (
    <div className={className + ' space-y-6'}>
      {/* Status message */}
      {message && (
        <div
          className={`text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Rate configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <div className="flex gap-2">
              {CURRENCIES.map(c => (
                <Button
                  key={c}
                  variant={editCurrency === c ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCurrencySwitch(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editRate.useDirectionalRates}
                onChange={e => setEditRate(r => ({ ...r, useDirectionalRates: e.target.checked }))}
                className="rounded"
              />
              Separate upload/download rates
            </label>
          </div>

          {editRate.useDirectionalRates ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Upload per GB</label>
                <input
                  type="number"
                  step="0.001"
                  value={editRate.uploadPerGB}
                  onChange={e => setEditRate(r => ({ ...r, uploadPerGB: Number(e.target.value) }))}
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Download per GB</label>
                <input
                  type="number"
                  step="0.001"
                  value={editRate.downloadPerGB}
                  onChange={e => setEditRate(r => ({ ...r, downloadPerGB: Number(e.target.value) }))}
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Total per GB</label>
              <input
                type="number"
                step="0.001"
                value={editRate.totalPerGB}
                onChange={e => setEditRate(r => ({ ...r, totalPerGB: Number(e.target.value) }))}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          )}

          <Button onClick={handleSaveRate} disabled={saving} size="sm">
            {saving ? 'Saving...' : `Save ${editCurrency} Rate`}
          </Button>
        </CardContent>
      </Card>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Billing cycle start (day of month)</label>
            <select
              value={billingCycleStart}
              onChange={e => setBillingCycleStart(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Alert thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Daily traffic (GB)</label>
              <input
                type="number"
                value={editThresholds.dailyTrafficGB}
                onChange={e => setEditThresholds(t => ({ ...t, dailyTrafficGB: Number(e.target.value) }))}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Monthly traffic (GB)</label>
              <input
                type="number"
                value={editThresholds.monthlyTrafficGB}
                onChange={e => setEditThresholds(t => ({ ...t, monthlyTrafficGB: Number(e.target.value) }))}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Monthly cost threshold</label>
              <input
                type="number"
                step="0.01"
                value={editThresholds.monthlyCost}
                onChange={e => setEditThresholds(t => ({ ...t, monthlyCost: Number(e.target.value) }))}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Spike multiplier (×)</label>
              <input
                type="number"
                step="0.5"
                value={editThresholds.spikeMultiplier}
                onChange={e => setEditThresholds(t => ({ ...t, spikeMultiplier: Number(e.target.value) }))}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
