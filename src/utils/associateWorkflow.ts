import { roles } from '../data/roles';
import { dhakaDayAt, formatBDT, formatDhakaDate } from './format';
import { nextId } from './relations';
import {
  balances,
  calculate,
  canApproveSettlement,
  canDecideSuspension,
  canEditAssociate,
  canEditTerms,
  canPrepareSettlement,
  dueDateFor,
  openDisputes,
  periodLabel,
  shortfall,
  validateProfile,
  verifiedRemitted } from
'./associateRules';
import type { Approval, Associate, DemoDatabase, EntityRef } from '../types/records';
import type { AssociateSettlement, LedgerBucket, RuleKind, RuleMethod, SettlementRule } from '../types/associate';
import type { Actor, WorkflowResult } from './workflow';

export type AssociateAction =
{type: 'ASC_SAVE_PROFILE';associate: Associate;isNew: boolean;} |
{type: 'ASC_CREATE_SETTLEMENT';associateId: string;period: string;invoiced: number;collected: number;subscribers: number;declaration?: {amount: number;reference: string;};} |
{type: 'ASC_RECALCULATE';settlementId: string;} |
{type: 'ASC_REVIEW';settlementId: string;} |
{type: 'ASC_RETURN_TO_DRAFT';settlementId: string;reason: string;} |
{type: 'ASC_RECORD_PAYOUT';settlementId: string;reference: string;paidAt: string;} |
{type: 'ASC_RECORD_REMITTANCE';settlementId: string;amount: number;reference: string;at: string;} |
{type: 'ASC_VERIFY_REMITTANCE';settlementId: string;remittanceId: string;} |
{type: 'ASC_RAISE_DISPUTE';settlementId: string;amount: number;reason: string;} |
{type: 'ASC_RESOLVE_DISPUTE';settlementId: string;disputeId: string;resolution: string;} |
{type: 'ASC_RECONCILE';settlementId: string;} |
{type: 'ASC_LEDGER';associateId: string;kind: 'Advance received' | 'Advance applied' | 'Deposit received' | 'Deposit refunded';amount: number;description: string;settlementId?: string;} |
{type: 'ASC_ADD_RULE';associateId?: string;kind: RuleKind;label: string;method: RuleMethod;value: number;effectiveFrom: string;effectiveTo?: string;} |
{type: 'ASC_SET_CONTROLS';associateId: string;autoRecharge: boolean;networkRestricted: boolean;note: string;} |
{type: 'ASC_SUSPENSION';associateId: string;decision: 'Flag for review' | 'Clear' | 'Suspend';note: string;};

export function isAssociateAction(a: {type: string;}): a is AssociateAction {
  return a.type.startsWith('ASC_');
}

const MIN = 10;

/** Approval decision on a settlement (from the Approvals queue). */
export function afterAssociateApproval(d: DemoDatabase, ap: Approval, approved: boolean, actor: Actor, at: string): string | undefined {
  const s = d.associateSettlements.find((x) => x.id === ap.settlementId);
  if (!s || s.status !== 'Reviewed') return 'This settlement is not awaiting approval.';
  if (s.history.some((h) => h.detail.startsWith('Reviewed') && h.byId === actor.id)) return 'The reviewer cannot also approve the settlement.';
  if (!approved) {
    s.status = 'Draft';
    s.approvalId = undefined;
    s.history.push({ at, byId: actor.id, detail: 'Approval rejected — returned to Draft' });
    return undefined;
  }
  s.status = 'Approved';
  s.history.push({ at, byId: actor.id, detail: `Approved — ${s.payout ? `payout ${formatBDT(s.payout)}` : `receivable ${formatBDT(s.receivable)}`}. Figures are now locked.` });
  const entry = (bucket: LedgerBucket, amount: number, description: string) =>
  d.associateLedger.unshift({ id: nextId(d.associateLedger, 'AL-', 5), associateId: s.associateId, bucket, amount, at, description, settlementId: s.id, byId: actor.id });
  if (s.payout) entry('Collection', s.payout, `${periodLabel(s.period)} share payable to associate`);
  if (s.receivable) entry('Due', s.receivable, `${periodLabel(s.period)} ${s.model === 'Fixed Monthly' ? 'fixed monthly amount' : 'receivable'} due to IOL`);
  return undefined;
}

