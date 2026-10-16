import { hasPermission } from './access';
import { demoNow, dhakaDayAt } from './format';
import type { Role } from '../types/erp';
import type { Associate, DemoDatabase } from '../types/records';
import type { AssociateSettlement, LedgerBucket, SettlementLine, SettlementRule } from '../types/associate';

/* ---------- permissions (demo only — production must enforce on the server) ---------- */
export const canSeeAssociateMoney = (r: Role) => hasPermission(r, 'viewFinancials');
export const canEditAssociate = (r: Role) => hasPermission(r, 'manageWorkOrders') || hasPermission(r, 'recordCollection');
export const canEditTerms = (r: Role) => canEditAssociate(r) && hasPermission(r, 'viewFinancials');
export const canPrepareSettlement = (r: Role) => hasPermission(r, 'recordCollection');
export const canApproveSettlement = (r: Role) => hasPermission(r, 'approveFinancial');
export const canDecideSuspension = (r: Role) => hasPermission(r, 'approveFinancial') || hasPermission(r, 'viewMargins') && hasPermission(r, 'manageSalesTeam');

export const isPercentModel = (a: Pick<Associate, 'collectionModel'>) => a.collectionModel !== 'Fixed Monthly';

/* ---------- hierarchy ---------- */
export const childrenOf = (db: DemoDatabase, id: string) => db.associates.filter((a) => a.parentId === id);

export function ancestors(db: DemoDatabase, id: string): Associate[] {
  const out: Associate[] = [];
  let cur = db.associates.find((a) => a.id === id);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.parentId)) {
    seen.add(cur.parentId);
    const p = db.associates.find((a) => a.id === cur!.parentId);
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

/** True when making `parentId` the parent of `id` would create a loop. */
export function createsCycle(db: DemoDatabase, id: string, parentId?: string): boolean {
  if (!parentId) return false;
  if (parentId === id) return true;
  return ancestors(db, parentId).some((a) => a.id === id) || false;
}

export const tierOf = (db: DemoDatabase, id: string) => ancestors(db, id).length + 1;

/** Share still free under a parent (parent's rate minus its other children's rates). */
export function availableAllotment(db: DemoDatabase, parentId: string, excludeId?: string): number {
  const p = db.associates.find((a) => a.id === parentId);
  if (!p) return 0;
  const used = childrenOf(db, parentId).
  filter((c) => c.id !== excludeId).
  reduce((n, c) => n + (c.revenueSharePct ?? 0), 0);
  return Math.max(0, (p.revenueSharePct ?? 0) - used);
}

/** Validation errors keyed by field. */
export function validateProfile(db: DemoDatabase, a: Associate, isNew: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (a.name.trim().length < 3) e.name = 'Enter the associate name.';
  if (!a.contactName.trim() || !/^\+?[\d\s-]{10,}$/.test(a.contactPhone)) e.contact = 'Enter the primary contact name and a valid phone number.';
  if (!a.territory?.trim()) e.territory = 'Enter the territory.';
  if (!a.responsibleExecutiveId) e.responsibleExecutiveId = 'Choose the responsible executive.';
  if (a.parentId) {
    if (!db.associates.some((x) => x.id === a.parentId)) e.parentId = 'Parent associate not found.';else
    if (!isNew && createsCycle(db, a.id, a.parentId)) e.parentId = 'This would make the associate its own ancestor. Circular hierarchies are blocked.';
  }
  if (isPercentModel(a)) {
    const rate = a.revenueSharePct ?? 0;
    if (!(rate > 0)) e.revenueSharePct = 'Enter the sharing rate.';else
    if (rate > 100) e.revenueSharePct = 'A share cannot exceed 100%.';
    if (!a.sharingBasis) e.sharingBasis = 'Every percentage agreement must state its calculation base.';
    if (a.parentId && rate > 0) {
      const parent = db.associates.find((x) => x.id === a.parentId);
      if (parent && !isPercentModel(parent)) e.revenueSharePct = `${parent.name} is on a fixed monthly agreement and has no percentage allotment to share.`;else
      {
        const free = availableAllotment(db, a.parentId, a.id);
        if (rate > free) e.revenueSharePct = `Only ${free}% of ${parent?.name ?? 'the parent'}’s ${parent?.revenueSharePct ?? 0}% allotment is still available.`;
      }
    }
    // Own children must still fit inside the new rate.
    const kids = isNew ? 0 : childrenOf(db, a.id).reduce((n, c) => n + (c.revenueSharePct ?? 0), 0);
    if (kids > rate && !e.revenueSharePct) e.revenueSharePct = `Sub-associates already hold ${kids}%. The rate cannot drop below that.`;
  } else if (!(a.fixedMonthly && a.fixedMonthly > 0)) e.fixedMonthly = 'Enter the agreed fixed monthly amount.';
  if (!a.agreementStart || !a.agreementEnd) e.agreement = 'Enter the agreement start and end dates.';else
  if (a.agreementEnd <= a.agreementStart) e.agreement = 'The agreement must end after it starts.';
  if (!a.settlementDay || a.settlementDay < 1 || a.settlementDay > 28) e.settlementDay = 'Settlement day must be between 1 and 28.';
  if ((a.graceDays ?? -1) < 0 || (a.graceDays ?? 0) > 30) e.graceDays = 'Grace period must be 0–30 days.';
  if (!/^[A-Z]{2,5}$/.test(a.clientIdPrefix ?? '')) e.clientIdPrefix = 'Use 2–5 capital letters.';else
  if (db.associates.some((x) => x.id !== a.id && x.clientIdPrefix === a.clientIdPrefix)) e.clientIdPrefix = 'This prefix is already used by another associate.';
  const min = a.minRenewalDays ?? 0;
  const max = a.maxRenewalDays ?? 0;
  if (!(min > 0) || !(max > 0)) e.renewal = 'Enter minimum and maximum renewal days.';else
  if (min > max) e.renewal = 'Minimum renewal days cannot exceed the maximum.';
  if ((a.creditLimit ?? 0) < 0 || (a.depositRequired ?? 0) < 0) e.credit = 'Amounts cannot be negative.';
  return e;
}

/* ---------- balances ---------- */
export const BUCKETS: LedgerBucket[] = ['Advance', 'Due', 'Collection', 'Security Deposit'];
export function balances(db: DemoDatabase, associateId: string): Record<LedgerBucket, number> {
  const out = { Advance: 0, Due: 0, Collection: 0, 'Security Deposit': 0 } as Record<LedgerBucket, number>;
  db.associateLedger.filter((l) => l.associateId === associateId).forEach((l) => out[l.bucket] += l.amount);
  return out;
}

/* ---------- rules and calculation ---------- */
export const periodEnd = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${period}-${String(last).padStart(2, '0')}`;
};
export const periodLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
};

/** Rules in force on the last day of the period for this associate (associate-specific plus global). */
export function rulesFor(db: DemoDatabase, associateId: string, period: string): SettlementRule[] {
  const end = periodEnd(period);
  return db.settlementRules.filter((r) => (!r.associateId || r.associateId === associateId) && r.effectiveFrom.slice(0, 10) <= end && (!r.effectiveTo || r.effectiveTo.slice(0, 10) >= end));
}

export function dueDateFor(a: Associate, period: string): string {
  const [y, m] = period.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-${String(a.settlementDay ?? 10).padStart(2, '0')}T23:59:00+06:00`;
}

