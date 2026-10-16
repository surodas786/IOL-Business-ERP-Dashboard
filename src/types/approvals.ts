import type { BranchId, Permission, RoleId } from './erp';
import type { FileRef } from './field';

/** Shared Approvals and Tasks centre + Operational Finance types. FICTIONAL DEMO — production must enforce on the server. */

export const CENTRE_CATEGORIES = [
'Profile correction',
'Survey bypass',
'Special pricing',
'Work Order release',
'Agent commission',
'Associate agreement and settlement',
'Due Allow',
'Expense',
'Service change',
'Refund or adjustment',
'Disconnection exception'] as
const;
export type CentreCategory = (typeof CENTRE_CATEGORIES)[number];

export type CentreDecision = 'Approved' | 'Rejected' | 'Returned';

/** The approval rule as it stood when a decision was taken. Later rule edits never change it. */
export interface RuleSnapshot {
  ruleId?: string;
  name: string;
  approverRoles: RoleId[];
  requiredPermission: Permission;
  condition: string;
  capturedAt: string;
}

export interface DecisionEvent {
  at: string;
  byId: string;
  byName: string;
  action: 'Submitted' | 'Approved' | 'Rejected' | 'Returned' | 'Resubmitted';
  comment: string;
  rule?: RuleSnapshot;
}

/** Sent back to the requester for more information. Decisions are blocked until resubmitted. */
export interface ReturnState {
  at: string;
  byId: string;
  comment: string;
}

/* ---------- Operational Finance ---------- */

export const OPS_CATEGORIES = [
'Conveyance',
'Entertainment',
'Emergency medical allowance',
'Office rent',
'Upstream / vendor payment',
'Salary payment',
'Other approved expense'] as
const;
export type OpsCategory = (typeof OPS_CATEGORIES)[number];

export const PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'BEFTN', 'bKash', 'Cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type OpsStatus = 'Pending Approval' | 'Returned' | 'Approved' | 'Rejected' | 'Paid';

export interface OpsPayment {
  reference: string;
  method: PaymentMethod;
  paidAt: string;
  paidById: string;
}

/** One operational payment. Salary rows record a payment only — no payroll, attendance or leave calculation. */
export interface OpsExpense {
  id: string;
  category: OpsCategory;
  payee: string;
  amount: number;
  branchId: BranchId;
  /** YYYY-MM */
  period: string;
  description: string;
  evidence: FileRef[];
  evidenceRef: string;
  status: OpsStatus;
  requestedById: string;
  requestedAt: string;
  decidedById?: string;
  decidedAt?: string;
  returned?: ReturnState;
  payment?: OpsPayment;
  recurringId?: string;
  history: DecisionEvent[];
}

export interface RecurringPayment {
  id: string;
  category: OpsCategory;
  payee: string;
  amount: number;
  branchId: BranchId;
  /** Day of the month the payment falls due (1–28). */
  dueDay: number;
  startPeriod: string;
  endPeriod?: string;
  active: boolean;
  note?: string;
}