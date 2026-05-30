'use client';

import React, { useEffect, useState } from 'react';

interface UsageData {
  servers: { current: number; limit: number; percentage: number; unlimited: boolean };
  users: { current: number; limit: number; percentage: number; unlimited: boolean };
  alertRules: { current: number; limit: number; percentage: number; unlimited: boolean };
  apiCalls: { current: number; limit: number; percentage: number; unlimited: boolean };
}

interface UsageDashboardProps {
  userId: string;
}

function ProgressBar({
  label,
  current,
  limit,
  percentage,
  unlimited,
}: {
  label: string;
  current: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
}) {
  const color =
    unlimited ? 'bg-gray-400' : percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {current} / {unlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: unlimited ? '15%' : `${Math.min(100, percentage)}%` }}
        />
      </div>
      {!unlimited && percentage >= 90 && (
        <p className="text-xs text-red-500">Approaching limit — consider upgrading</p>
      )}
    </div>
  );
}

export default function UsageDashboard({ userId }: UsageDashboardProps) {
  const [data, setData] = useState<UsageData | null>(null);
  const [plan, setPlan] = useState<{ name: string; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/saas/usage?userId=${userId}`)
      .then(r => r.json())
      .then(json => {
        if (json.limits) {
          setData({
            servers: json.limits.servers,
            users: json.limits.users,
            alertRules: json.limits.alertRules,
            apiCalls: json.limits.apiCalls,
          });
        }
        if (json.plan) setPlan(json.plan);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
      {/* Plan Info */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Usage Overview</h3>
          {plan && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current plan: <span className="font-medium text-indigo-600 dark:text-indigo-400">{plan.name}</span>
            </p>
          )}
        </div>
        <a
          href="/pricing"
          className="rounded-lg bg-indigo-50 dark:bg-indigo-950 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
        >
          Upgrade Plan
        </a>
      </div>

      {/* Usage Bars */}
      <div className="space-y-5">
        <ProgressBar label="Servers" {...data.servers} />
        <ProgressBar label="Team Members" {...data.users} />
        <ProgressBar label="Alert Rules" {...data.alertRules} />
        <ProgressBar label="API Calls (this period)" {...data.apiCalls} />
      </div>
    </div>
  );
}