const round = (n: number) => Math.round(n);

type Calc = Pick<AssociateSettlement, 'lines' | 'base' | 'partnerShare' | 'payout' | 'receivable' | 'vat' | 'rulesUsed' | 'basis' | 'ratePct' | 'fixedMonthly'>;

/** Works out the settlement from inputs and the rules in force. Never touches approved settlements. */
export function calculate(db: DemoDatabase, a: Associate, period: string, inputs: AssociateSettlement['inputs'], declared?: number): Calc {
  const rules = rulesFor(db, a.id, period);
  const rulesUsed = rules.map((r) => ({ id: r.id, kind: r.kind, label: r.label, method: r.method, value: r.value }));
  const amountOf = (r: SettlementRule, revenue: number) => round(r.method === 'Percent of revenue' ? revenue * r.value / 100 : r.method === 'Per subscriber' ? r.value * inputs.subscribers : r.value);
  const lines: SettlementLine[] = [];

  if (a.collectionModel === 'Fixed Monthly') {
    const fixed = a.fixedMonthly ?? 0;
    const tax = rules.find((r) => r.kind === 'Tax');
    const vat = a.vatBearer === 'Associate' && tax ? amountOf(tax, fixed) : 0;
    lines.push({ label: 'Agreed fixed monthly amount', amount: fixed, note: 'Owed regardless of end-customer collections' });
    if (vat) lines.push({ label: `${tax!.label} (borne by associate)`, amount: vat, ruleId: tax!.id });
    return { lines, base: fixed, partnerShare: 0, payout: 0, receivable: fixed + vat, vat, rulesUsed, fixedMonthly: fixed };
  }

  const rate = a.revenueSharePct ?? 0;
  const basis = a.sharingBasis ?? 'Collected revenue';
  const revenue = a.collectionModel === 'Decentralised' ? basis === 'Invoiced revenue' ? inputs.invoiced : declared ?? inputs.collected : basis === 'Collected revenue' ? inputs.collected : inputs.invoiced;
  lines.push({ label: basis === 'Invoiced revenue' ? 'Invoiced revenue' : a.collectionModel === 'Decentralised' ? 'Declared collections' : basis === 'Collected revenue' ? 'Collected revenue' : 'Invoiced revenue', amount: revenue });
  let base = revenue;
  let vat = 0;
  if (basis === 'Revenue after defined deductions' || basis === 'Gross profit after agreed costs') {
    rules.
    filter((r) => r.kind !== 'Direct cost').
    forEach((r) => {
      const amt = amountOf(r, revenue);
      if (r.kind === 'Tax') vat = amt;
      base -= amt;
      lines.push({ label: `Less ${r.label}`, amount: -amt, ruleId: r.id, note: `${r.kind} · ${r.method === 'Percent of revenue' ? `${r.value}%` : r.method === 'Per subscriber' ? `৳ ${r.value} × ${inputs.subscribers}` : 'fixed'}` });
    });
  }
  if (basis === 'Gross profit after agreed costs') {
    rules.
    filter((r) => r.kind === 'Direct cost').
    forEach((r) => {
      const amt = amountOf(r, revenue);
      base -= amt;
      lines.push({ label: `Less ${r.label}`, amount: -amt, ruleId: r.id, note: `Direct cost · ${r.method === 'Per subscriber' ? `৳ ${r.value} × ${inputs.subscribers}` : r.method === 'Percent of revenue' ? `${r.value}%` : 'fixed'}` });
    });
  }
  base = Math.max(0, base);
  const partnerShare = round(base * rate / 100);
  lines.push({ label: `Calculation base (${basis.toLowerCase()})`, amount: base });
  lines.push({ label: `Associate share at ${rate}%`, amount: partnerShare });
  if (a.collectionModel === 'Centralised') {
    lines.push({ label: 'Approved payout to associate', amount: partnerShare, note: 'IOL collected from subscribers and pays the share' });
    return { lines, base, partnerShare, payout: partnerShare, receivable: 0, vat, rulesUsed, basis, ratePct: rate };
  }
  const collected = declared ?? inputs.collected;
  const receivable = Math.max(0, collected - partnerShare);
  lines.push({ label: 'Associate retains its authorised share', amount: -partnerShare });
  lines.push({ label: 'Receivable by IOL', amount: receivable, note: 'Declared collections less the authorised share' });
  return { lines, base, partnerShare, payout: 0, receivable, vat, rulesUsed, basis, ratePct: rate };
}

