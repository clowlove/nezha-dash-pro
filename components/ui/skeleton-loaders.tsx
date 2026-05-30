'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'rounded' | 'circular';
}

function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  const shapeClass = variant === 'circular' ? 'rounded-full' : variant === 'rounded' ? 'rounded-xl' : 'rounded-md';
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5 dark:bg-white/5',
        shapeClass,
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

function ServerCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="h-1.5 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

function ChartSkeleton({ className, height = 200 }: { className?: string; height?: number }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3', className)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-2">
        <div className="flex gap-4 pb-2 border-b border-white/5">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 py-2">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className="h-3 flex-1"
                style={{ width: `${50 + Math.random() * 50}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ items = 6, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3', className)}>
      <Skeleton className="h-5 w-36 mb-3" />
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2 w-2/5" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ChartSkeleton height={220} />
        </div>
        <ListSkeleton items={4} />
      </div>
    </div>
  );
}

export { Skeleton, ServerCardSkeleton, ChartSkeleton, TableSkeleton, ListSkeleton, DashboardSkeleton };
