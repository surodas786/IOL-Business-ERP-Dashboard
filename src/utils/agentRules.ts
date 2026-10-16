import { hasPermission } from './access';
import { demoNow } from './format';
import type { Role } from '../types/erp';
import type { DemoDatabase } from '../types/records';
import type { AccrualStatus, AgentAttribution, CommissionAccrual, CommissionBasis, CommissionProposal } from '../types/agent';

/* ---------- authority ---------- */
/** Rate authority: Business Head (Sales Head) only. Not granted to Management, Accounts, Operations or System Admin. */
export const canDecideRates = (role: Role) => hasPermission(role, 'approveAgentCommission');
export const canPrepare = (role: Role) => hasPermission(role, 'manageWorkOrders') || hasPermission(role, 'approveAgentCommission');
export const canSeeCommission = (role: Role) => hasPermission(role, 'viewCommissions') || hasPermission(role, 'manageWorkOrders');
export const canRunAccruals = (role: Role) => hasPermission(role, 'recordCollection');
export const canConfirmEvent = (role: Role) => hasPermission(role, 'manageWorkOrders') || hasPermission(role, 'recordCollection');
export const canApprovePayout = (role: Role) => hasPermission(role, 'approveCommission');
export const canPay = (role: Role) => hasPermission(role, 'payExpense');
/** Restricted payment details — Accounts and the Finance Approver only. */
export const canSeePayment = (role: Role) => hasPermission(role, 'payExpense') || hasPermission(role, 'approveCommission');
export const canEditAgent = (role: Role) => hasPermission(role, 'manageWorkOrders') || hasPermission(role, 'approveAgentCommission');

export const MIN_REASON = 10;

/* ---------- attribution ---------- */
export const isActive = (a: AgentAttribution, at: string = demoNow().toISOString()) =>
new Date(a.effectiveFrom).getTime() <= new Date(at).getTime() && (!a.effectiveTo || new Date(a.effectiveTo).getTime() >= new Date(at).getTime());

/** The current (or future-dated, not yet superseded) attribution for a customer. */
export function currentAttribution(db: DemoDatabase, customerId: string): AgentAttribution | undefined {
  return db.agentAttributions.find((a) => a.customerId === customerId && !a.effectiveTo);
}

export const maskAccount = (n: string) => n.length <= 4 ? '••••' : `•••• ${n.slice(-4)}`;

/* ---------- rates and amounts ---------- */
export const usesMrc = (b: CommissionBasis) => b !== 'OTC';
export const usesOtc = (b: CommissionBasis) => b !== 'MRC';
export const effectiveMrcPct = (p: CommissionProposal) => p.approvedMrcPct ?? p.proposedMrcPct;
export const effectiveOtcPct = (p: CommissionProposal) => p.approvedOtcPct ?? p.proposedOtcPct;

export interface Effect {
  mrcPerMonth: number;
  mrcMonths: number;
  mrcTotal: number;
  otcOnce: number;
  total: number;
  /** Revenue over the same window (MRC × months + OTC). */
  revenue: number;
  pctOfRevenue: number;
}

export function financialEffect(p: Pick<CommissionProposal, 'basis' | 'arrangement' | 'months' | 'mrc' | 'otc'>, mrcPct: number, otcPct: number): Effect {
  const mrcMonths = usesMrc(p.basis) ? p.arrangement === 'Recurring' ? Math.max(1, p.months) : 1 : 0;
  const mrcPerMonth = usesMrc(p.basis) ? Math.round(p.mrc * mrcPct / 100) : 0;
  const mrcTotal = mrcPerMonth * mrcMonths;
  const otcOnce = usesOtc(p.basis) ? Math.round(p.otc * otcPct / 100) : 0;
  const total = mrcTotal + otcOnce;
  const revenue = p.mrc * Math.max(1, mrcMonths || 1) + p.otc;
  return { mrcPerMonth, mrcMonths, mrcTotal, otcOnce, total, revenue, pctOfRevenue: revenue ? Math.round(total / revenue * 1000) / 10 : 0 };
}

export function rateSummary(p: CommissionProposal, approved = true): string {
  if (p.selfSale) return 'Self-Sale — no agent commission';
  const m = approved ? effectiveMrcPct(p) : p.proposedMrcPct;
  const o = approved ? effectiveOtcPct(p) : p.proposedOtcPct;
  const parts = [usesMrc(p.basis) ? `${m}% of MRC${p.arrangement === 'Recurring' ? ` × ${p.months} months` : ' (first month)'}` : '', usesOtc(p.basis) ? `${o}% of OTC` : ''].filter(Boolean);
  return parts.join(' + ');
}

/* ---------- periods ---------- */
export const periodOf = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 6 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
export const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`;
};
export const monthsBetween = (a: string, b: string) => {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

/* ---------- totals ---------- */
export type AmountBucket = 'Accrued' | 'Pending' | 'Approved' | 'Paid' | 'Reversed';
export const BUCKET_OF: Record<AccrualStatus, AmountBucket> = { Accrued: 'Accrued', 'Pending Approval': 'Pending', Approved: 'Approved', Paid: 'Paid', Reversed: 'Reversed' };
export const BUCKET_HINT: Record<AmountBucket, string> = {
  Accrued: 'Earned after the qualifying event, not yet in a settlement',
  Pending: 'In a settlement awaiting Finance Approver sign-off',
  Approved: 'Approved for payment, not yet paid',
  Paid: 'Paid to the agent',
  Reversed: 'Reversed on cancellation or refund'
};

export function totals(accruals: CommissionAccrual[]): Record<AmountBucket, number> {
  const t: Record<AmountBucket, number> = { Accrued: 0, Pending: 0, Approved: 0, Paid: 0, Reversed: 0 };
  accruals.forEach((a) => t[BUCKET_OF[a.status]] += a.amount);
  return t;
}

/** Recurring months already accrued for a proposal (MRC component). */
export const accruedMonths = (db: DemoDatabase, proposalId: string) => db.commissionAccruals.filter((a) => a.proposalId === proposalId && a.component === 'MRC').length;