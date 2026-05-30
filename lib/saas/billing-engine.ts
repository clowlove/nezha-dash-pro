// NezhaDash Pro — Billing Engine (Stripe-style)

import type {
  Plan, Subscription, Invoice, InvoiceLineItem, Coupon,
  BillingInterval,
} from './types';
import { getPlanById, getActiveSubscription } from './plan-manager';
import { validateCoupon, applyCoupon } from './coupons';

// In-memory store
const invoices: Map<string, Invoice> = new Map();

// ── Invoice Creation ────────────────────────────────────────
export function createInvoice(
  subscription: Subscription,
  options?: { couponId?: string; description?: string }
): Invoice {
  const plan = getPlanById(subscription.planId);
  if (!plan) throw new Error('Plan not found');

  const unitPrice = subscription.billingInterval === 'yearly'
    ? plan.prices.yearly : plan.prices.monthly;

  const lineItems: InvoiceLineItem[] = [
    {
      description: options?.description ?? `${plan.name} plan — ${subscription.billingInterval}`,
      quantity: 1,
      unitPrice,
      amount: unitPrice,
    },
  ];

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * 0); // no tax by default

  let discount = 0;
  if (options?.couponId) {
    const coupon = validateCoupon(options.couponId, plan.tier);
    if (coupon) {
      discount = applyCoupon(coupon, subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount + tax);

  const invoice: Invoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subscriptionId: subscription.id,
    userId: subscription.userId,
    amount: subtotal,
    tax,
    discount,
    total,
    currency: 'usd',
    status: 'draft',
    lineItems,
    dueDate: new Date(Date.now() + 7 * 86_400_000),
    createdAt: new Date(),
  };

  invoices.set(invoice.id, invoice);
  return invoice;
}

// ── Proration ───────────────────────────────────────────────
export function calculateProration(
  subscription: Subscription,
  newPlanId: string,
): { credit: number; charge: number; net: number } {
  const currentPlan = getPlanById(subscription.planId);
  const newPlan = getPlanById(newPlanId);
  if (!currentPlan || !newPlan) throw new Error('Plan not found');

  const now = Date.now();
  const periodStart = subscription.currentPeriodStart.getTime();
  const periodEnd = subscription.currentPeriodEnd.getTime();
  const totalDays = Math.max(1, (periodEnd - periodStart) / 86_400_000);
  const remainingDays = Math.max(0, (periodEnd - now) / 86_400_000);
  const remainingFraction = remainingDays / totalDays;

  const currentPrice = subscription.billingInterval === 'yearly'
    ? currentPlan.prices.yearly : currentPlan.prices.monthly;
  const newPrice = subscription.billingInterval === 'yearly'
    ? newPlan.prices.yearly : newPlan.prices.monthly;

  const credit = Math.round(currentPrice * remainingFraction);
  const charge = Math.round(newPrice * remainingFraction);

  return { credit, charge, net: charge - credit };
}

// ── Invoice Status ──────────────────────────────────────────
export function finalizeInvoice(invoiceId: string): Invoice {
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error('Invoice not found');
  inv.status = 'open';
  return inv;
}

export function payInvoice(invoiceId: string): Invoice {
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error('Invoice not found');
  inv.status = 'paid';
  inv.paidAt = new Date();
  return inv;
}

export function voidInvoice(invoiceId: string): Invoice {
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error('Invoice not found');
  inv.status = 'void';
  return inv;
}

// ── Payment Link Generation ─────────────────────────────────
export function generatePaymentLink(invoiceId: string): string {
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error('Invoice not found');
  const link = `https://checkout.stripe.com/pay/${invoiceId}`;
  inv.paymentUrl = link;
  return link;
}

// ── Invoice Queries ─────────────────────────────────────────
export function getInvoiceById(id: string): Invoice | undefined {
  return invoices.get(id);
}

export function getUserInvoices(userId: string): Invoice[] {
  return Array.from(invoices.values())
    .filter(i => i.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Subscription Billing Cycle ──────────────────────────────
export function processBillingCycle(userId: string, couponId?: string): Invoice | null {
  const sub = getActiveSubscription(userId);
  if (!sub) return null;

  const invoice = createInvoice(sub, { couponId });
  finalizeInvoice(invoice.id);

  // In production: charge via Stripe, handle failures → markPastDue
  payInvoice(invoice.id);
  return invoice;
}

// ── Apply Coupon to Subscription ────────────────────────────
export function applyCouponToSubscription(
  subscription: Subscription,
  couponCode: string
): { success: boolean; error?: string } {
  const plan = getPlanById(subscription.planId);
  if (!plan) return { success: false, error: 'Plan not found' };

  const coupon = validateCoupon(couponCode, plan.tier);
  if (!coupon) return { success: false, error: 'Invalid or inapplicable coupon' };

  subscription.couponId = coupon.id;
  subscription.updatedAt = new Date();
  return { success: true };
}
