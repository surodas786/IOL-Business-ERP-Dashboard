import { roles } from '../data/roles';
import { hasPermission } from './access';
import { formatBDT, formatDhaka, formatDhakaDate } from './format';
import { invoiceOutstanding, nextId, receiptUnallocated } from './relations';
import { currentSnapshot } from './customerProfile';
import { duplicateReceipt, periodLabel, runPreview, suspensionFlags, type InvoiceDraft } from './billingCalc';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { Allocation, Approval, DemoDatabase, EntityRef, Invoice, Receipt } from '../types/records';
import type { AdjustmentKind, ReceiptMethod, ReceiptPurpose } from '../types/billing';
import type { Actor, WorkflowResult } from './workflow';

export type BillingAction =
{type: 'BILL_POST_RUN';periodKey: string;accountIds?: string[];} |
{
  type: 'BILL_CLAIM_RECEIPT';
  billingAccountId: string;
  amount: number;
  method: ReceiptMethod;
  reference: string;
  receivedAt: string;
  payer: string;
  collectorName: string;
  evidence?: string;
  purpose: ReceiptPurpose;
  intendedInvoiceIds: string[];
  note?: string;
} |
{type: 'BILL_VERIFY_RECEIPT';receiptId: string;allocations: Allocation[];} |
{type: 'BILL_REJECT_RECEIPT';receiptId: string;reason: string;} |
{type: 'BILL_ALLOCATE';receiptId: string;allocations: Allocation[];} |
{type: 'BILL_REQUEST_ADJUSTMENT';kind: AdjustmentKind;billingAccountId: string;invoiceId?: string;receiptId?: string;amount: number;reason: string;} |
{type: 'BILL_REQUEST_DUE_ALLOW';billingAccountId: string;creditLimit: number;reason: string;validFrom: string;validUntil: string;reviewAt: string;} |
{type: 'BILL_REVOKE_DUE_ALLOW';dueAllowId: string;reason: string;} |
{type: 'BILL_REFER_SUSPENSION';billingAccountId: string;note: string;} |
{type: 'BILL_WITHDRAW_SUSPENSION';reviewId: string;reason: string;};

export function isBillingAction(a: {type: string;}): a is BillingAction {
  return a.type.startsWith('BILL_');
}

const MIN_REASON = 10;

const roleOf = (d: DemoDatabase, actorId: string) => roles.find((r) => r.id === d.users.find((u) => u.id === actorId)?.role);
const can = (d: DemoDatabase, actorId: string, p: Permission) => {
  const r = roleOf(d, actorId);
  return !!r && hasPermission(r, p);
};

function pushAudit(d: DemoDatabase, actor: Actor, at: string, action: string, summary: string, entity: EntityRef, related: EntityRef[] = []) {
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action, summary, entity, related });
}
function pushNotice(d: DemoDatabase, actor: Actor, at: string, n: {title: string;detail: string;module?: ModuleId;branchId: BranchId | null;entity: EntityRef;requires?: Permission[];forUserIds?: string[];}) {
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], module: 'billing', ...n });
}

/** Posts a draft as an immutable invoice. Duplicates for the same service and period are rejected by the draft builder. */
export function postDraft(d: DemoDatabase, draft: InvoiceDraft, at: string, actorId: string, runId?: string): Invoice {
  const id = nextId(d.invoices, 'INV-', 5);
  const ba = d.billingAccounts.find((b) => b.id === draft.billingAccountId)!;
  const c = d.customers.find((x) => x.id === draft.customerId);
  const inv: Invoice = {
    id, billingAccountId: ba.id, customerId: draft.customerId, associateId: draft.associateId, period: periodLabel(draft.periodKey), description: draft.description,
    amount: draft.amount, credits: 0, paidAmount: 0, issuedAt: at, dueDate: draft.dueDate, branchId: ba.branchId, zoneId: ba.zoneId,
    kind: draft.kind, periodKey: draft.periodKey, connectionIds: draft.connectionIds, lines: draft.lines.map((l, i) => ({ ...l, id: `${id}-L${i + 1}` })),
    billingTerm: draft.billingTerm, runId, taxNote: draft.taxNote, postedById: actorId, customerSnapshot: c ? currentSnapshot(c, at) : undefined
  };
  d.invoices.push(inv);
  return inv;
}

