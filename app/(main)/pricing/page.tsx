'use client';

import React, { useState } from 'react';
import PricingCard from '@/components/PricingCard';

const PLANS = [
  {
    name: 'Free', tier: 'free', description: 'For personal projects and small teams getting started.',
    priceMonthly: 0, priceYearly: 0, popular: false,
    features: ['Up to 3 servers', '2 team members', '5 alert rules', '7-day data retention', 'Basic monitoring', 'Community support'],
  },
  {
    name: 'Pro', tier: 'pro', description: 'For professionals who need more power and flexibility.',
    priceMonthly: 1900, priceYearly: 19000, popular: true,
    features: ['Up to 20 servers', '10 team members', '50 alert rules', '30-day data retention', 'Custom dashboards', 'API access', 'Priority support'],
  },
  {
    name: 'Team', tier: 'team', description: 'For growing teams that need collaboration features.',
    priceMonthly: 4900, priceYearly: 49000, popular: false,
    features: ['Up to 100 servers', '50 team members', '200 alert rules', '90-day data retention', 'SSO integration', 'Audit logs', 'Webhooks', 'Role-based access'],
  },
  {
    name: 'Enterprise', tier: 'enterprise', description: 'For large organizations with custom requirements.',
    priceMonthly: 19900, priceYearly: 199000, popular: false,
    features: ['Unlimited servers', 'Unlimited users', 'Unlimited alert rules', '365-day data retention', 'Dedicated support', 'Custom SLA', 'On-premise option', 'Custom integrations', 'Invoice billing'],
  },
];

const FAQ_ITEMS = [
  { q: 'Can I change plans at any time?', a: 'Yes! You can upgrade or downgrade at any time. Upgrades are prorated and downgrades take effect at the end of your billing period.' },
  { q: 'Is there a free trial?', a: 'Pro and Team plans include a 14-day free trial. Enterprise includes 30 days. No credit card required to start.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards via Stripe. Enterprise customers can also pay by invoice.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel anytime and you\'ll retain access until the end of your current billing period.' },
  { q: 'Do you offer discounts for nonprofits or education?', a: 'Yes! Contact us at support@nezha.pro for special pricing for nonprofits, students, and educational institutions.' },
];

const COMPARISON_ROWS = [
  { feature: 'Servers', free: '3', pro: '20', team: '100', enterprise: 'Unlimited' },
  { feature: 'Team Members', free: '2', pro: '10', team: '50', enterprise: 'Unlimited' },
  { feature: 'Alert Rules', free: '5', pro: '50', team: '200', enterprise: 'Unlimited' },
  { feature: 'Data Retention', free: '7 days', pro: '30 days', team: '90 days', enterprise: '365 days' },
  { feature: 'API Access', free: '—', pro: '✓', team: '✓', enterprise: '✓' },
  { feature: 'Custom Dashboards', free: '—', pro: '✓', team: '✓', enterprise: '✓' },
  { feature: 'SSO / SAML', free: '—', pro: '—', team: '✓', enterprise: '✓' },
  { feature: 'Audit Logs', free: '—', pro: '—', team: '✓', enterprise: '✓' },
  { feature: 'Webhooks', free: '—', pro: '—', team: '✓', enterprise: '✓' },
  { feature: 'Dedicated Support', free: '—', pro: '—', team: '—', enterprise: '✓' },
  { feature: 'Custom SLA', free: '—', pro: '—', team: '—', enterprise: '✓' },
  { feature: 'On-Premise', free: '—', pro: '—', team: '—', enterprise: '✓' },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
          Choose the plan that fits your monitoring needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={`text-sm ${interval === 'monthly' ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative h-6 w-11 rounded-full transition-colors ${interval === 'yearly' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${interval === 'yearly' ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`}
          />
        </button>
        <span className={`text-sm ${interval === 'yearly' ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          Yearly <span className="text-green-600 text-xs font-medium">Save ~17%</span>
        </span>
      </div>

      {/* Plan Cards */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map(plan => (
          <PricingCard
            key={plan.tier}
            {...plan}
            billingInterval={interval}
            onSelect={() => {/* handle selection */}}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Feature Comparison
        </h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 pr-4 text-left font-medium text-gray-500">Feature</th>
                {PLANS.map(p => (
                  <th key={p.tier} className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.free}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.pro}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.team}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-gray-200 dark:divide-gray-700">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-left font-medium text-gray-900 dark:text-white">
                {item.q}
                <span className="ml-4 text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
