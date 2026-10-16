import { roles } from '../data/roles';
import { demoNow, formatBDT, formatDhakaDate } from './format';
import { nextId } from './relations';
import {
  MIN_REASON,
  addMonths,
  canConfirmEvent,
  canDecideRates,
  canEditAgent,
  canPay,
  canPrepare,
  canRunAccruals,
  canSeePayment,
  currentAttribution,
  effectiveMrcPct,
  effectiveOtcPct,
  financialEffect,
  maskAccount,
  monthsBetween,
  periodLabel,
  periodOf,
  rateSummary,
  usesMrc,
  usesOtc } from
'./agentRules';
import type { Approval, DemoDatabase, EntityRef, SalesAgent } from '../types/records';
import type { AgentPaymentDetails, CancellationTreatment, CommissionAccrual, CommissionArrangement, CommissionBasis, CommissionProposal, QualifyingEvent } from '../types/agent';
import type { Actor, WorkflowResult } from './workflow';

export interface ProposalInput {
  selfSale: boolean;
  agentId?: string;
  customerId: string;
  salespersonId: string;
  quotationId?: string;
  workOrderId?: string;
  connectionId?: string;
  basis: CommissionBasis;
  arrangement: CommissionArrangement;
  months: number;
  mrc: number;
  otc: number;
  mrcPct: number;
  otcPct: number;
  qualifyingEvent: QualifyingEvent;
  cancellationTreatment: CancellationTreatment;
  clawbackMonths: number;
  validFrom: string;
  validTo: string;
}

export type AgentAction =
{type: 'AGT_SAVE_AGENT';agent: SalesAgent;isNew: boolean;} |
{type: 'AGT_SET_PAYMENT';agentId: string;payment: AgentPaymentDetails;} |
{type: 'AGT_ADD_ATTRIBUTION';agentId: string;customerId: string;salespersonId: string;effectiveFrom: string;note: string;} |
{type: 'AGT_REQUEST_REASSIGNMENT';attributionId: string;toAgentId: string;toSalespersonId: string;effectiveDate: string;reason: string;} |
{type: 'AGT_DECIDE_REASSIGNMENT';reassignmentId: string;approve: boolean;note: string;} |
{type: 'AGT_SUBMIT_PROPOSAL';input: ProposalInput;} |
{type: 'AGT_DECIDE_PROPOSAL';proposalId: string;decision: 'Approve' | 'Revise' | 'Reject';mrcPct: number;otcPct: number;reason: string;} |
{type: 'AGT_LINK_WORK_ORDER';proposalId: string;workOrderId: string;} |
{type: 'AGT_CONFIRM_EVENT';proposalId: string;at: string;evidence: string;} |
{type: 'AGT_RUN_ACCRUALS';period: string;} |
{type: 'AGT_RECORD_CANCELLATION';proposalId: string;at: string;kind: 'Cancellation' | 'Refund';note: string;} |
{type: 'AGT_CREATE_SETTLEMENT';agentId: string;} |
{type: 'AGT_RECORD_PAYMENT';settlementId: string;reference: string;paidAt: string;};

export function isAgentAction(a: {type: string;}): a is AgentAction {
  return a.type.startsWith('AGT_');
}

const ms = (iso: string) => new Date(iso).getTime();

type Ctx = {d: DemoDatabase;actor: Actor;at: string;};

function audit(ctx: Ctx, action: string, summary: string, entity: EntityRef, related: EntityRef[] = []) {
  ctx.d.auditEvents.unshift({ id: nextId(ctx.d.auditEvents, 'AE-', 5), at: ctx.at, actorName: ctx.actor.name, actorId: ctx.actor.id, action, summary, entity, related });
}

function lockWorkOrder(ctx: Ctx, p: CommissionProposal): string | undefined {
  if (!p.workOrderId) return undefined;
  const wo = ctx.d.workOrders.find((w) => w.id === p.workOrderId);
  if (!wo) return 'Work order not found.';
  if (wo.customerId !== p.customerId) return `${wo.id} belongs to a different customer.`;
  if (wo.commissionLock && wo.commissionLock.proposalId !== p.id) return `${wo.id} already has commission locked from ${wo.commissionLock.proposalId}.`;
  wo.commissionLock = {
    proposalId: p.id, agentId: p.agentId, selfSale: p.selfSale, basis: p.basis, arrangement: p.arrangement, months: p.months,
    mrcPct: p.selfSale ? 0 : effectiveMrcPct(p), otcPct: p.selfSale ? 0 : effectiveOtcPct(p), lockedAt: ctx.at, lockedById: ctx.actor.id
  };
  p.history.push({ at: ctx.at, byId: ctx.actor.id, detail: `${p.selfSale ? 'Self-Sale (no commission)' : rateSummary(p)} locked into ${wo.id}` });
  return undefined;
}

