import { roles } from '../data/roles';
import { dhakaInputValue, demoNow, fromDhakaInput } from './format';
import type { DemoUser, Role } from '../types/erp';
import type { DemoDatabase, EntityRef } from '../types/records';
import type { ExpenseCategory, ExpenseClaim, ExpenseLine, ExpenseRelation, FieldVisit, FileRef, GeoStamp, TargetMeasure, VisitOutcome, VisitPurpose } from '../types/field';

// NOTE: These rules shape the demo only. Production systems must enforce them on the server.

export const RECEIPT_THRESHOLD = 500;

const has = (role: Role, p: Role['permissions'][number]) => role.permissions.includes(p);
const roleOf = (u?: DemoUser) => roles.find((r) => r.id === u?.role);

// ---------- Permissions ----------

/** Roles that do field work and claim expenses. */
export function canLogVisits(role: Role): boolean {
  return role.modules.includes('field') && (has(role, 'createQuotation') || has(role, 'technicalConfig'));
}

export function canSeeAllFieldWork(role: Role): boolean {
  return has(role, 'manageSalesTeam');
}

export function canSeeAllClaims(role: Role): boolean {
  return has(role, 'manageSalesTeam') || has(role, 'approveFinancial') || has(role, 'payExpense');
}

/** Visits: own, direct reports, or everything for sales managers. */
export function canSeeVisitsOf(viewer: DemoUser, viewerRole: Role, ownerId: string, db: DemoDatabase): boolean {
  if (ownerId === viewer.id || canSeeAllFieldWork(viewerRole)) return true;
  return db.users.find((u) => u.id === ownerId)?.managerId === viewer.id;
}

export function canSeeClaimOf(viewer: DemoUser, viewerRole: Role, claimantId: string, db: DemoDatabase): boolean {
  if (claimantId === viewer.id || canSeeAllClaims(viewerRole)) return true;
  return db.users.find((u) => u.id === claimantId)?.managerId === viewer.id;
}

/** Line manager with expense authority, or Finance Approver. Never the claimant. */
export function canDecideClaim(claim: ExpenseClaim, user: DemoUser, role: Role, db: DemoDatabase): string | null {
  if (claim.status !== 'Submitted') return 'Only submitted claims can be decided.';
  if (claim.claimantId === user.id) return 'You can’t approve your own claim.';
  const claimant = db.users.find((u) => u.id === claim.claimantId);
  if (has(role, 'approveFinancial')) return null;
  if (has(role, 'approveExpense') && claimant?.managerId === user.id) return null;
  return claimant?.managerId && expenseApproverIsManager(db, claimant.id) ? `Awaiting ${userLabel(db, claimant.managerId)} or the Finance Approver.` : 'Awaiting the Finance Approver.';
}

export function canPayClaim(claim: ExpenseClaim, user: DemoUser, role: Role): string | null {
  if (claim.status !== 'Approved') return 'Only approved claims can be paid.';
  if (claim.claimantId === user.id) return 'You can’t pay your own claim.';
  return has(role, 'payExpense') ? null : 'Accounts records payment.';
}

/** Authorised correction of an approved (locked) claim before payment. */
export function canAdjustClaim(claim: ExpenseClaim, user: DemoUser, role: Role): string | null {
  if (claim.status !== 'Approved') return 'Adjustments apply to approved, unpaid claims.';
  if (claim.claimantId === user.id) return 'You can’t adjust your own claim.';
  return has(role, 'approveFinancial') ? null : 'Only the Finance Approver can adjust an approved claim.';
}

export function isEditable(claim: ExpenseClaim): boolean {
  return claim.status === 'Draft' || claim.status === 'Returned';
}

/** Whether the claimant's line manager holds expense approval authority (otherwise Finance Approver decides). */
export function expenseApproverIsManager(db: DemoDatabase, claimantId: string): boolean {
  const claimant = db.users.find((u) => u.id === claimantId);
  const manager = db.users.find((u) => u.id === claimant?.managerId && u.status === 'Active');
  return !!manager && !!roleOf(manager)?.permissions.includes('approveExpense');
}

function userLabel(db: DemoDatabase, id: string): string {
  return db.users.find((u) => u.id === id)?.name ?? 'the line manager';
}

/** The claimant's open claim new lines go into (Draft or Returned), if any. */
export function openClaimFor(db: DemoDatabase, userId: string): ExpenseClaim | undefined {
  return db.expenseClaims.find((c) => c.claimantId === userId && c.status === 'Returned') ?? db.expenseClaims.find((c) => c.claimantId === userId && c.status === 'Draft');
}

// ---------- Amounts ----------

export function claimLinesTotal(c: ExpenseClaim): number {
  return c.lines.reduce((s, l) => s + l.amount, 0);
}

export function claimTotal(c: ExpenseClaim): number {
  return claimLinesTotal(c) + c.adjustments.reduce((s, a) => s + a.amount, 0);
}

export function receiptRequired(line: Pick<ExpenseLine, 'category' | 'amount'>): 'always' | 'threshold' | 'optional' {
  if (line.category === 'Entertainment') return 'always';
  return line.amount >= RECEIPT_THRESHOLD ? 'threshold' : 'optional';
}

/** Returns the problem with a line's receipt, or null. */
export function receiptProblem(line: Pick<ExpenseLine, 'category' | 'amount' | 'receipt' | 'noReceiptReason'>): string | null {
  if (line.receipt) return null;
  const req = receiptRequired(line);
  if (req === 'always') return 'Entertainment needs a receipt.';
  if (req === 'threshold' && !(line.noReceiptReason && line.noReceiptReason.trim().length >= 5))
  return `Attach a receipt or explain why there isn’t one (amounts of ৳ ${RECEIPT_THRESHOLD} or more).`;
  return null;
}