function applyAllocations(d: DemoDatabase, r: Receipt, allocations: Allocation[]): string | undefined {
  const wanted = allocations.filter((a) => a.amount > 0);
  const total = wanted.reduce((s, a) => s + a.amount, 0);
  if (total > receiptUnallocated(r)) return `Allocations (${formatBDT(total)}) exceed the unallocated ${formatBDT(receiptUnallocated(r))}.`;
  for (const a of wanted) {
    const inv = d.invoices.find((i) => i.id === a.invoiceId);
    if (!inv || inv.billingAccountId !== r.billingAccountId) return 'Receipts can only settle invoices on the same billing account.';
    if (a.amount > invoiceOutstanding(inv)) return `${inv.id} has only ${formatBDT(invoiceOutstanding(inv))} outstanding.`;
  }
  wanted.forEach((a) => {
    const inv = d.invoices.find((i) => i.id === a.invoiceId)!;
    inv.paidAmount += a.amount;
    const ex = r.allocations.find((x) => x.invoiceId === a.invoiceId);
    if (ex) ex.amount += a.amount;else
    r.allocations.push({ ...a });
  });
  return undefined;
}

export function applyBillingAction(db: DemoDatabase, action: BillingAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const audit = (a: string, s: string, e: EntityRef, rel: EntityRef[] = []) => pushAudit(d, actor, at, a, s, e, rel);
  const notify = (n: Parameters<typeof pushNotice>[3]) => pushNotice(d, actor, at, n);
  const accountName = (id: string) => d.billingAccounts.find((b) => b.id === id)?.name ?? id;

  switch (action.type) {
    case 'BILL_POST_RUN':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can post billing runs.');
        const prev = runPreview(d, action.periodKey, at, action.accountIds);
        if (!prev.drafts.length) return fail(`Nothing to invoice for ${periodLabel(action.periodKey)} — every service is already invoiced or not billable.`);
        const runId = action.accountIds ? undefined : `BR-${action.periodKey}${d.billingRuns.some((r) => r.periodKey === action.periodKey) ? `-${d.billingRuns.filter((r) => r.periodKey === action.periodKey).length + 1}` : ''}`;
        const posted = prev.drafts.map((dr) => postDraft(d, dr, at, actor.id, runId));
        if (runId) d.billingRuns.unshift({ id: runId, periodKey: action.periodKey, runAt: at, byId: actor.id, invoiceIds: posted.map((p) => p.id), skipped: prev.skipped, total: prev.total });
        const refs = posted.map((p): EntityRef => ({ type: 'invoice', id: p.id }));
        audit(runId ? 'Billing run posted' : 'Invoice generated', `${periodLabel(action.periodKey)}: ${posted.length} invoice(s), ${formatBDT(prev.total)}${prev.skipped.length ? `; ${prev.skipped.length} skipped` : ''}`, refs[0], refs.slice(1));
        notify({ title: runId ? `Billing run ${runId} posted` : `Invoice ${posted[0].id} issued`, detail: `${posted.length} invoice(s) · ${formatBDT(prev.total)}`, branchId: posted.length === 1 ? posted[0].branchId : null, requires: ['viewFinancials'], entity: refs[0] });
        return ok(runId ? `${runId}: ${posted.length} invoice(s) posted for ${formatBDT(prev.total)}.` : `${posted[0].id} issued for ${formatBDT(posted[0].amount)}.`);
      }

    case 'BILL_CLAIM_RECEIPT':{
        const r0 = roleOf(d, actor.id);
        if (!r0 || !(hasPermission(r0, 'recordCollection') || r0.id === 'accountManager')) return fail('Your role cannot record payment claims.');
        const ba = d.billingAccounts.find((b) => b.id === action.billingAccountId);
        if (!ba) return fail('Choose a billing account.');
        if (!(action.amount > 0)) return fail('Enter an amount above zero.');
        if (!action.payer.trim()) return fail('Enter who paid.');
        if (!action.reference.trim()) return fail(action.method === 'Cash' ? 'Enter the money-receipt book number.' : 'Enter the transaction reference.');
        if (!action.receivedAt) return fail('Enter the payment date.');
        if (action.receivedAt > at) return fail('Payment date cannot be in the future.');
        const dup = duplicateReceipt(d, action.method, action.reference);
        if (dup) return fail(`Reference already used on ${dup.id} (${dup.status}). Duplicate claims are not accepted.`);
        const id = nextId(d.receipts, 'RC-2026-', 4);
        d.receipts.push({
          id, billingAccountId: ba.id, amount: action.amount, method: action.method, reference: action.reference.trim(), receivedAt: action.receivedAt, status: 'Pending Verification', allocations: [],
          purpose: action.purpose, payer: action.payer.trim(), collectorName: action.collectorName.trim() || actor.name, evidence: action.evidence, recordedById: actor.id, recordedAt: at,
          intendedInvoiceIds: action.purpose === 'Payment' ? action.intendedInvoiceIds : [], note: action.note?.trim() || undefined, branchId: ba.branchId, zoneId: ba.zoneId
        });
        audit('Payment claim recorded', `${id}: ${formatBDT(action.amount)} ${action.method} from ${action.payer.trim()} for ${ba.name} — unverified`, { type: 'receipt', id }, [{ type: 'billingAccount', id: ba.id }]);
        notify({ title: `Verify payment ${id}`, detail: `${ba.name} · ${formatBDT(action.amount)} · ${action.method}`, branchId: ba.branchId, requires: ['recordCollection'], entity: { type: 'receipt', id } });
        return ok(`${id} recorded. It stays unverified and does not affect balances until Accounts confirms it.`);
      }

    case 'BILL_VERIFY_RECEIPT':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can verify payments.');
        const r = d.receipts.find((x) => x.id === action.receiptId);
        if (!r || r.status !== 'Pending Verification') return fail('This receipt is not awaiting verification.');
        const dup = duplicateReceipt(d, r.method, r.reference, r.id);
        if (dup) return fail(`Duplicate reference — already used on ${dup.id}. Reject this claim instead.`);
        r.status = 'Verified';
        r.verifiedAt = at;
        r.verifiedById = actor.id;
        if (r.purpose !== 'Security deposit') {
          const err = applyAllocations(d, r, action.allocations);
          if (err) return fail(err);
        }
        const left = receiptUnallocated(r);
        const summary =
        r.purpose === 'Security deposit' ?
        `${r.id} verified — ${formatBDT(r.amount)} held as security deposit for ${accountName(r.billingAccountId)}` :
        `${r.id} verified for ${accountName(r.billingAccountId)}: ${formatBDT(r.amount - left)} allocated${r.allocations.length ? ` to ${r.allocations.map((a) => a.invoiceId).join(', ')}` : ''}${left ? `, ${formatBDT(left)} held as unallocated advance` : ''}`;
        audit('Receipt verified', summary, { type: 'receipt', id: r.id }, [{ type: 'billingAccount', id: r.billingAccountId }, ...r.allocations.map((a): EntityRef => ({ type: 'invoice', id: a.invoiceId }))]);
        const recorder = r.recordedById && r.recordedById !== actor.id ? [r.recordedById] : undefined;
        notify({ title: `Payment ${r.id} verified`, detail: `${accountName(r.billingAccountId)} · ${formatBDT(r.amount)}`, branchId: r.branchId, requires: ['viewFinancials'], entity: { type: 'receipt', id: r.id }, forUserIds: recorder });
        return ok(summary);
      }

    case 'BILL_REJECT_RECEIPT':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can reject payment claims.');
        const r = d.receipts.find((x) => x.id === action.receiptId);
        if (!r || r.status !== 'Pending Verification') return fail('This receipt is not awaiting verification.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        r.status = 'Rejected';
        r.rejectReason = action.reason.trim();
        r.verifiedById = actor.id;
        r.verifiedAt = at;
        audit('Payment claim rejected', `${r.id} rejected — ${r.rejectReason}`, { type: 'receipt', id: r.id }, [{ type: 'billingAccount', id: r.billingAccountId }]);
        notify({ title: `Payment claim ${r.id} rejected`, detail: r.rejectReason, branchId: r.branchId, requires: ['viewFinancials'], entity: { type: 'receipt', id: r.id }, forUserIds: r.recordedById ? [r.recordedById] : undefined });
        return ok(`${r.id} rejected. It stays on record and never affects balances.`);
      }

    case 'BILL_ALLOCATE':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can allocate receipts.');
        const r = d.receipts.find((x) => x.id === action.receiptId);
        if (!r || r.status !== 'Verified') return fail('Only verified receipts can be allocated.');
        if (r.purpose === 'Security deposit') return fail('Security deposits are never applied to monthly charges through allocation.');
        if (!action.allocations.some((a) => a.amount > 0)) return fail('Enter at least one amount.');
        const err = applyAllocations(d, r, action.allocations);
        if (err) return fail(err);
        const total = action.allocations.reduce((s, a) => s + a.amount, 0);
        audit('Advance allocated', `${formatBDT(total)} from ${r.id} allocated to ${action.allocations.filter((a) => a.amount > 0).map((a) => a.invoiceId).join(', ')}`, { type: 'receipt', id: r.id }, action.allocations.map((a): EntityRef => ({ type: 'invoice', id: a.invoiceId })));
        return ok(`${formatBDT(total)} allocated. ${formatBDT(receiptUnallocated(r))} remains as advance.`);
      }

    case 'BILL_REQUEST_ADJUSTMENT':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can request adjustments.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        const ba = d.billingAccounts.find((b) => b.id === action.billingAccountId);
        if (!ba) return fail('Billing account not found.');
        let entity: EntityRef = { type: 'billingAccount', id: ba.id };
        let amount = action.amount;
        if (action.kind === 'Credit note') {
          const inv = d.invoices.find((i) => i.id === action.invoiceId);
          if (!inv) return fail('Choose the invoice to credit.');
          if (!(amount > 0) || amount > invoiceOutstanding(inv)) return fail(`Credit must be between ৳ 1 and the outstanding ${formatBDT(invoiceOutstanding(inv))}.`);
          if (d.billingAdjustments.some((a) => a.invoiceId === inv.id && a.status === 'Pending')) return fail(`${inv.id} already has a pending adjustment.`);
          entity = { type: 'invoice', id: inv.id };
        } else if (action.kind === 'Receipt reversal') {
          const r = d.receipts.find((x) => x.id === action.receiptId);
          if (!r || r.status !== 'Verified') return fail('Only verified receipts can be reversed.');
          if (d.billingAdjustments.some((a) => a.receiptId === r.id && a.status === 'Pending')) return fail(`${r.id} already has a pending reversal.`);
          amount = r.amount;
          entity = { type: 'receipt', id: r.id };
        } else if (!(amount > 0)) return fail('Enter an amount above zero.');
        const id = nextId(d.billingAdjustments, 'ADJ-2026-', 4);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        d.billingAdjustments.unshift({ id, kind: action.kind, billingAccountId: ba.id, invoiceId: action.invoiceId, receiptId: action.receiptId, amount, reason: action.reason.trim(), status: 'Pending', requestedById: actor.id, requestedAt: at, approvalId: apId, branchId: ba.branchId, zoneId: ba.zoneId });
        const ap: Approval = {
          id: apId, type: action.kind === 'Credit note' ? 'Credit Note' : 'Billing Adjustment', title: `${action.kind} ${id} — ${ba.name}`, detail: `${entity.type === 'billingAccount' ? '' : `${entity.id} · `}${action.reason.trim()}`, amount, entity,
          related: [{ type: 'billingAccount', id: ba.id }, ...(ba.customerId ? [{ type: 'customer' as const, id: ba.customerId }] : [])], requestedById: actor.id, requestedAt: at, requiredPermission: 'approveFinancial', status: 'Pending', adjustmentId: id, branchId: ba.branchId, zoneId: ba.zoneId
        };
        d.approvals.unshift(ap);
        audit(`${action.kind} requested`, `${id}: ${formatBDT(amount)} on ${entity.id} — ${action.reason.trim()}`, { type: 'approval', id: apId }, [entity]);
        notify({ title: `${action.kind} awaiting approval`, detail: `${ba.name} · ${formatBDT(amount)}`, branchId: ba.branchId, requires: ['approveFinancial'], entity: { type: 'approval', id: apId } });
        return ok(`${id} sent to the Finance Approver. Nothing changes until it is approved.`);
      }

    case 'BILL_REQUEST_DUE_ALLOW':{
        const r0 = roleOf(d, actor.id);
        if (!r0 || !(hasPermission(r0, 'recordCollection') || r0.id === 'accountManager')) return fail('Your role cannot request a due allow.');
        const ba = d.billingAccounts.find((b) => b.id === action.billingAccountId);
        if (!ba) return fail('Choose a billing account.');
        if (!(action.creditLimit > 0)) return fail('Enter a credit limit.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        if (!action.validFrom || !action.validUntil || !action.reviewAt) return fail('Set validity and review dates.');
        if (action.validUntil <= action.validFrom) return fail('Validity must end after it starts.');
        if (action.reviewAt > action.validUntil) return fail('Review date must fall on or before expiry.');
        if (d.dueAllows.some((x) => x.billingAccountId === ba.id && x.status === 'Pending')) return fail('This account already has a pending due allow request.');
        const id = nextId(d.dueAllows, 'DA-2026-', 4);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        d.dueAllows.unshift({ id, billingAccountId: ba.id, creditLimit: action.creditLimit, reason: action.reason.trim(), validFrom: action.validFrom, validUntil: action.validUntil, reviewAt: action.reviewAt, requestedById: actor.id, requestedAt: at, status: 'Pending', approvalId: apId, branchId: ba.branchId, zoneId: ba.zoneId });
        d.approvals.unshift({
          id: apId, type: 'Due Allow', title: `Due allow ${id} — ${ba.name}`, detail: `Limit ${formatBDT(action.creditLimit)} · until ${formatDhakaDate(action.validUntil)}`, amount: action.creditLimit, entity: { type: 'billingAccount', id: ba.id },
          related: ba.customerId ? [{ type: 'customer', id: ba.customerId }] : [], requestedById: actor.id, requestedAt: at, requiredPermission: 'approveFinancial', status: 'Pending', dueAllowId: id, branchId: ba.branchId, zoneId: ba.zoneId
        });
        audit('Due allow requested', `${id}: ${formatBDT(action.creditLimit)} for ${ba.name} until ${formatDhakaDate(action.validUntil)}`, { type: 'approval', id: apId }, [{ type: 'billingAccount', id: ba.id }]);
        notify({ title: 'Due allow awaiting approval', detail: `${ba.name} · ${formatBDT(action.creditLimit)}`, branchId: ba.branchId, requires: ['approveFinancial'], entity: { type: 'approval', id: apId } });
        return ok(`${id} sent to the Finance Approver.`);
      }

    case 'BILL_REVOKE_DUE_ALLOW':{
        if (!can(d, actor.id, 'approveFinancial') && !can(d, actor.id, 'recordCollection')) return fail('Only Finance or Accounts can revoke a due allow.');
        const da = d.dueAllows.find((x) => x.id === action.dueAllowId);
        if (!da || da.status !== 'Approved') return fail('Only approved due allows can be revoked.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        da.status = 'Revoked';
        da.revokedReason = action.reason.trim();
        audit('Due allow revoked', `${da.id} revoked — ${da.revokedReason}`, { type: 'billingAccount', id: da.billingAccountId });
        return ok(`${da.id} revoked.`);
      }

    case 'BILL_REFER_SUSPENSION':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can refer an account for suspension review.');
        const flag = suspensionFlags(d).find((f) => f.billingAccountId === action.billingAccountId);
        if (!flag) return fail('This account no longer meets the suspension review rule.');
        if (flag.coveredBy) return fail(`Covered by due allow ${flag.coveredBy.id} — no referral needed.`);
        if (flag.referral) return fail(`Already referred (${flag.referral.id}).`);
        const ba = d.billingAccounts.find((b) => b.id === action.billingAccountId)!;
        const conns = d.connections.filter((c) => c.billingAccountId === ba.id && c.status === 'Active').map((c) => c.id);
        const id = nextId(d.suspensionReviews, 'SR-2026-', 4);
        const reason = `${flag.term}: ${flag.daysPastDue} days past due (rule: more than ${flag.threshold})${action.note.trim() ? ` — ${action.note.trim()}` : ''}`;
        d.suspensionReviews.unshift({ id, billingAccountId: ba.id, connectionIds: conns, raisedAt: at, raisedById: actor.id, reason, status: 'Referred to Technical', branchId: ba.branchId, zoneId: ba.zoneId });
        audit('Referred for suspension review', `${id}: ${ba.name} (${conns.join(', ') || 'no active services'}) — ${reason}. No network action simulated.`, { type: 'billingAccount', id: ba.id }, conns.map((c): EntityRef => ({ type: 'connection', id: c })));
        // Technical receives service IDs only — no amounts.
        pushNotice(d, actor, at, { title: `Suspension review requested — ${ba.name}`, detail: `${conns.join(', ')} · confirm with Accounts before any network action`, module: 'installations', branchId: ba.branchId, requires: ['assignTickets'], entity: { type: 'billingAccount', id: ba.id } });
        if (ba.customerId) {
          const am = d.customers.find((c) => c.id === ba.customerId)?.accountManagerId;
          if (am) notify({ title: `Suspension review — ${ba.name}`, detail: `${id} · overdue beyond approved terms`, branchId: ba.branchId, entity: { type: 'billingAccount', id: ba.id }, forUserIds: [am] });
        }
        return ok(`${id} referred to Technical for review. The service has not been suspended — that decision and action happen outside this demo.`);
      }

    case 'BILL_WITHDRAW_SUSPENSION':{
        if (!can(d, actor.id, 'recordCollection')) return fail('Only Accounts can withdraw a referral.');
        const sr = d.suspensionReviews.find((s) => s.id === action.reviewId);
        if (!sr || sr.status !== 'Referred to Technical') return fail('This referral is already closed.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        sr.status = 'Withdrawn';
        sr.withdrawnAt = at;
        sr.withdrawnReason = action.reason.trim();
        audit('Suspension review withdrawn', `${sr.id} withdrawn — ${sr.withdrawnReason}`, { type: 'billingAccount', id: sr.billingAccountId });
        pushNotice(d, actor, at, { title: `Suspension review withdrawn — ${accountName(sr.billingAccountId)}`, detail: sr.withdrawnReason, module: 'installations', branchId: sr.branchId, requires: ['assignTickets'], entity: { type: 'billingAccount', id: sr.billingAccountId } });
        return ok(`${sr.id} withdrawn.`);
      }
  }
}

