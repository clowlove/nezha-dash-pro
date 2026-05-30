'use client';

import React from 'react';

export interface PricingCardProps {
  name: string;
  tier: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billingInterval: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  current?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export default function PricingCard({
  name,
  tier,
  description,
  priceMonthly,
  priceYearly,
  billingInterval,
  features,
  popular,
  current,
  disabled,
  onSelect,
}: PricingCardProps) {
  const price = billingInterval === 'yearly' ? priceYearly : priceMonthly;
  const displayPrice = price === 0 ? 'Free' : `$${(price / 100).toFixed(0)}`;
  const perLabel = price === 0 ? '' : billingInterval === 'yearly' ? '/yr' : '/mo';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all ${
        popular
          ? 'border-indigo-500 ring-2 ring-indigo-500 scale-[1.02]'
          : 'border-gray-200 dark:border-gray-700'
      } ${current ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'bg-white dark:bg-gray-900'}`}
    >
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-indigo-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      {/* Current Badge */}
      {current && (
        <div className="absolute top-4 right-4">
          <span className="inline-block rounded-full bg-green-100 dark:bg-green-900 px-3 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">{displayPrice}</span>
        {perLabel && (
          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{perLabel}</span>
        )}
        {billingInterval === 'yearly' && price > 0 && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Save {Math.round((1 - priceYearly / (priceMonthly * 12)) * 100)}% annually
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={disabled || current}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          current
            ? 'cursor-default bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            : popular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
              : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {current ? 'Current Plan' : price === 0 ? 'Get Started' : `Upgrade to ${name}`}
      </button>
    </div>
  );
}