// ---------- Drafts ----------

export interface ExpenseLineDraft {
  date: string;
  category: ExpenseCategory;
  amount: string;
  purpose: string;
  relation: ExpenseRelation;
  subject?: EntityRef;
  visitId?: string;
  receipt?: FileRef;
  noReceiptReason: string;
}

export interface VisitDraft {
  at: string;
  durationMin: string;
  subjectType: 'lead' | 'customer';
  subjectId: string;
  location: string;
  purpose: VisitPurpose;
  peopleMet: string;
  outcome: VisitOutcome;
  notes: string;
  nextAction: string;
  nextActionDue: string;
  attachments: FileRef[];
  photos: number;
  geo?: GeoStamp;
}

export type DraftErrors<T> = Partial<Record<keyof T, string>>;

export function emptyVisitDraft(): VisitDraft {
  return {
    at: dhakaInputValue(demoNow().toISOString(), true),
    durationMin: '45',
    subjectType: 'lead',
    subjectId: '',
    location: '',
    purpose: 'Prospecting',
    peopleMet: '',
    outcome: 'Positive',
    notes: '',
    nextAction: '',
    nextActionDue: '',
    attachments: [],
    photos: 0
  };
}

export function emptyExpenseLine(date: string, relation: ExpenseRelation = 'Customer acquisition'): ExpenseLineDraft {
  return { date, category: 'Conveyance', amount: '', purpose: '', relation, noReceiptReason: '' };
}

export const parseTaka = (v: string) => Number(v.replace(/[,৳\s]/g, '')) || 0;

export function validateVisit(d: VisitDraft): DraftErrors<VisitDraft> {
  const e: DraftErrors<VisitDraft> = {};
  const now = demoNow().toISOString();
  if (!d.at) e.at = 'Enter the visit date and time.';else
  if (fromDhakaInput(d.at) > now) e.at = 'A visit can’t be logged in the future.';
  if (!d.subjectId) e.subjectId = `Choose the ${d.subjectType}.`;
  if (!d.location.trim()) e.location = 'Enter where the visit took place.';
  if (!d.peopleMet.trim()) e.peopleMet = 'Who did you meet?';
  if (d.notes.trim().length < 5) e.notes = 'Add a short note on what happened.';
  if (!(Number(d.durationMin) > 0)) e.durationMin = 'Enter the duration.';
  if (d.nextAction.trim() && !d.nextActionDue) e.nextActionDue = 'When is the next action due?';
  if (!d.nextAction.trim() && d.nextActionDue) e.nextAction = 'Describe the next action.';
  if (d.nextActionDue && fromDhakaInput(d.nextActionDue) < now) e.nextActionDue = 'The next action can’t be due in the past.';
  return e;
}

export function validateExpenseLine(l: ExpenseLineDraft): DraftErrors<ExpenseLineDraft> {
  const e: DraftErrors<ExpenseLineDraft> = {};
  const amount = parseTaka(l.amount);
  if (!l.date) e.date = 'Enter the date.';else
  if (l.date > dhakaInputValue(demoNow().toISOString())) e.date = 'Expenses can’t be in the future.';
  if (!(amount > 0)) e.amount = 'Enter the amount.';else
  if (amount > 50000) e.amount = 'Single lines over ৳ 50,000 need a separate finance request.';
  if (l.purpose.trim().length < 3) e.purpose = 'Describe the purpose.';
  const problem = receiptProblem({ category: l.category, amount, receipt: l.receipt, noReceiptReason: l.noReceiptReason });
  if (problem) e.receipt = problem;
  return e;
}

// ---------- Targets ----------

export const TARGET_MEASURES: {id: TargetMeasure;label: string;money: boolean;}[] = [
{ id: 'visits', label: 'Visits', money: false },
{ id: 'wonDeals', label: 'Won deals', money: false },
{ id: 'newMrc', label: 'New contracted MRC', money: true },
{ id: 'collectedCash', label: 'Collected cash', money: true }];


const inPeriod = (iso: string | undefined, period: string) => !!iso && dhakaInputValue(iso).startsWith(period);

/** Each measure is counted independently — none is derived from another. */
export function achievement(db: DemoDatabase, userId: string, period: string, measure: TargetMeasure): number {
  switch (measure) {
    case 'visits':
      return db.fieldVisits.filter((v) => v.userId === userId && inPeriod(v.at, period)).length;
    case 'wonDeals':
      return db.opportunities.filter((o) => o.ownerId === userId && o.status === 'Won' && inPeriod(o.wonAt, period)).length;
    case 'newMrc':
      return db.opportunities.filter((o) => o.ownerId === userId && o.status !== 'Lost' && o.status !== 'Merged' && inPeriod(o.contractedAt, period)).reduce((s, o) => s + o.expectedMrc, 0);
    case 'collectedCash':
      return db.receipts.
      filter((r) => r.status === 'Verified' && inPeriod(r.verifiedAt, period)).
      filter((r) => {
        const ba = db.billingAccounts.find((b) => b.id === r.billingAccountId);
        const c = db.customers.find((x) => x.id === ba?.customerId);
        if (!c) return false;
        const origin = c.leadId ? db.opportunities.find((o) => o.leadId === c.leadId && o.customerId === c.id) : undefined;
        return (origin?.ownerId ?? c.accountManagerId) === userId;
      }).
      reduce((s, r) => s + r.amount, 0);
  }
}

export function isFieldRole(u: DemoUser): boolean {
  const r = roleOf(u);
  return !!r && canLogVisits(r);
}

export function followUpOverdue(v: FieldVisit): boolean {
  return !!v.nextActionDue && !v.followUpDoneAt && v.nextActionDue < demoNow().toISOString();
}