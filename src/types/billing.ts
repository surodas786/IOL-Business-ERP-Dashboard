import type { BranchId } from './erp';

export type BillingTerm = 'Prepaid' | 'Postpaid';

export const RECEIPT_METHODS = ['Cash', 'Bank Transfer', 'Bank Deposit', 'Cheque', 'bKash', 'Other approved'] as const;
export type ReceiptMethod = (typeof RECEIPT_METHODS)[number];
export type ReceiptPurpose = 'Payment' | 'Security deposit';

export type InvoiceKind = 'Recurring' | 'First bill' | 'Associate' | 'Adjustment';

export interface InvoiceLine {
  id: string;
  kind: 'MRC' | 'OTC' | 'Tax' | 'Adjustment';
  connectionId?: string;
  description: string;
  /** Inclusive service dates (YYYY-MM-DD) for MRC lines. */
  from?: string;
  to?: string;
  days?: number;
  daysInPeriod?: number;
  /** Monthly rate the line was prorated from. */
  rate?: number;
  amount: number;
  /** Human-readable calculation, e.g. "৳ 6,500 × 15/30 days = ৳ 3,250". */
  calc: string;
}

export type AdjustmentKind = 'Credit note' | 'Debit adjustment' | 'Receipt reversal';

export interface BillingAdjustment {
  id: string;
  kind: AdjustmentKind;
  billingAccountId: string;
  invoiceId?: string;
  receiptId?: string;
  amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedById: string;
  requestedAt: string;
  decidedById?: string;
  decidedAt?: string;
  approvalId: string;
  /** Debit adjustments post a new invoice. */
  resultInvoiceId?: string;
  branchId: BranchId;
  zoneId: string;
}

export interface DueAllow {
  id: string;
  billingAccountId: string;
  creditLimit: number;
  reason: string;
  validFrom: string;
  validUntil: string;
  reviewAt: string;
  requestedById: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked';
  approvalId: string;
  decidedById?: string;
  decidedAt?: string;
  revokedReason?: string;
  branchId: BranchId;
  zoneId: string;
}

export type DueAllowState = 'Pending' | 'Active' | 'Scheduled' | 'Expired' | 'Rejected' | 'Revoked';

export interface BillingRunSkip {
  billingAccountId: string;
  connectionId?: string;
  reason: string;
}

export interface BillingRun {
  id: string;
  periodKey: string;
  runAt: string;
  byId: string;
  invoiceIds: string[];
  skipped: BillingRunSkip[];
  total: number;
}

export interface SuspensionReview {
  id: string;
  billingAccountId: string;
  connectionIds: string[];
  raisedAt: string;
  raisedById: string;
  reason: string;
  status: 'Referred to Technical' | 'Withdrawn';
  withdrawnAt?: string;
  withdrawnReason?: string;
  branchId: BranchId;
  zoneId: string;
}

export interface BillingPolicy {
  prepaidGraceDays: number;
  /** Days past due before a postpaid account is flagged for suspension review. */
  postpaidReviewDays: number;
  prorationMethod: 'Actual days in month';
  status: 'Awaiting IOL confirmation' | 'Confirmed';
}