export function applyAssociateAction(db: DemoDatabase, action: AssociateAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const role = roles.find((r) => r.id === d.users.find((u) => u.id === actor.id)?.role);
  if (!role || !role.modules.includes('associates')) return fail('You do not have access to Associates.');
  const audit = (act: string, summary: string, entity: EntityRef) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related: [] });
  const ledger = (associateId: string, bucket: LedgerBucket, amount: number, description: string, settlementId?: string) =>
  d.associateLedger.unshift({ id: nextId(d.associateLedger, 'AL-', 5), associateId, bucket, amount, at, description, settlementId, byId: actor.id });

  if (action.type === 'ASC_SAVE_PROFILE') {
    if (!canEditAssociate(role)) return fail('Only Back Office or Accounts can edit associate profiles.');
    const existing = d.associates.find((x) => x.id === action.associate.id);
    const a: Associate = action.isNew ?
    { ...action.associate, id: nextId(d.associates, 'AS-', 3), since: at, clientIdPrefix: action.associate.clientIdPrefix?.trim().toUpperCase(), status: 'Active', controls: { autoRecharge: true, networkRestricted: false } } :
    { ...existing!, ...action.associate, clientIdPrefix: action.associate.clientIdPrefix?.trim().toUpperCase() };
    if (!action.isNew && !existing) return fail('Associate not found.');
    if (!canEditTerms(role) && existing) {
      // Without financial access the commercial terms stay as they were.
      Object.assign(a, { revenueSharePct: existing.revenueSharePct, fixedMonthly: existing.fixedMonthly, sharingBasis: existing.sharingBasis, creditLimit: existing.creditLimit, creditDays: existing.creditDays, depositRequired: existing.depositRequired, collectionModel: existing.collectionModel });
    }
    const errors = validateProfile(d, a, action.isNew);
    if (Object.keys(errors).length) return fail(Object.values(errors)[0]);
    if (existing && existing.collectionModel !== a.collectionModel && d.associateSettlements.some((s) => s.associateId === a.id && s.status !== 'Reconciled')) return fail('Settle and reconcile open settlements before changing the collection model.');
    a.terms = a.collectionModel === 'Fixed Monthly' ? `Fixed ${formatBDT(a.fixedMonthly ?? 0)} per month` : `${a.revenueSharePct}% of ${a.sharingBasis?.toLowerCase()} · ${a.collectionModel.toLowerCase()} collection`;
    if (action.isNew) d.associates.push(a);else
    Object.assign(existing!, a);
    audit(action.isNew ? 'Associate created' : 'Associate updated', `${a.id} ${a.name} — ${a.terms}${a.parentId ? ` · under ${a.parentId}` : ''}`, { type: 'associate', id: a.id });
    return ok(action.isNew ? `${a.name} added as ${a.id}.` : `${a.name} updated. Approved settlements keep their original figures.`);
  }

  if (action.type === 'ASC_ADD_RULE') {
    if (!canPrepareSettlement(role) && !canApproveSettlement(role)) return fail('Only Accounts or the Finance Approver can maintain settlement rules.');
    if (action.label.trim().length < 3) return fail('Name the rule.');
    if (!(action.value >= 0)) return fail('Enter a value.');
    if (action.method === 'Percent of revenue' && action.value > 100) return fail('A percentage cannot exceed 100.');
    if (!action.effectiveFrom) return fail('Enter the effective date.');
    if (action.effectiveTo && action.effectiveTo < action.effectiveFrom) return fail('The end date must be after the start date.');
    // An open-ended rule of the same kind and scope ends the day before the new one starts.
    const prior = d.settlementRules.filter((r) => r.kind === action.kind && (r.associateId ?? '') === (action.associateId ?? '') && !r.effectiveTo && r.effectiveFrom < action.effectiveFrom);
    prior.forEach((r) => r.effectiveTo = dhakaDayAt(action.effectiveFrom, -1, '23:59'));
    const rule: SettlementRule = { id: nextId(d.settlementRules, 'SR-', 3), associateId: action.associateId || undefined, kind: action.kind, label: action.label.trim(), method: action.method, value: action.value, effectiveFrom: action.effectiveFrom, effectiveTo: action.effectiveTo, createdById: actor.id, createdAt: at };
    d.settlementRules.push(rule);
    audit('Settlement rule added', `${rule.id} ${rule.kind} — ${rule.label} from ${formatDhakaDate(rule.effectiveFrom)}${prior.length ? `; ended ${prior.map((p) => p.id).join(', ')}` : ''}. Approved settlements are not recalculated.`, { type: 'associate', id: action.associateId ?? 'global' });
    return ok(`${rule.id} added. Only Draft settlements pick it up when recalculated.`);
  }

  if (action.type === 'ASC_LEDGER') {
    if (!canPrepareSettlement(role)) return fail('Only Accounts can record advances and deposits.');
    const a = d.associates.find((x) => x.id === action.associateId);
    if (!a) return fail('Associate not found.');
    if (!(action.amount > 0)) return fail('Enter an amount above zero.');
    if (action.description.trim().length < 4) return fail('Add a reference or description.');
    const b = balances(d, a.id);
    if (action.kind === 'Advance received') ledger(a.id, 'Advance', action.amount, action.description.trim());else
    if (action.kind === 'Deposit received') ledger(a.id, 'Security Deposit', action.amount, action.description.trim());else
    if (action.kind === 'Deposit refunded') {
      if (action.amount > b['Security Deposit']) return fail(`Only ${formatBDT(b['Security Deposit'])} deposit is held.`);
      ledger(a.id, 'Security Deposit', -action.amount, action.description.trim());
    } else {
      const s = d.associateSettlements.find((x) => x.id === action.settlementId);
      if (!s || s.associateId !== a.id || s.status !== 'Approved' || !s.receivable) return fail('Choose an approved receivable settlement.');
      if (action.amount > b.Advance) return fail(`Only ${formatBDT(b.Advance)} advance is available.`);
      if (action.amount > shortfall(s)) return fail(`Only ${formatBDT(shortfall(s))} is still unpaid on ${s.id}.`);
      ledger(a.id, 'Advance', -action.amount, `Applied to ${s.id}`, s.id);
      s.remittances.push({ id: `${s.id}-R${s.remittances.length + 1}`, amount: action.amount, at, reference: `Advance applied`, recordedById: actor.id, verified: true, verifiedById: actor.id, verifiedAt: at });
      ledger(a.id, 'Due', -action.amount, `Advance applied to ${s.id}`, s.id);
      s.history.push({ at, byId: actor.id, detail: `${formatBDT(action.amount)} advance applied` });
      if (verifiedRemitted(s) >= s.receivable) s.status = 'Paid/Remitted';
    }
    audit(action.kind, `${a.id}: ${formatBDT(action.amount)} — ${action.description.trim()}`, { type: 'associate', id: a.id });
    return ok(`${action.kind}: ${formatBDT(action.amount)}.`);
  }

  if (action.type === 'ASC_SET_CONTROLS' || action.type === 'ASC_SUSPENSION') {
    const a = d.associates.find((x) => x.id === action.associateId);
    if (!a) return fail('Associate not found.');
    if (action.note.trim().length < MIN) return fail(`Give a reason of at least ${MIN} characters.`);
    if (action.type === 'ASC_SET_CONTROLS') {
      if (!canPrepareSettlement(role) && !canDecideSuspension(role)) return fail('Only Accounts or approvers can change these controls.');
      a.controls = { autoRecharge: action.autoRecharge, networkRestricted: action.networkRestricted, changedAt: at, changedBy: actor.name, note: action.note.trim() };
      audit('Controls changed (simulated)', `${a.id}: auto recharge ${action.autoRecharge ? 'on' : 'off'}, network ${action.networkRestricted ? 'restricted' : 'unrestricted'} — ${action.note.trim()}. No network change made in the demo.`, { type: 'associate', id: a.id });
      return ok('Controls updated — simulated only; no network change was made.');
    }
    if (action.decision === 'Flag for review' && !canPrepareSettlement(role) && !canDecideSuspension(role)) return fail('Only Accounts or approvers can flag a review.');
    if (action.decision !== 'Flag for review' && !canDecideSuspension(role)) return fail('Only the Finance Approver, Management or Business Head can decide a suspension.');
    a.status = action.decision === 'Clear' ? 'Active' : action.decision === 'Suspend' ? 'Suspended' : 'Suspension Review';
    audit(`Suspension: ${action.decision}`, `${a.id}: ${action.note.trim()}`, { type: 'associate', id: a.id });
    return ok(`${a.name} is now ${a.status}.`);
  }

  if (action.type === 'ASC_CREATE_SETTLEMENT') {
    if (!canPrepareSettlement(role)) return fail('Only Accounts prepares settlements.');
    const a = d.associates.find((x) => x.id === action.associateId);
    if (!a) return fail('Associate not found.');
    if (!/^\d{4}-\d{2}$/.test(action.period)) return fail('Choose the settlement month.');
    if (d.associateSettlements.some((s) => s.associateId === a.id && s.period === action.period)) return fail(`${a.name} already has a settlement for ${periodLabel(action.period)}.`);
    if ([action.invoiced, action.collected, action.subscribers].some((n) => n < 0)) return fail('Figures cannot be negative.');
    if (a.collectionModel === 'Decentralised' && !action.declaration) return fail('Record the associate’s collection declaration.');
    if (a.collectionModel === 'Centralised' && action.collected <= 0 && a.sharingBasis === 'Collected revenue') return fail('Enter the subscriber collections IOL received.');
    const inputs = { invoiced: action.invoiced, collected: action.collected, subscribers: action.subscribers };
    const calc = calculate(d, a, action.period, inputs, action.declaration?.amount);
    const s: AssociateSettlement = {
      id: nextId(d.associateSettlements, 'ASM-2026-', 4), associateId: a.id, period: action.period, model: a.collectionModel, inputs,
      declaration: action.declaration ? { ...action.declaration, at } : undefined, ...calc, calculatedAt: at, status: 'Draft', dueDate: dueDateFor(a, action.period),
      remittances: [], disputes: [], history: [{ at, byId: actor.id, detail: `Draft created for ${periodLabel(action.period)}${action.declaration ? ` · declaration ${formatBDT(action.declaration.amount)} (not a remittance)` : ''}` }]
    };
    d.associateSettlements.unshift(s);
    audit('Settlement drafted', `${s.id} ${a.name} ${periodLabel(s.period)} — ${s.payout ? `payout ${formatBDT(s.payout)}` : `receivable ${formatBDT(s.receivable)}`}`, { type: 'associate', id: a.id });
    return ok(`${s.id} drafted.`);
  }

  const s = d.associateSettlements.find((x) => x.id === action.settlementId);
  if (!s) return fail('Settlement not found.');
  const a = d.associates.find((x) => x.id === s.associateId)!;
  const ref: EntityRef = { type: 'associate', id: a.id };
  const log = (detail: string) => s.history.push({ at, byId: actor.id, detail });

  switch (action.type) {
    case 'ASC_RECALCULATE':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts can recalculate.');
        if (s.status !== 'Draft') return fail('Only Draft settlements can be recalculated. Reviewed and approved figures are never changed silently.');
        const before = s.payout || s.receivable;
        Object.assign(s, calculate(d, a, s.period, s.inputs, s.declaration?.amount), { calculatedAt: at });
        log(`Recalculated with current rules: ${formatBDT(before)} → ${formatBDT(s.payout || s.receivable)}`);
        return ok(`${s.id} recalculated.`);
      }
    case 'ASC_REVIEW':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts can review settlements.');
        if (s.status !== 'Draft') return fail('Only Draft settlements can be reviewed.');
        s.status = 'Reviewed';
        log(`Reviewed by ${actor.name}`);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        d.approvals.unshift({
          id: apId, type: 'Associate Payout', title: `Associate settlement ${s.id} — ${a.name} (${periodLabel(s.period)})`,
          detail: s.payout ? `Payout ${formatBDT(s.payout)} · ${s.ratePct}% of ${s.basis?.toLowerCase()}` : `Receivable ${formatBDT(s.receivable)} · ${s.model}`,
          amount: s.payout || s.receivable, entity: ref, related: [], requestedById: actor.id, requestedAt: at, requiredPermission: 'approveFinancial', status: 'Pending', settlementId: s.id, branchId: a.branchId, zoneId: a.zoneId
        });
        s.approvalId = apId;
        d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), title: 'Associate settlement awaiting approval', detail: `${a.name} · ${periodLabel(s.period)}`, at, module: 'approvals', branchId: a.branchId, requires: ['approveFinancial'], entity: { type: 'approval', id: apId }, readBy: [actor.id] });
        audit('Settlement reviewed', `${s.id} sent for approval (${apId})`, ref);
        return ok(`${s.id} reviewed and sent to the Finance Approver.`);
      }
    case 'ASC_RETURN_TO_DRAFT':{
        if (!canPrepareSettlement(role) && !canApproveSettlement(role)) return fail('Not allowed.');
        if (s.status !== 'Reviewed') return fail('Only reviewed settlements can be returned to Draft.');
        if (action.reason.trim().length < MIN) return fail(`Give a reason of at least ${MIN} characters.`);
        const ap = d.approvals.find((x) => x.id === s.approvalId);
        if (ap && ap.status === 'Pending') ap.status = 'Withdrawn';
        s.status = 'Draft';
        s.approvalId = undefined;
        log(`Returned to Draft — ${action.reason.trim()}`);
        return ok(`${s.id} returned to Draft.`);
      }
    case 'ASC_RECORD_PAYOUT':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts records payouts.');
        if (s.status !== 'Approved' || !s.payout) return fail('Only approved payouts can be paid.');
        if (action.reference.trim().length < 4) return fail('Enter the bank or payment reference.');
        s.status = 'Paid/Remitted';
        s.paidAt = action.paidAt;
        s.paymentReference = action.reference.trim();
        ledger(a.id, 'Collection', -s.payout, `${periodLabel(s.period)} share paid · ${action.reference.trim()}`, s.id);
        a.lastPayout = { amount: s.payout, at: action.paidAt };
        log(`Paid ${formatBDT(s.payout)} · ${action.reference.trim()}`);
        audit('Associate payout paid', `${s.id} ${formatBDT(s.payout)} to ${a.name}`, ref);
        return ok(`${formatBDT(s.payout)} recorded as paid.`);
      }
    case 'ASC_RECORD_REMITTANCE':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts records remittances.');
        if (s.status !== 'Approved' || !s.receivable) return fail('Remittances are recorded against approved receivable settlements.');
        if (!(action.amount > 0)) return fail('Enter the amount.');
        if (action.reference.trim().length < 4) return fail('Enter the bank, bKash or deposit slip reference.');
        if (s.remittances.some((r) => r.reference.toLowerCase() === action.reference.trim().toLowerCase())) return fail('This reference is already recorded.');
        s.remittances.push({ id: `${s.id}-R${s.remittances.length + 1}`, amount: action.amount, at: action.at, reference: action.reference.trim(), recordedById: actor.id, verified: false });
        log(`Remittance ${formatBDT(action.amount)} recorded (${action.reference.trim()}) — awaiting verification`);
        return ok('Remittance recorded. It counts only after verification against the bank statement.');
      }
    case 'ASC_VERIFY_REMITTANCE':{
        if (!canPrepareSettlement(role) && !canApproveSettlement(role)) return fail('Only Accounts or the Finance Approver verifies remittances.');
        const r = s.remittances.find((x) => x.id === action.remittanceId);
        if (!r || r.verified) return fail('Already verified.');
        if (r.recordedById === actor.id) return fail('The person who recorded a remittance cannot verify it.');
        r.verified = true;
        r.verifiedById = actor.id;
        r.verifiedAt = at;
        ledger(a.id, 'Due', -r.amount, `Verified remittance ${r.reference}`, s.id);
        log(`Remittance ${r.reference} verified`);
        if (verifiedRemitted(s) >= s.receivable) {
          s.status = 'Paid/Remitted';
          s.paidAt = at;
          log('Fully remitted');
        }
        audit('Remittance verified', `${s.id} ${formatBDT(r.amount)} · ${r.reference}`, ref);
        return ok(`${formatBDT(r.amount)} verified.${s.status === 'Paid/Remitted' ? ' Settlement fully remitted.' : ` Shortfall ${formatBDT(shortfall(s))}.`}`);
      }
    case 'ASC_RAISE_DISPUTE':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts records disputes.');
        if (!['Approved', 'Paid/Remitted'].includes(s.status)) return fail('Disputes are recorded on approved settlements.');
        if (!(action.amount > 0) || action.amount > (s.payout || s.receivable)) return fail('Enter a disputed amount within the settlement value.');
        if (action.reason.trim().length < 20) return fail('Describe the dispute (at least 20 characters).');
        s.disputes.push({ id: `${s.id}-D${s.disputes.length + 1}`, amount: action.amount, reason: action.reason.trim(), raisedAt: at, raisedById: actor.id, status: 'Open' });
        log(`Dispute raised for ${formatBDT(action.amount)}`);
        audit('Settlement dispute raised', `${s.id} ${formatBDT(action.amount)} — ${action.reason.trim()}`, ref);
        return ok('Dispute recorded. It is tracked separately from the shortfall.');
      }
    case 'ASC_RESOLVE_DISPUTE':{
        if (!canPrepareSettlement(role) && !canApproveSettlement(role)) return fail('Not allowed.');
        const dp = s.disputes.find((x) => x.id === action.disputeId);
        if (!dp || dp.status !== 'Open') return fail('Dispute already resolved.');
        if (action.resolution.trim().length < MIN) return fail(`Describe the resolution (at least ${MIN} characters).`);
        Object.assign(dp, { status: 'Resolved', resolution: action.resolution.trim(), resolvedAt: at });
        log(`Dispute ${dp.id} resolved — ${action.resolution.trim()}`);
        return ok('Dispute resolved. Any agreed correction goes into a future settlement; approved figures stay as approved.');
      }
    case 'ASC_RECONCILE':{
        if (!canPrepareSettlement(role)) return fail('Only Accounts reconciles settlements.');
        if (s.status !== 'Paid/Remitted') return fail('Only paid or remitted settlements can be reconciled.');
        if (openDisputes(s).length) return fail('Resolve open disputes first.');
        if (s.remittances.some((r) => !r.verified)) return fail('Verify or remove unverified remittances first.');
        s.status = 'Reconciled';
        log('Reconciled against the bank statement');
        audit('Settlement reconciled', `${s.id} ${a.name} ${periodLabel(s.period)}`, ref);
        return ok(`${s.id} reconciled.`);
      }
  }
  return fail('Unknown action.');
}