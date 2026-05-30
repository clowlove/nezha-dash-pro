// NezhaDash Pro — Coupon System

import type { Coupon, CouponType, PlanTier } from './types';

// In-memory store
const coupons: Map<string, Coupon> = new Map();

// ── Coupon CRUD ─────────────────────────────────────────────
export function createCoupon(params: {
  code: string;
  type: CouponType;
  value: number;
  maxUses?: number;
  appliesToPlans?: PlanTier[];
  validFrom?: Date;
  validUntil?: Date;
}): Coupon {
  const now = new Date();
  const coupon: Coupon = {
    id: `cpn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: params.code.toUpperCase(),
    type: params.type,
    value: params.value,
    maxUses: params.maxUses ?? -1,
    usedCount: 0,
    appliesToPlans: params.appliesToPlans ?? ['free', 'pro', 'team', 'enterprise'],
    validFrom: params.validFrom ?? now,
    validUntil: params.validUntil ?? new Date(now.getTime() + 365 * 86_400_000),
    active: true,
    createdAt: now,
  };

  if (coupons.has(coupon.code)) throw new Error(`Coupon ${coupon.code} already exists`);
  if (coupon.type === 'percentage' && (coupon.value <= 0 || coupon.value > 100)) {
    throw new Error('Percentage must be between 1 and 100');
  }
  if (coupon.type === 'fixed' && coupon.value <= 0) {
    throw new Error('Fixed value must be positive');
  }

  coupons.set(coupon.code, coupon);
  return coupon;
}

export function getCouponByCode(code: string): Coupon | undefined {
  return coupons.get(code.toUpperCase());
}

export function getCouponById(id: string): Coupon | undefined {
  return Array.from(coupons.values()).find(c => c.id === id);
}

export function deactivateCoupon(code: string): boolean {
  const coupon = coupons.get(code.toUpperCase());
  if (!coupon) return false;
  coupon.active = false;
  return true;
}

export function listCoupons(): Coupon[] {
  return Array.from(coupons.values());
}

// ── Validation ──────────────────────────────────────────────
export function validateCoupon(codeOrId: string, planTier?: PlanTier): Coupon | null {
  const coupon = getCouponByCode(codeOrId) ?? getCouponById(codeOrId);
  if (!coupon) return null;
  if (!coupon.active) return null;

  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) return null;

  if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses) return null;

  if (planTier && !coupon.appliesToPlans.includes(planTier)) return null;

  return coupon;
}

// ── Application ─────────────────────────────────────────────
export function applyCoupon(coupon: Coupon, amount: number): number {
  if (coupon.type === 'percentage') {
    return Math.round(amount * (coupon.value / 100));
  }
  return Math.min(amount, coupon.value); // fixed discount capped at amount
}

export function redeemCoupon(code: string, planTier: PlanTier, amount: number): {
  success: boolean;
  discount: number;
  finalAmount: number;
  error?: string;
} {
  const coupon = validateCoupon(code, planTier);
  if (!coupon) {
    return { success: false, discount: 0, finalAmount: amount, error: 'Invalid or expired coupon' };
  }

  const discount = applyCoupon(coupon, amount);
  coupon.usedCount++;
  return { success: true, discount, finalAmount: Math.max(0, amount - discount) };
}

// ── Seed some test coupons ──────────────────────────────────
export function seedDefaultCoupons(): void {
  try {
    createCoupon({ code: 'WELCOME20', type: 'percentage', value: 20 });
    createCoupon({ code: 'SAVE50', type: 'fixed', value: 500 });
    createCoupon({ code: 'HALFOFF', type: 'percentage', value: 50, appliesToPlans: ['pro', 'team'] });
  } catch { /* already seeded */ }
}