/**
 * Applies the effect of a decided billing approval (credit note, reversal, debit adjustment, due allow).
 * Returns an error message to abort the decision.
 */
export function afterBillingApproval(d: DemoDatabase, ap: Approval, approved: boolean, actor: Actor, at: string): string | undefined {
  if (ap.dueAllowId) {
    const da = d.dueAllows.find((x) => x.id === ap.dueAllowId);
    if (!da) return undefined;
    da.status = approved ? 'Approved' : 'Rejected';
    da.decidedById = actor.id;
    da.decidedAt = at;
    if (approved) pushAudit(d, actor, at, 'Due allow approved', `${da.id}: limit ${formatBDT(da.creditLimit)} until ${formatDhaka(da.validUntil, { year: true })}; review ${formatDhakaDate(da.reviewAt)}`, { type: 'billingAccount', id: da.billingAccountId });
    return undefined;
  }
  const adj = d.billingAdjustments.find((a) => a.id === ap.adjustmentId);
  if (!adj) return undefined;
  if (approved) {
    if (adj.kind === 'Credit note') {
      const inv = d.invoices.find((i) => i.id === adj.invoiceId);
      if (!inv) return 'Invoice not found.';
      if (adj.amount > invoiceOutstanding(inv)) return `${inv.id} now has only ${formatBDT(invoiceOutstanding(inv))} outstanding — reject and request a corrected credit note.`;
      inv.credits += adj.amount;
    } else if (adj.kind === 'Receipt reversal') {
      const r = d.receipts.find((x) => x.id === adj.receiptId);
      if (!r || r.status !== 'Verified') return 'Receipt is no longer verified.';
      r.allocations.forEach((a) => {
        const inv = d.invoices.find((i) => i.id === a.invoiceId);
        if (inv) inv.paidAmount = Math.max(0, inv.paidAmount - a.amount);
      });
      r.reversedAllocations = r.allocations;
      r.allocations = [];
      r.status = 'Reversed';
      r.reversedAt = at;
    } else {
      const ba = d.billingAccounts.find((b) => b.id === adj.billingAccountId)!;
      const pk = at.slice(0, 7);
      const inv = postDraft(
        d,
        {
          billingAccountId: ba.id, customerId: ba.customerId, associateId: ba.associateId, kind: 'Adjustment', periodKey: pk, connectionIds: [], subtotal: adj.amount, amount: adj.amount,
          lines: [{ id: 'x', kind: 'Adjustment', description: adj.reason, amount: adj.amount, calc: `Approved debit adjustment ${adj.id}` }],
          dueDate: new Date(new Date(at).getTime() + 7 * 86400000).toISOString(), billingTerm: ba.billingTerm ?? 'Postpaid', taxNote: 'Adjustment — no tax applied (illustrative)', notes: [], description: `Debit adjustment ${adj.id}`
        },
        at,
        actor.id
      );
      inv.periodKey = undefined;
      adj.resultInvoiceId = inv.id;
    }
  }
  adj.status = approved ? 'Approved' : 'Rejected';
  adj.decidedById = actor.id;
  adj.decidedAt = at;
  return undefined;
}