function approveProposal(ctx: Ctx, p: CommissionProposal, mrcPct: number, otcPct: number, note: string): string | undefined {
  p.approvedMrcPct = mrcPct;
  p.approvedOtcPct = otcPct;
  p.status = 'Approved';
  p.decidedById = ctx.actor.id;
  p.decidedAt = ctx.at;
  p.decisionNote = note || undefined;
  p.history.push({ at: ctx.at, byId: ctx.actor.id, detail: `Approved — ${rateSummary(p)}${p.revisions.length ? ' (revised)' : ''}` });
  return lockWorkOrder(ctx, p);
}

/** Decisions taken from the shared approvals inbox (approve at proposed rates, or reject). */
export function afterAgentApproval(d: DemoDatabase, ap: Approval, approved: boolean, actor: Actor, at: string): string | undefined {
  const ctx: Ctx = { d, actor, at };
  if (ap.commissionProposalId) {
    const p = d.commissionProposals.find((x) => x.id === ap.commissionProposalId);
    if (!p || p.status !== 'Pending Approval') return 'This proposal is not awaiting a decision.';
    if (p.preparedById === actor.id) return 'The preparer cannot decide their own proposal.';
    if (!approved) {
      p.status = 'Rejected';
      p.decidedById = actor.id;
      p.decidedAt = at;
      p.history.push({ at, byId: actor.id, detail: 'Rejected' });
      return undefined;
    }
    return approveProposal(ctx, p, p.proposedMrcPct, p.proposedOtcPct, '');
  }
  if (ap.reassignmentId) return decideReassignment(ctx, ap.reassignmentId, approved, approved ? 'Approved from approvals inbox' : 'Rejected from approvals inbox');
  if (ap.agentSettlementId) {
    const s = d.agentSettlements.find((x) => x.id === ap.agentSettlementId);
    if (!s || s.status !== 'Pending Approval') return 'This settlement is not awaiting approval.';
    if (s.preparedById === actor.id) return 'The preparer cannot approve the settlement.';
    s.status = approved ? 'Approved' : 'Rejected';
    s.decidedById = actor.id;
    s.decidedAt = at;
    d.commissionAccruals.
    filter((a) => s.accrualIds.includes(a.id)).
    forEach((a) => {
      if (approved) a.status = 'Approved';else
      {
        a.status = 'Accrued';
        a.settlementId = undefined;
      }
    });
  }
  return undefined;
}

function decideReassignment(ctx: Ctx, id: string, approve: boolean, note: string): string | undefined {
  const { d, actor, at } = ctx;
  const r = d.attributionReassignments.find((x) => x.id === id);
  if (!r || r.status !== 'Pending Approval') return 'This reassignment is not awaiting a decision.';
  if (r.requestedById === actor.id) return 'The requester cannot decide their own reassignment.';
  r.status = approve ? 'Approved' : 'Rejected';
  r.decidedById = actor.id;
  r.decidedAt = at;
  r.decisionNote = note;
  if (!approve) return undefined;
  const old = d.agentAttributions.find((a) => a.id === r.attributionId);
  if (!old || old.effectiveTo) return 'The original attribution has already changed. Raise a new request.';
  const day = new Date(ms(r.effectiveDate) - 60000).toISOString();
  const newId = nextId(d.agentAttributions, 'AT-', 4);
  old.effectiveTo = day;
  old.supersededById = newId;
  d.agentAttributions.push({ id: newId, agentId: r.toAgentId, customerId: r.customerId, salespersonId: r.toSalespersonId, effectiveFrom: r.effectiveDate, createdById: actor.id, createdAt: at, reassignmentId: r.id, note: r.reason });
  return undefined;
}

