import { demoNow, dhakaDayAt, dhakaInputValue, formatBDT, formatDhakaDate } from './format';
import { hasPermission } from './access';
import { accountAdvance, accountDeposit, accountOutstanding, invoiceNet, invoiceOutstanding } from './relations';
import { billingApproved } from './serviceChangeRules';
import type { Role } from '../types/erp';
import type { BillingAccount, DemoDatabase, Invoice, Receipt, ServiceConnection } from '../types/records';
import type { BillingRunSkip, BillingTerm, DueAllow, DueAllowState, InvoiceKind, InvoiceLine, SuspensionReview } from '../types/billing';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- permissions (demo only — production must enforce on the server) ---------- */
export const canRunBilling = (r: Role) => hasPermission(r, 'recordCollection');
export const canVerifyPayment = (r: Role) => hasPermission(r, 'recordCollection');
export const canRecordPayment = (r: Role) => hasPermission(r, 'recordCollection') || r.id === 'accountManager';
export const canRequestAdjustment = (r: Role) => hasPermission(r, 'recordCollection');
export const canRequestDueAllow = (r: Role) => hasPermission(r, 'recordCollection') || r.id === 'accountManager';
export const canDecideFinance = (r: Role) => hasPermission(r, 'approveFinancial');

/* ---------- periods ---------- */
export const periodKeyOf = (iso: string) => dhakaInputValue(iso).slice(0, 7);
export const currentPeriod = () => periodKeyOf(demoNow().toISOString());
export function shiftPeriod(pk: string, n: number): string {
  const [y, m] = pk.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String(idx % 12 + 1).padStart(2, '0')}`;
}
export function daysIn(pk: string): number {
  const [y, m] = pk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
export function periodLabel(pk: string): string {
  const [y, m] = pk.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
const dayStr = (pk: string, day: number) => `${pk}-${String(day).padStart(2, '0')}`;
const dateOf = (iso: string) => dhakaInputValue(iso);
const dayNum = (date: string) => Number(date.slice(8, 10));

/* ---------- terms ---------- */
export interface AccountTerms {
  term: BillingTerm;
  creditDays: number;
}
export const termsOf = (ba: BillingAccount): AccountTerms => ({ term: ba.billingTerm ?? 'Postpaid', creditDays: ba.creditDays ?? 30 });

export function prorate(rate: number, days: number, dim: number): {amount: number;calc: string;} {
  if (days === dim) return { amount: rate, calc: `Full period: ${formatBDT(rate)}` };
  const amount = Math.round(rate * days / dim);
  return { amount, calc: `${formatBDT(rate)} × ${days}/${dim} days = ${formatBDT(amount)}` };
}

export function dueDateFor(ba: BillingAccount, pk: string, issuedAt: string): string {
  const { term, creditDays } = termsOf(ba);
  if (term === 'Prepaid') {
    const start = `${dayStr(pk, 1)}T23:59:00+06:00`;
    const soonest = dhakaDayAt(issuedAt, 3, '23:59');
    return start > soonest ? start : soonest;
  }
  return dhakaDayAt(`${dayStr(pk, daysIn(pk))}T12:00:00+06:00`, creditDays, '23:59');
}

export function taxFor(db: DemoDatabase, ba: BillingAccount, subtotal: number, idPrefix: string): {line?: InvoiceLine;note: string;} {
  const t = db.taxTreatments.find((x) => x.id === ba.taxTreatmentId) ?? db.taxTreatments[0];
  if (!t) return { note: 'No tax treatment configured — no tax applied (illustrative only)' };
  if (t.basis === 'Exclusive' && t.ratePct !== null) {
    const amount = Math.round(subtotal * t.ratePct / 100);
    return { line: { id: `${idPrefix}-TX`, kind: 'Tax', description: `${t.label} (illustrative)`, amount, calc: `${t.ratePct}% of ${formatBDT(subtotal)} — rate set by Finance, not a statutory assumption` }, note: `${t.label}: ${t.ratePct}% exclusive (illustrative)` };
  }
  if (t.basis === 'Inclusive' && t.ratePct !== null) return { note: `${t.label}: charges are tax-inclusive (illustrative)` };
  return { note: `${t.label}: ${t.ratePct === null ? 'rate not configured' : 'exempt'} — no tax applied (illustrative only)` };
}

/* ---------- connection charges ---------- */
const serviceLabel = (db: DemoDatabase, c: ServiceConnection) => {
  const site = db.sites.find((s) => s.id === c.siteId)?.name;
  return `${c.product ?? c.serviceType}${c.bandwidthMbps ? ` ${c.bandwidthMbps} Mbps` : ''}${site ? ` — ${site}` : ''}`;
};

export function existingRecurring(db: DemoDatabase, connectionId: string, pk: string): Invoice | undefined {
  return db.invoices.find((i) => i.periodKey === pk && i.kind !== 'Adjustment' && i.connectionIds?.includes(connectionId));
}

interface ConnCharge {
  lines: InvoiceLine[];
  notes: string[];
  skip?: string;
}

/** MRC lines for one connection in one period, honouring commencement, effective-dated changes and disconnection. */
export function connectionCharge(db: DemoDatabase, c: ServiceConnection, pk: string, idPrefix: string): ConnCharge {
  const notes: string[] = [];
  const dim = daysIn(pk);
  const pStart = dayStr(pk, 1);
  const pEnd = dayStr(pk, dim);
  const dup = existingRecurring(db, c.id, pk);
  if (dup) return { lines: [], notes, skip: `Already invoiced for ${periodLabel(pk)} in ${dup.id} — duplicate prevented` };
  if (c.status === 'Pending Activation') return { lines: [], notes, skip: 'Pending activation' };
  const disc = db.serviceChanges.find((s) => s.connectionId === c.id && s.type === 'Discontinuation' && billingApproved(s));
  if (c.status === 'Disconnected' && !disc) return { lines: [], notes, skip: 'Disconnected' };

  const jobs = db.installationJobs.filter((j) => j.connectionId === c.id && j.status !== 'Cancelled');
  const commencedJob = jobs.find((j) => j.billingCommencedAt);
  const pendingJob = jobs.find((j) => !j.billingCommencedAt);
  if (pendingJob && !commencedJob) return { lines: [], notes, skip: `Billing commencement not yet reviewed (${pendingJob.id})` };
  const commenced = commencedJob?.billingCommencedAt ?? c.activatedAt;

  let start = 1;
  if (commenced) {
    const cd = dateOf(commenced);
    if (cd > pEnd) return { lines: [], notes, skip: `Billing commences ${formatDhakaDate(commenced)}, after this period` };
    if (cd >= pStart) {
      start = dayNum(cd);
      if (start > 1) notes.push(`Billing commenced ${formatDhakaDate(commenced)}`);
    }
  }
  let end = dim;
  if (disc?.effectiveDate) {
    // The approved service stop date ends billing — pending clearance paperwork never extends it.
    const ed = dateOf(disc.effectiveDate);
    if (ed < pStart) return { lines: [], notes, skip: `Discontinued ${disc.id} — service stopped ${formatDhakaDate(disc.effectiveDate)}, nothing to bill` };
    if (ed < pEnd) {
      end = dayNum(ed);
      notes.push(`Discontinuation ${disc.id}: service stop date ${formatDhakaDate(disc.effectiveDate)} — billed to that date`);
    }
  }

  // Effective-dated rate events: approved tariff changes, carried-out temporary stops and verified resumptions.
  type RateEvent = {date: string;kind: 'rate' | 'stop' | 'resume';rate?: number;ref: string;};
  const events: RateEvent[] = [];
  db.serviceChanges.
  filter((s) => s.connectionId === c.id).
  forEach((s) => {
    if ((s.type === 'Upgrade' || s.type === 'Downgrade') && s.toMrc !== undefined) {
      if (!billingApproved(s)) {
        if (s.status === 'Requested' || s.status === 'Pending Approval') notes.push(`${s.id} ${s.type.toLowerCase()} not yet approved — billed at the current rate`);
        return;
      }
      events.push({ date: dateOf(s.effectiveDate!), kind: 'rate', rate: s.toMrc, ref: `${s.id} ${s.type.toLowerCase()} effective ${formatDhakaDate(s.effectiveDate!)}` });
    }
    if (s.type === 'Temporary Stop' && s.effectiveDate) {
      if (s.status === 'Stopped' || s.status === 'Resumed') {
        events.push({ date: dateOf(s.effectiveDate), kind: 'stop', rate: s.continuingCharge ?? 0, ref: `${s.id} temporary stop from ${formatDhakaDate(s.effectiveDate)} — continuing charge ${formatBDT(s.continuingCharge ?? 0)}/month` });
        if (s.resumedAt) events.push({ date: dateOf(s.resumedAt), kind: 'resume', ref: `${s.id} resumption verified ${formatDhakaDate(s.resumedAt)} — full rate restored` });else
        if (s.expectedResumption && dateOf(s.expectedResumption) <= pEnd) notes.push(`${s.id}: expected resumption ${formatDhakaDate(s.expectedResumption)} not yet verified — continuing charge applies`);
      } else if (s.status === 'Approved') notes.push(`${s.id} temporary stop approved but not yet carried out — billed at the full rate`);
    }
  });
  events.sort((a, b) => a.date.localeCompare(b.date));

  let base = c.mrc;
  let stopped = false;
  let stopRate = 0;
  const rateNow = () => stopped ? stopRate : base;
  const applyEvent = (e: RateEvent) => {
    if (e.kind === 'rate') base = e.rate!;
    if (e.kind === 'stop') {
      stopped = true;
      stopRate = e.rate!;
    }
    if (e.kind === 'resume') stopped = false;
  };
  const LABEL: Record<RateEvent['kind'], string> = { rate: 'new tariff', stop: 'temporary stop', resume: 'resumed' };
  let initial: number | null = null;
  const splits: {day: number;rate: number;ref: string;label: string;}[] = [];
  events.forEach((e) => {
    if (e.date <= pStart) applyEvent(e);else
    if (e.date <= pEnd) {
      if (initial === null) initial = rateNow();
      applyEvent(e);
      splits.push({ day: dayNum(e.date), rate: rateNow(), ref: e.ref, label: LABEL[e.kind] });
    }
  });
  if (initial === null) initial = rateNow();
  if (stopped && !splits.length) notes.push(`Temporarily stopped — continuing charge ${formatBDT(stopRate)}/month applies`);

  const segs: {from: number;to: number;rate: number;note?: string;}[] = [];
  let cursor = start;
  let r: number = initial;
  let note: string | undefined;
  splits.forEach((sp) => {
    if (sp.day > cursor && sp.day <= end) {
      segs.push({ from: cursor, to: sp.day - 1, rate: r, note });
      cursor = sp.day;
    }
    r = sp.rate;
    note = sp.label;
    notes.push(sp.ref);
  });
  if (cursor <= end) segs.push({ from: cursor, to: end, rate: r, note });
  if (segs.every((s) => s.rate === 0)) return { lines: [], notes, skip: 'Temporarily stopped with no continuing charge' };

  const label = serviceLabel(db, c);
  const lines = segs.map((s, i): InvoiceLine => {
    const days = s.to - s.from + 1;
    const p = prorate(s.rate, days, dim);
    return {
      id: `${idPrefix}-${c.id}-${i + 1}`, kind: 'MRC', connectionId: c.id,
      description: `${label}${segs.length > 1 ? ` (${dayNum(dayStr(pk, s.from))}–${s.to} ${periodLabel(pk).slice(0, 3)}${s.note ? `, ${s.note}` : ''})` : ''}`,
      from: dayStr(pk, s.from), to: dayStr(pk, s.to), days, daysInPeriod: dim, rate: s.rate, amount: p.amount, calc: p.calc
    };
  });
  return { lines, notes };
}

/* ---------- drafts ---------- */
export interface InvoiceDraft {
  billingAccountId: string;
  customerId?: string;
  associateId?: string;
  kind: InvoiceKind;
  periodKey: string;
  connectionIds: string[];
  lines: InvoiceLine[];
  subtotal: number;
  amount: number;
  dueDate: string;
  billingTerm: BillingTerm;
  taxNote: string;
  notes: string[];
  description: string;
}

export function accountDraft(db: DemoDatabase, ba: BillingAccount, pk: string, issuedAt: string): {draft?: InvoiceDraft;skipped: BillingRunSkip[];} {
  const skipped: BillingRunSkip[] = [];
  const conns = db.connections.filter((c) => c.billingAccountId === ba.id);
  if (!conns.length) {
    if (ba.collectionMode === 'Associate — Centralised') skipped.push({ billingAccountId: ba.id, reason: 'Centralised subscriber pool — billed per subscriber outside the connection run' });
    return { skipped };
  }
  const lines: InvoiceLine[] = [];
  const notes: string[] = [];
  const ids: string[] = [];
  conns.forEach((c) => {
    const ch = connectionCharge(db, c, pk, `${ba.id}-${pk}`);
    if (ch.skip) skipped.push({ billingAccountId: ba.id, connectionId: c.id, reason: ch.skip });else
    {
      lines.push(...ch.lines.map((l) => ba.collectionMode === 'Associate — Fixed Monthly' && l.days === l.daysInPeriod ? { ...l, calc: `Fixed monthly amount (associate terms): ${formatBDT(l.amount)}` } : l));
      notes.push(...ch.notes.map((n) => `${c.id}: ${n}`));
      ids.push(c.id);
    }
  });
  if (!lines.length) return { skipped };
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = taxFor(db, ba, subtotal, `${ba.id}-${pk}`);
  if (tax.line) lines.push(tax.line);
  const { term } = termsOf(ba);
  return {
    skipped,
    draft: {
      billingAccountId: ba.id, customerId: ba.customerId, associateId: ba.associateId, kind: ba.associateId ? 'Associate' : 'Recurring', periodKey: pk, connectionIds: ids, lines, subtotal,
      amount: subtotal + (tax.line?.amount ?? 0), dueDate: dueDateFor(ba, pk, issuedAt), billingTerm: term, taxNote: tax.note, notes,
      description: `${ids.length > 1 ? `${ids.length} services` : lines[0].description} — ${periodLabel(pk)}`
    }
  };
}

export function runPreview(db: DemoDatabase, pk: string, issuedAt: string, accountIds?: string[]) {
  const drafts: InvoiceDraft[] = [];
  const skipped: BillingRunSkip[] = [];
  db.billingAccounts.
  filter((b) => !accountIds || accountIds.includes(b.id)).
  forEach((ba) => {
    const r = accountDraft(db, ba, pk, issuedAt);
    if (r.draft) drafts.push(r.draft);
    skipped.push(...r.skipped);
  });
  return { drafts, skipped, total: drafts.reduce((s, d) => s + d.amount, 0) };
}

/** First invoice raised when Accounts commences billing on a completed installation. */
export function firstBillDraft(db: DemoDatabase, c: ServiceConnection, startIso: string, otc: number, issuedAt: string): InvoiceDraft | {error: string;} {
  const ba = db.billingAccounts.find((b) => b.id === c.billingAccountId);
  if (!ba) return { error: 'Billing account not found.' };
  const pk = periodKeyOf(startIso);
  const dup = existingRecurring(db, c.id, pk);
  if (dup) return { error: `${c.id} is already invoiced for ${periodLabel(pk)} in ${dup.id}.` };
  const dim = daysIn(pk);
  const start = dayNum(dateOf(startIso));
  const days = dim - start + 1;
  const p = prorate(c.mrc, days, dim);
  const lines: InvoiceLine[] = [
  { id: `${c.id}-${pk}-1`, kind: 'MRC', connectionId: c.id, description: `${serviceLabel(db, c)} — from billing commencement`, from: dayStr(pk, start), to: dayStr(pk, dim), days, daysInPeriod: dim, rate: c.mrc, amount: p.amount, calc: p.calc }];

  if (otc > 0) lines.push({ id: `${c.id}-${pk}-OTC`, kind: 'OTC', connectionId: c.id, description: 'One-time installation charge (approved OTC)', amount: otc, calc: 'One-time, per approved work order terms' });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = taxFor(db, ba, subtotal, `${c.id}-${pk}`);
  if (tax.line) lines.push(tax.line);
  return {
    billingAccountId: ba.id, customerId: c.customerId, associateId: ba.associateId, kind: 'First bill', periodKey: pk, connectionIds: [c.id], lines, subtotal, amount: subtotal + (tax.line?.amount ?? 0),
    dueDate: dueDateFor(ba, pk, issuedAt), billingTerm: termsOf(ba).term, taxNote: tax.note, notes: [], description: `${serviceLabel(db, c)} — ${start}–${dim} ${periodLabel(pk)} (pro-rated)${otc ? ' + installation' : ''}`
  };
}

/* ---------- balances ---------- */
export interface Balances {
  due: number;
  advance: number;
  deposit: number;
  pendingClaims: number;
  net: number;
}
export function accountBalances(db: DemoDatabase, baId: string): Balances {
  const due = accountOutstanding(db, baId);
  const advance = accountAdvance(db, baId);
  const deposit = accountDeposit(db, baId);
  const pendingClaims = db.receipts.filter((r) => r.billingAccountId === baId && r.status === 'Pending Verification').reduce((s, r) => s + r.amount, 0);
  return { due, advance, deposit, pendingClaims, net: due - advance };
}

/* ---------- receipts ---------- */
export const normalizeRef = (ref: string) => ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function duplicateReceipt(db: DemoDatabase, method: string, reference: string, excludeId?: string): Receipt | undefined {
  const key = normalizeRef(reference);
  if (!key) return undefined;
  return db.receipts.find((r) => r.id !== excludeId && r.status !== 'Rejected' && r.method === method && normalizeRef(r.reference) === key);
}
export const openInvoices = (db: DemoDatabase, baId: string) =>
db.invoices.filter((i) => i.billingAccountId === baId && invoiceOutstanding(i) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

/* ---------- due allow & suspension review ---------- */
export function dueAllowState(da: DueAllow, now = demoNow().toISOString()): DueAllowState {
  if (da.status === 'Pending' || da.status === 'Rejected' || da.status === 'Revoked') return da.status;
  if (now < da.validFrom) return 'Scheduled';
  if (now > da.validUntil) return 'Expired';
  return 'Active';
}
export const activeDueAllow = (db: DemoDatabase, baId: string) => db.dueAllows.find((d) => d.billingAccountId === baId && dueAllowState(d) === 'Active');

export interface SuspensionFlag {
  billingAccountId: string;
  oldestInvoiceId: string;
  daysPastDue: number;
  threshold: number;
  term: BillingTerm;
  due: number;
  coveredBy?: DueAllow;
  exceedsLimit: boolean;
  referral?: SuspensionReview;
}

export function suspensionFlags(db: DemoDatabase): SuspensionFlag[] {
  const now = demoNow().getTime();
  const out: SuspensionFlag[] = [];
  db.billingAccounts.forEach((ba) => {
    const overdue = db.invoices.filter((i) => i.billingAccountId === ba.id && invoiceOutstanding(i) > 0 && new Date(i.dueDate).getTime() < now).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (!overdue.length) return;
    const { term } = termsOf(ba);
    const threshold = term === 'Prepaid' ? db.billingPolicy.prepaidGraceDays : db.billingPolicy.postpaidReviewDays;
    const daysPastDue = Math.floor((now - new Date(overdue[0].dueDate).getTime()) / 86400000);
    if (daysPastDue <= threshold) return;
    const due = accountOutstanding(db, ba.id);
    const da = activeDueAllow(db, ba.id);
    out.push({
      billingAccountId: ba.id, oldestInvoiceId: overdue[0].id, daysPastDue, threshold, term, due,
      coveredBy: da && due <= da.creditLimit ? da : undefined, exceedsLimit: !!da && due > da.creditLimit,
      referral: db.suspensionReviews.find((s) => s.billingAccountId === ba.id && s.status === 'Referred to Technical')
    });
  });
  return out;
}

/* ---------- statement ---------- */
export interface StatementRow {
  at: string;
  doc: string;
  description: string;
  charge: number;
  credit: number;
  balance: number;
  link?: string;
}

export function statementRows(db: DemoDatabase, baId: string): StatementRow[] {
  const rows: Omit<StatementRow, 'balance'>[] = [];
  db.invoices.
  filter((i) => i.billingAccountId === baId).
  forEach((i) => {
    rows.push({ at: i.issuedAt, doc: i.id, description: `${i.kind === 'Adjustment' ? 'Debit adjustment' : 'Invoice'} · ${i.period}`, charge: i.amount, credit: 0, link: `/billing/invoice/${i.id}` });
    const viaAdj = db.billingAdjustments.filter((a) => a.invoiceId === i.id && a.kind === 'Credit note' && a.status === 'Approved');
    viaAdj.forEach((a) => rows.push({ at: a.decidedAt ?? a.requestedAt, doc: a.id, description: `Credit note on ${i.id} — ${a.reason}`, charge: 0, credit: a.amount }));
    const other = i.credits - viaAdj.reduce((s, a) => s + a.amount, 0);
    if (other > 0) rows.push({ at: i.issuedAt, doc: i.id, description: `Credit applied on ${i.id}`, charge: 0, credit: other });
  });
  db.receipts.
  filter((r) => r.billingAccountId === baId && r.purpose !== 'Security deposit' && (r.status === 'Verified' || r.status === 'Reversed')).
  forEach((r) => {
    rows.push({ at: r.receivedAt, doc: r.id, description: `Payment · ${r.method}${r.status === 'Reversed' ? ' (later reversed)' : ''}`, charge: 0, credit: r.amount, link: `/billing/receipt/${r.id}` });
    if (r.status === 'Reversed') rows.push({ at: r.reversedAt ?? r.receivedAt, doc: r.id, description: `Reversal of ${r.id}`, charge: r.amount, credit: 0, link: `/billing/receipt/${r.id}` });
  });
  rows.sort((a, b) => a.at.localeCompare(b.at));
  let bal = 0;
  return rows.map((r) => {
    bal += r.charge - r.credit;
    return { ...r, balance: bal };
  });
}

/** Plain-language reasons shown on statements when balances look contradictory. */
export function statementExplanations(db: DemoDatabase, baId: string): string[] {
  const b = accountBalances(db, baId);
  const out: string[] = [];
  if (b.advance > 0 && b.due > 0) {
    const free = db.receipts.filter((r) => r.billingAccountId === baId && r.status === 'Verified' && r.purpose !== 'Security deposit' && r.amount - r.allocations.reduce((s, a) => s + a.amount, 0) > 0);
    out.push(`An advance of ${formatBDT(b.advance)} and a due of ${formatBDT(b.due)} appear together because ${free.map((r) => r.id).join(', ')} ${free.length > 1 ? 'have' : 'has'} not yet been allocated to invoices. Accounts allocates verified receipts; until then the invoices remain due.`);
  }
  if (b.deposit > 0) out.push(`The security deposit of ${formatBDT(b.deposit)} is held separately. It is never used for monthly charges automatically — only an authorised adjustment at closure can apply or refund it.`);
  if (b.pendingClaims > 0) out.push(`${formatBDT(b.pendingClaims)} in payment claims is awaiting verification by Accounts and is not counted in any balance yet.`);
  return out;
}

export const invoiceNetAmount = invoiceNet;