/** Rules that changed after an approved settlement was calculated (shown, never applied). */
export function rulesChangedSince(db: DemoDatabase, s: AssociateSettlement): boolean {
  const now = rulesFor(db, s.associateId, s.period).map((r) => `${r.id}:${r.value}`).sort().join('|');
  const then = s.rulesUsed.map((r) => `${r.id}:${r.value}`).sort().join('|');
  return now !== then;
}

/* ---------- money position and due status ---------- */
export const verifiedRemitted = (s: AssociateSettlement) => s.remittances.filter((r) => r.verified).reduce((n, r) => n + r.amount, 0);
export const unverifiedRemitted = (s: AssociateSettlement) => s.remittances.filter((r) => !r.verified).reduce((n, r) => n + r.amount, 0);
export const openDisputes = (s: AssociateSettlement) => s.disputes.filter((d) => d.status === 'Open');
export const disputedAmount = (s: AssociateSettlement) => openDisputes(s).reduce((n, d) => n + d.amount, 0);
/** Receivable not yet verified and not under dispute. */
export const shortfall = (s: AssociateSettlement) => Math.max(0, s.receivable - verifiedRemitted(s) - disputedAmount(s));
export const owedAmount = (s: AssociateSettlement) => s.payout > 0 ? s.payout : s.receivable;

export type DueState = 'settled' | 'upcoming' | 'reminder' | 'overdue' | 'suspension';
export function dueState(a: Associate, s: AssociateSettlement): DueState {
  if (s.status === 'Reconciled' || s.status === 'Paid/Remitted') return 'settled';
  const now = demoNow().getTime();
  const due = new Date(s.dueDate).getTime();
  const t = (iso: string) => new Date(iso).getTime();
  if (due < now) return s.payout === 0 && t(dhakaDayAt(s.dueDate, a.graceDays ?? 0, '23:59')) < now ? 'suspension' : 'overdue';
  if (t(dhakaDayAt(demoNow(), 3, '23:59')) >= due) return 'reminder';
  return 'upcoming';
}

export const DUE_LABEL: Record<DueState, string> = { settled: 'Settled', upcoming: 'Not yet due', reminder: 'Due soon', overdue: 'Overdue', suspension: 'Past grace — suspension review' };