export function applyAgentAction(db: DemoDatabase, action: AgentAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ctx: Ctx = { d, actor, at };
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const role = roles.find((r) => r.id === d.users.find((u) => u.id === actor.id)?.role);
  if (!role || !role.modules.includes('agents')) return fail('You do not have access to Sales Agents.');
  const agentName = (id?: string) => d.salesAgents.find((a) => a.id === id)?.name ?? 'Self-Sale';
  const customerName = (id: string) => d.customers.find((c) => c.id === id)?.name ?? id;
  const userName = (id: string) => d.users.find((u) => u.id === id)?.name ?? id;
  const notifyApprover = (title: string, detail: string, entity: EntityRef, branchId: SalesAgent['branchId']) =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), title, detail, at, module: 'agents', branchId, requires: ['approveAgentCommission'], entity, readBy: [actor.id] });

  switch (action.type) {
    case 'AGT_SAVE_AGENT':{
        if (!canEditAgent(role)) return fail('Only Back Office or the Business Head can edit agent profiles.');
        const a = action.agent;
        if (a.name.trim().length < 3) return fail('Enter the agent’s name.');
        if (!/^\+?880\s?1\d{3}-?\d{6}$/.test(a.phone.trim())) return fail('Enter a Bangladesh mobile number, e.g. +880 1712-345678.');
        if (!a.territory?.trim()) return fail('Enter the territory.');
        if (!a.agreementStart || !a.agreementEnd || ms(a.agreementEnd) <= ms(a.agreementStart)) return fail('Agreement end must be after the start.');
        const dupe = d.salesAgents.find((x) => x.id !== a.id && x.phone.replace(/\D/g, '') === a.phone.replace(/\D/g, ''));
        if (dupe) return fail(`${dupe.name} (${dupe.id}) already uses this phone number.`);
        if ([a.standardMrcPct ?? 0, a.standardOtcPct ?? 0].some((n) => n < 0 || n > 100)) return fail('Standard rates must be 0–100%.');
        if (action.isNew) {
          const id = nextId(d.salesAgents, 'SA-', 3);
          d.salesAgents.push({ ...a, id, activations: 0, commissionApprovedYtd: 0, createdAt: at, commissionRule: 'Per approved proposal' });
          audit(ctx, 'Sales agent created', `${id} ${a.name}`, { type: 'salesAgent', id });
          return ok(`${a.name} added as ${id}.`);
        }
        const ex = d.salesAgents.find((x) => x.id === a.id);
        if (!ex) return fail('Agent not found.');
        Object.assign(ex, { ...a, payment: ex.payment, commissionApprovedYtd: ex.commissionApprovedYtd, activations: ex.activations });
        audit(ctx, 'Sales agent updated', `${ex.id} ${ex.name} — agreement ${formatDhakaDate(a.agreementStart)}–${formatDhakaDate(a.agreementEnd)}. Approved proposals keep their rates.`, { type: 'salesAgent', id: ex.id });
        return ok(`${ex.name} updated. Approved proposals keep their locked rates.`);
      }

    case 'AGT_SET_PAYMENT':{
        if (!canSeePayment(role) || !canPay(role)) return fail('Only Accounts can change agent payment details.');
        const a = d.salesAgents.find((x) => x.id === action.agentId);
        if (!a) return fail('Agent not found.');
        const p = action.payment;
        if (p.accountName.trim().length < 3) return fail('Enter the account holder’s name.');
        if (p.method === 'Bank transfer' && (!p.bankName?.trim() || !/^\d{9,17}$/.test(p.accountNumber.replace(/\s/g, '')))) return fail('Enter the bank name and a 9–17 digit account number.');
        if (p.method !== 'Bank transfer' && !/^01\d{9}$/.test(p.accountNumber.replace(/\D/g, ''))) return fail('Enter an 11-digit mobile wallet number starting 01.');
        a.payment = { ...p, accountName: p.accountName.trim(), accountNumber: p.accountNumber.replace(/\s/g, ''), updatedAt: at, updatedById: actor.id };
        audit(ctx, 'Agent payment details changed', `${a.id}: ${p.method} ${maskAccount(a.payment.accountNumber)}`, { type: 'salesAgent', id: a.id });
        return ok('Payment details updated. Shown only to Accounts and the Finance Approver.');
      }

    case 'AGT_ADD_ATTRIBUTION':{
        if (!canPrepare(role)) return fail('Only Back Office or the Business Head records attributions.');
        const a = d.salesAgents.find((x) => x.id === action.agentId);
        const c = d.customers.find((x) => x.id === action.customerId);
        if (!a || !c) return fail('Choose an agent and a customer.');
        if (a.status !== 'Active') return fail(`${a.name} is suspended.`);
        if (!d.users.some((u) => u.id === action.salespersonId && u.status === 'Active')) return fail('Choose an active salesperson.');
        const cur = currentAttribution(d, c.id);
        if (cur) {
          if (cur.agentId === a.id && cur.salespersonId === action.salespersonId) return fail(`${c.name} is already attributed to ${a.name} with ${userName(cur.salespersonId)}.`);
          return fail(`${c.name} is attributed to ${agentName(cur.agentId)} with ${userName(cur.salespersonId)}. A different salesperson or agent needs a reassignment approved by the Business Head.`);
        }
        const id = nextId(d.agentAttributions, 'AT-', 4);
        d.agentAttributions.push({ id, agentId: a.id, customerId: c.id, salespersonId: action.salespersonId, effectiveFrom: action.effectiveFrom, createdById: actor.id, createdAt: at, note: action.note.trim() || undefined });
        audit(ctx, 'Agent attribution recorded', `${c.name}: ${a.name} with ${userName(action.salespersonId)} from ${formatDhakaDate(action.effectiveFrom)}`, { type: 'salesAgent', id: a.id }, [{ type: 'customer', id: c.id }]);
        return ok(`${c.name} attributed to ${a.name} with ${userName(action.salespersonId)}.`);
      }

    case 'AGT_REQUEST_REASSIGNMENT':{
        if (!canPrepare(role)) return fail('Only Back Office or the Business Head can request a reassignment.');
        const cur = d.agentAttributions.find((x) => x.id === action.attributionId);
        if (!cur || cur.effectiveTo) return fail('Only the current attribution can be reassigned.');
        if (cur.agentId === action.toAgentId && cur.salespersonId === action.toSalespersonId) return fail('Choose a different agent or salesperson.');
        if (d.attributionReassignments.some((r) => r.attributionId === cur.id && r.status === 'Pending Approval')) return fail('A reassignment for this customer is already awaiting approval.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        if (!action.effectiveDate || ms(action.effectiveDate) <= ms(cur.effectiveFrom)) return fail('The effective date must be after the current attribution started.');
        const to = d.salesAgents.find((x) => x.id === action.toAgentId);
        if (!to || to.status !== 'Active') return fail('Choose an active agent.');
        const id = nextId(d.attributionReassignments, 'RA-2026-', 4);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        const c = d.customers.find((x) => x.id === cur.customerId)!;
        d.attributionReassignments.unshift({
          id, attributionId: cur.id, customerId: cur.customerId, fromAgentId: cur.agentId, fromSalespersonId: cur.salespersonId, toAgentId: to.id, toSalespersonId: action.toSalespersonId,
          effectiveDate: action.effectiveDate, reason: action.reason.trim(), requestedById: actor.id, requestedAt: at, status: 'Pending Approval', approvalId: apId
        });
        d.approvals.unshift({
          id: apId, type: 'Agent Reassignment', title: `Attribution reassignment ${id} — ${c.name}`,
          detail: `${agentName(cur.agentId)} / ${userName(cur.salespersonId)} → ${to.name} / ${userName(action.toSalespersonId)} from ${formatDhakaDate(action.effectiveDate)} · ${action.reason.trim()}`,
          amount: 0, entity: { type: 'salesAgent', id: to.id }, related: [{ type: 'customer', id: c.id }, { type: 'salesAgent', id: cur.agentId }], requestedById: actor.id, requestedAt: at,
          requiredPermission: 'approveAgentCommission', status: 'Pending', reassignmentId: id, branchId: c.branchId, zoneId: c.zoneId
        });
        notifyApprover('Attribution reassignment awaiting approval', `${c.name} · ${id}`, { type: 'approval', id: apId }, c.branchId);
        audit(ctx, 'Reassignment requested', `${id} ${c.name}: ${agentName(cur.agentId)}/${userName(cur.salespersonId)} → ${to.name}/${userName(action.toSalespersonId)}`, { type: 'salesAgent', id: cur.agentId }, [{ type: 'customer', id: c.id }]);
        return ok(`${id} sent to the Business Head. The current attribution stays in force until approved.`);
      }

    case 'AGT_DECIDE_REASSIGNMENT':{
        if (!canDecideRates(role)) return fail('Only the Business Head (Sales Head) can decide reassignments.');
        const r = d.attributionReassignments.find((x) => x.id === action.reassignmentId);
        if (!r) return fail('Reassignment not found.');
        if (!action.approve && action.note.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
        const err = decideReassignment(ctx, r.id, action.approve, action.note.trim());
        if (err) return fail(err);
        const ap = d.approvals.find((x) => x.id === r.approvalId);
        if (ap) Object.assign(ap, { status: action.approve ? 'Approved' : 'Rejected', decidedById: actor.id, decidedAt: at });
        audit(ctx, `Reassignment ${action.approve ? 'approved' : 'rejected'}`, `${r.id} ${customerName(r.customerId)}${action.note.trim() ? ` — ${action.note.trim()}` : ''}`, { type: 'salesAgent', id: r.toAgentId }, [{ type: 'customer', id: r.customerId }]);
        return ok(action.approve ? `Reassigned from ${formatDhakaDate(r.effectiveDate)}. Earlier attribution kept in history.` : 'Reassignment rejected.');
      }

    case 'AGT_SUBMIT_PROPOSAL':{
        if (!canPrepare(role)) return fail('Only Back Office or the Business Head prepares commission proposals.');
        const i = action.input;
        const c = d.customers.find((x) => x.id === i.customerId);
        if (!c) return fail('Choose a customer.');
        if (!d.users.some((u) => u.id === i.salespersonId && u.status === 'Active')) return fail('Choose the salesperson.');
        if (!i.validFrom || !i.validTo || ms(i.validTo) <= ms(i.validFrom)) return fail('Validity must end after it starts.');
        if (d.commissionProposals.some((p) => p.customerId === c.id && p.status === 'Pending Approval')) return fail(`${c.name} already has a proposal awaiting a decision.`);
        const cur = currentAttribution(d, c.id);
        if (i.workOrderId) {
          const wo = d.workOrders.find((w) => w.id === i.workOrderId);
          if (!wo || wo.customerId !== c.id) return fail('That work order belongs to a different customer.');
          if (wo.commissionLock) return fail(`${wo.id} already has commission locked from ${wo.commissionLock.proposalId}.`);
        }
        const base = {
          customerId: c.id, salespersonId: i.salespersonId, quotationId: i.quotationId || undefined, workOrderId: i.workOrderId || undefined, connectionId: i.connectionId || undefined,
          validFrom: i.validFrom, validTo: i.validTo, preparedById: actor.id, preparedAt: at, revisions: [], qualifyingEvent: i.qualifyingEvent
        };
        const id = nextId(d.commissionProposals, 'CP-2026-', 4);
        if (i.selfSale) {
          if (cur) return fail(`${c.name} is attributed to ${agentName(cur.agentId)}. Request a reassignment before recording a Self-Sale.`);
          const p: CommissionProposal = {
            ...base, id, selfSale: true, basis: 'MRC', arrangement: 'One-time', months: 1, mrc: i.mrc, otc: i.otc, proposedMrcPct: 0, proposedOtcPct: 0, approvedMrcPct: 0, approvedOtcPct: 0,
            cancellationTreatment: 'Reverse unpaid accruals only', clawbackMonths: 0, status: 'Self-Sale', history: [{ at, byId: actor.id, detail: `Self-Sale recorded by ${actor.name} — no agent commission` }]
          };
          d.commissionProposals.unshift(p);
          const err = lockWorkOrder(ctx, p);
          if (err) return fail(err);
          audit(ctx, 'Self-Sale recorded', `${id} ${c.name} — salesperson ${userName(i.salespersonId)}, no agent commission`, { type: 'customer', id: c.id });
          return ok(`${id} recorded as Self-Sale. No agent commission will accrue.`);
        }
        const a = d.salesAgents.find((x) => x.id === i.agentId);
        if (!a) return fail('Choose the agent, or record a Self-Sale.');
        if (a.status !== 'Active') return fail(`${a.name} is suspended.`);
        if (a.agreementStart && a.agreementEnd && (ms(i.validFrom) < ms(a.agreementStart) || ms(i.validTo) > ms(a.agreementEnd))) return fail(`Validity must sit inside ${a.name}’s agreement (${formatDhakaDate(a.agreementStart)} – ${formatDhakaDate(a.agreementEnd)}).`);
        if (cur && (cur.agentId !== a.id || cur.salespersonId !== i.salespersonId))
        return fail(`${c.name} is attributed to ${agentName(cur.agentId)} with ${userName(cur.salespersonId)}. A different agent or salesperson needs a Business Head-approved reassignment first.`);
        if (usesMrc(i.basis) && !(i.mrc > 0)) return fail('Enter the MRC the commission is calculated on.');
        if (usesOtc(i.basis) && !(i.otc > 0)) return fail('Enter the OTC the commission is calculated on.');
        if ([i.mrcPct, i.otcPct].some((n) => n < 0 || n > 100)) return fail('Rates must be 0–100%.');
        if (usesMrc(i.basis) && !(i.mrcPct > 0) || usesOtc(i.basis) && !(i.otcPct > 0)) return fail('Enter a proposed rate for each part of the basis.');
        if (i.arrangement === 'Recurring' && (!(i.months >= 2) || i.months > 60)) return fail('Recurring duration must be 2–60 months.');
        if (i.clawbackMonths < 0 || i.clawbackMonths > 24) return fail('Clawback window must be 0–24 months.');
        let attributionId = cur?.id;
        if (!cur) {
          attributionId = nextId(d.agentAttributions, 'AT-', 4);
          d.agentAttributions.push({ id: attributionId, agentId: a.id, customerId: c.id, salespersonId: i.salespersonId, effectiveFrom: at, createdById: actor.id, createdAt: at, note: `Recorded with ${id}` });
        }
        const p: CommissionProposal = {
          ...base, id, agentId: a.id, selfSale: false, attributionId, basis: i.basis, arrangement: i.arrangement, months: i.arrangement === 'Recurring' ? i.months : 1,
          mrc: usesMrc(i.basis) ? i.mrc : 0, otc: usesOtc(i.basis) ? i.otc : 0, proposedMrcPct: usesMrc(i.basis) ? i.mrcPct : 0, proposedOtcPct: usesOtc(i.basis) ? i.otcPct : 0,
          cancellationTreatment: i.cancellationTreatment, clawbackMonths: i.cancellationTreatment.startsWith('Reverse unpaid and') ? i.clawbackMonths : 0,
          status: 'Pending Approval', history: [{ at, byId: actor.id, detail: `Submitted by ${actor.name}` }]
        };
        const fx = financialEffect(p, p.proposedMrcPct, p.proposedOtcPct);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        p.approvalId = apId;
        d.commissionProposals.unshift(p);
        d.approvals.unshift({
          id: apId, type: 'Agent Commission Terms', title: `Commission proposal ${id} — ${a.name} · ${c.name}`, detail: `${rateSummary(p, false)} · ${p.qualifyingEvent} · total ${formatBDT(fx.total)}`,
          amount: fx.total, entity: { type: 'salesAgent', id: a.id }, related: [{ type: 'customer', id: c.id }, ...(p.workOrderId ? [{ type: 'workOrder' as const, id: p.workOrderId }] : [])],
          requestedById: actor.id, requestedAt: at, requiredPermission: 'approveAgentCommission', status: 'Pending', commissionProposalId: id, branchId: c.branchId, zoneId: c.zoneId
        });
        notifyApprover('Commission proposal awaiting approval', `${a.name} · ${c.name}`, { type: 'approval', id: apId }, c.branchId);
        audit(ctx, 'Commission proposal submitted', `${id} ${a.name} / ${c.name}: ${rateSummary(p, false)}`, { type: 'salesAgent', id: a.id }, [{ type: 'customer', id: c.id }]);
        return ok(`${id} sent to the Business Head (Sales Head).`);
      }

    case 'AGT_DECIDE_PROPOSAL':{
        if (!canDecideRates(role)) return fail('Only the Business Head (Sales Head) can approve, revise or reject commission rates.');
        const p = d.commissionProposals.find((x) => x.id === action.proposalId);
        if (!p || p.status !== 'Pending Approval') return fail('This proposal is not awaiting a decision.');
        if (p.preparedById === actor.id) return fail('You prepared this proposal, so you cannot decide it.');
        const reason = action.reason.trim();
        const ap = d.approvals.find((x) => x.id === p.approvalId);
        if (action.decision === 'Reject') {
          if (reason.length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
          Object.assign(p, { status: 'Rejected', decidedById: actor.id, decidedAt: at, decisionNote: reason });
          p.history.push({ at, byId: actor.id, detail: `Rejected — ${reason}` });
          if (ap) Object.assign(ap, { status: 'Rejected', decidedById: actor.id, decidedAt: at });
          audit(ctx, 'Commission proposal rejected', `${p.id} — ${reason}`, { type: 'salesAgent', id: p.agentId! });
          return ok(`${p.id} rejected.`);
        }
        const m = usesMrc(p.basis) ? action.mrcPct : 0;
        const o = usesOtc(p.basis) ? action.otcPct : 0;
        if ([m, o].some((n) => !(n >= 0) || n > 100)) return fail('Rates must be 0–100%.');
        const changed = m !== p.proposedMrcPct || o !== p.proposedOtcPct;
        if (action.decision === 'Revise') {
          if (!changed) return fail('Change at least one rate to revise, or approve as proposed.');
          if (reason.length < MIN_REASON) return fail(`Every rate change needs a reason of at least ${MIN_REASON} characters.`);
          if (m !== p.proposedMrcPct) p.revisions.push({ field: 'MRC %', from: p.proposedMrcPct, to: m, reason, byId: actor.id, at });
          if (o !== p.proposedOtcPct) p.revisions.push({ field: 'OTC %', from: p.proposedOtcPct, to: o, reason, byId: actor.id, at });
        } else if (changed) return fail('Rates were changed — use Revise and give a reason.');
        const err = approveProposal(ctx, p, m, o, reason);
        if (err) return fail(err);
        if (ap) Object.assign(ap, { status: 'Approved', decidedById: actor.id, decidedAt: at, amount: financialEffect(p, m, o).total });
        audit(ctx, action.decision === 'Revise' ? 'Commission rate revised and approved' : 'Commission proposal approved', `${p.id}: ${rateSummary(p)}${changed ? ` — ${reason}` : ''}`, { type: 'salesAgent', id: p.agentId! });
        return ok(`${p.id} ${action.decision === 'Revise' ? 'revised and approved' : 'approved'}${p.workOrderId ? ` and locked into ${p.workOrderId}` : ''}.`);
      }

    case 'AGT_LINK_WORK_ORDER':{
        if (!canPrepare(role)) return fail('Only Back Office or the Business Head can link work orders.');
        const p = d.commissionProposals.find((x) => x.id === action.proposalId);
        if (!p || !['Approved', 'Self-Sale'].includes(p.status)) return fail('Only approved proposals or Self-Sales can be locked into a work order.');
        if (p.workOrderId) return fail(`Already locked into ${p.workOrderId}.`);
        p.workOrderId = action.workOrderId;
        const err = lockWorkOrder(ctx, p);
        if (err) return fail(err);
        audit(ctx, 'Commission locked into work order', `${p.id} → ${action.workOrderId}`, { type: 'workOrder', id: action.workOrderId });
        return ok(`Locked into ${action.workOrderId}. The rate can no longer change on this order.`);
      }

    case 'AGT_CONFIRM_EVENT':{
        if (!canConfirmEvent(role)) return fail('Only Back Office or Accounts can confirm qualifying events.');
        const p = d.commissionProposals.find((x) => x.id === action.proposalId);
        if (!p || p.status !== 'Approved' || p.selfSale) return fail('Only approved agent proposals accrue commission.');
        if (p.event) return fail('The qualifying event is already confirmed.');
        if (action.evidence.trim().length < 6) return fail('Add the evidence reference (e.g. activation record, invoice or receipt number).');
        if (ms(action.at) > demoNow().getTime()) return fail('The event cannot be in the future.');
        if (ms(action.at) < ms(p.validFrom) || ms(action.at) > ms(p.validTo)) return fail(`The event falls outside the proposal’s validity (${formatDhakaDate(p.validFrom)} – ${formatDhakaDate(p.validTo)}). Submit a new proposal.`);
        p.event = { at: action.at, evidence: action.evidence.trim(), confirmedById: actor.id, confirmedAt: at };
        const period = periodOf(action.at);
        const add = (component: CommissionAccrual['component'], base: number, pct: number) =>
        d.commissionAccruals.push({ id: nextId(d.commissionAccruals, 'CA-', 5), proposalId: p.id, agentId: p.agentId!, customerId: p.customerId, period, component, base, pct, amount: Math.round(base * pct / 100), status: 'Accrued', accruedAt: at });
        if (usesOtc(p.basis) && effectiveOtcPct(p) > 0) add('OTC', p.otc, effectiveOtcPct(p));
        if (usesMrc(p.basis) && effectiveMrcPct(p) > 0) add('MRC', p.mrc, effectiveMrcPct(p));
        const agent = d.salesAgents.find((x) => x.id === p.agentId);
        if (agent) agent.activations += 1;
        p.history.push({ at, byId: actor.id, detail: `${p.qualifyingEvent} confirmed for ${formatDhakaDate(action.at)} (${action.evidence.trim()}) — commission accrued for ${periodLabel(period)}` });
        audit(ctx, 'Qualifying event confirmed', `${p.id} ${p.qualifyingEvent} ${formatDhakaDate(action.at)}`, { type: 'salesAgent', id: p.agentId! });
        return ok(`Commission accrued for ${periodLabel(period)}.${p.arrangement === 'Recurring' ? ' Later months accrue in the monthly accrual run.' : ''}`);
      }

    case 'AGT_RUN_ACCRUALS':{
        if (!canRunAccruals(role)) return fail('Only Accounts runs commission accruals.');
        const now = periodOf(demoNow().toISOString());
        if (action.period > now) return fail('Accruals cannot run for a future month.');
        let n = 0;
        let total = 0;
        d.commissionProposals.
        filter((p) => p.status === 'Approved' && p.arrangement === 'Recurring' && p.event && usesMrc(p.basis)).
        forEach((p) => {
          const start = periodOf(p.event!.at);
          const have = new Set(d.commissionAccruals.filter((a) => a.proposalId === p.id && a.component === 'MRC').map((a) => a.period));
          for (let i = 0; i < p.months; i++) {
            const m = addMonths(start, i);
            if (m > action.period) break;
            if (have.has(m)) continue;
            const amount = Math.round(p.mrc * effectiveMrcPct(p) / 100);
            d.commissionAccruals.push({ id: nextId(d.commissionAccruals, 'CA-', 5), proposalId: p.id, agentId: p.agentId!, customerId: p.customerId, period: m, component: 'MRC', base: p.mrc, pct: effectiveMrcPct(p), amount, status: 'Accrued', accruedAt: at });
            n++;
            total += amount;
          }
        });
        if (!n) return ok(`Nothing new to accrue up to ${periodLabel(action.period)}.`);
        audit(ctx, 'Commission accrual run', `${n} recurring accrual(s) up to ${periodLabel(action.period)} · ${formatBDT(total)}`, { type: 'salesAgent', id: 'all' });
        return ok(`${n} recurring accrual(s) added · ${formatBDT(total)}.`);
      }

    case 'AGT_RECORD_CANCELLATION':{
        if (!canConfirmEvent(role)) return fail('Only Back Office or Accounts records cancellations and refunds.');
        const p = d.commissionProposals.find((x) => x.id === action.proposalId);
        if (!p || p.status !== 'Approved') return fail('Only approved proposals can be cancelled.');
        if (action.note.trim().length < MIN_REASON) return fail(`Describe the ${action.kind.toLowerCase()} (at least ${MIN_REASON} characters).`);
        const mine = d.commissionAccruals.filter((a) => a.proposalId === p.id);
        const inFlight = mine.find((a) => a.status === 'Pending Approval' || a.status === 'Approved');
        if (inFlight) return fail(`${inFlight.settlementId} includes this commission and is awaiting approval or payment. Finish or reject it first.`);
        let reversed = 0;
        mine.
        filter((a) => a.status === 'Accrued').
        forEach((a) => {
          a.status = 'Reversed';
          a.reversedAt = at;
          a.reversalReason = `${action.kind}: ${action.note.trim()}`;
          reversed += a.amount;
        });
        let clawback = 0;
        if (p.cancellationTreatment.startsWith('Reverse unpaid and') && p.event && monthsBetween(periodOf(p.event.at), periodOf(action.at)) < p.clawbackMonths) {
          clawback = mine.filter((a) => a.status === 'Paid').reduce((s, a) => s + a.amount, 0);
          if (clawback > 0)
          d.commissionAccruals.push({ id: nextId(d.commissionAccruals, 'CA-', 5), proposalId: p.id, agentId: p.agentId!, customerId: p.customerId, period: periodOf(action.at), component: 'Clawback', base: clawback, pct: 100, amount: -clawback, status: 'Accrued', accruedAt: at });
        }
        p.status = 'Cancelled';
        p.cancellation = { at: action.at, kind: action.kind, note: action.note.trim(), byId: actor.id, recordedAt: at };
        p.history.push({ at, byId: actor.id, detail: `${action.kind} on ${formatDhakaDate(action.at)} — ${formatBDT(reversed)} unpaid reversed${clawback ? `, ${formatBDT(clawback)} paid to be recovered` : ''}. No further accruals.` });
        audit(ctx, `Commission ${action.kind.toLowerCase()} recorded`, `${p.id}: reversed ${formatBDT(reversed)}${clawback ? `, clawback ${formatBDT(clawback)}` : ''}`, { type: 'salesAgent', id: p.agentId! });
        return ok(`${formatBDT(reversed)} reversed${clawback ? `; ${formatBDT(clawback)} will be deducted from the next settlement` : ''}.`);
      }

    case 'AGT_CREATE_SETTLEMENT':{
        if (!canRunAccruals(role)) return fail('Only Accounts prepares commission settlements.');
        const a = d.salesAgents.find((x) => x.id === action.agentId);
        if (!a) return fail('Agent not found.');
        const now = periodOf(demoNow().toISOString());
        const rows = d.commissionAccruals.filter((x) => x.agentId === a.id && x.status === 'Accrued' && x.period <= now);
        if (!rows.length) return fail(`${a.name} has no accrued commission to settle.`);
        const amount = rows.reduce((s, r) => s + r.amount, 0);
        if (amount <= 0) return fail(`Clawbacks exceed earned commission (${formatBDT(amount)}). Nothing is payable yet.`);
        const ps = [...new Set(rows.map((r) => r.period))].sort();
        const id = nextId(d.agentSettlements, 'AGS-2026-', 4);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        rows.forEach((r) => {
          r.status = 'Pending Approval';
          r.settlementId = id;
        });
        d.agentSettlements.unshift({ id, agentId: a.id, accrualIds: rows.map((r) => r.id), amount, periods: ps.length > 1 ? `${periodLabel(ps[0])} – ${periodLabel(ps[ps.length - 1])}` : periodLabel(ps[0]), status: 'Pending Approval', preparedById: actor.id, preparedAt: at, approvalId: apId });
        d.approvals.unshift({
          id: apId, type: 'Commission', title: `Agent commission settlement ${id} — ${a.name}`, detail: `${rows.length} accrual(s) · ${formatBDT(amount)}`, amount, entity: { type: 'salesAgent', id: a.id },
          related: [{ type: 'salesAgent', id: a.id }], requestedById: actor.id, requestedAt: at, requiredPermission: 'approveCommission', status: 'Pending', agentSettlementId: id, branchId: a.branchId, zoneId: a.zoneId
        });
        d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), title: 'Agent commission awaiting payout approval', detail: `${a.name} · ${formatBDT(amount)}`, at, module: 'agents', branchId: a.branchId, requires: ['approveCommission'], entity: { type: 'approval', id: apId }, readBy: [actor.id] });
        audit(ctx, 'Agent settlement prepared', `${id} ${a.name} ${formatBDT(amount)}`, { type: 'salesAgent', id: a.id });
        return ok(`${id} sent to the Finance Approver.`);
      }

    case 'AGT_RECORD_PAYMENT':{
        if (!canPay(role)) return fail('Only Accounts records agent payments.');
        const s = d.agentSettlements.find((x) => x.id === action.settlementId);
        if (!s || s.status !== 'Approved') return fail('Only approved settlements can be paid.');
        const a = d.salesAgents.find((x) => x.id === s.agentId)!;
        if (!a.payment) return fail(`Add ${a.name}’s payment details first.`);
        if (action.reference.trim().length < 4) return fail('Enter the payment reference.');
        if (d.agentSettlements.some((x) => x.payment?.reference.toLowerCase() === action.reference.trim().toLowerCase())) return fail('This payment reference is already used.');
        s.status = 'Paid';
        s.payment = { reference: action.reference.trim(), method: a.payment.method, paidAt: action.paidAt, paidById: actor.id, toAccount: `${a.payment.method} ${maskAccount(a.payment.accountNumber)}` };
        d.commissionAccruals.filter((r) => s.accrualIds.includes(r.id)).forEach((r) => r.status = 'Paid');
        audit(ctx, 'Agent commission paid', `${s.id} ${formatBDT(s.amount)} to ${a.name} · ${action.reference.trim()}`, { type: 'salesAgent', id: a.id });
        return ok(`${formatBDT(s.amount)} recorded as paid to ${a.name}.`);
      }
  }
  return fail('Unknown action.');
}