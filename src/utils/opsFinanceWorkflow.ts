import { roles } from '../data/roles';
import { formatBDT } from './format';
import { nextId, userName } from './relations';
import { dueDateFor, recurringDue } from './opsFinanceRules';
import { ruleForApproval } from './approvalRules';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { AuditEvent, DemoDatabase, EntityRef, StoredNotification } from '../types/records';
import type { OpsCategory, PaymentMethod } from '../types/approvals';
import type { FileRef } from '../types/field';
import type { Actor, WorkflowResult } from './workflow';

export interface OpsDraft {
  category: OpsCategory;
  payee: string;
  amount: number;
  branchId: BranchId;
  period: string;
  description: string;
  evidence: FileRef[];
  evidenceRef: string;
  recurringId?: string;
}

export type OpsAction =
{type: 'OPS_CREATE';draft: OpsDraft;} |
{type: 'OPS_DECIDE';id: string;decision: 'Approved' | 'Rejected' | 'Returned';comment: string;} |
{type: 'OPS_RESUBMIT';id: string;comment: string;evidence: FileRef[];} |
{type: 'OPS_PAY';id: string;reference: string;method: PaymentMethod;paidAt: string;} |
{type: 'OPS_RECURRING_TOGGLE';id: string;active: boolean;} |
{type: 'CENTRE_RETURN';source: 'correction' | 'bypass';id: string;comment: string;} |
{type: 'CENTRE_RESUBMIT';source: 'correction' | 'bypass' | 'claim';id: string;comment: string;};

export const isOpsAction = (a: {type: string;}): a is OpsAction => a.type.startsWith('OPS_') || a.type.startsWith('CENTRE_');

const MIN = 10;
const roleOf = (d: DemoDatabase, id: string) => roles.find((r) => r.id === d.users.find((u) => u.id === id)?.role);
export const canRecordOps = (perms: Permission[]) => perms.includes('recordCollection') || perms.includes('payExpense');
export const canApproveOps = (perms: Permission[]) => perms.includes('approveFinancial');
export const canPayOps = (perms: Permission[]) => perms.includes('payExpense');

export function applyOpsAction(db: DemoDatabase, action: OpsAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const perms = roleOf(d, actor.id)?.permissions ?? [];
  const audit = (act: string, summary: string, entity: EntityRef, changes?: AuditEvent['changes']) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related: [], changes });
  const notify = (n: {title: string;detail: string;module: ModuleId;branchId: BranchId | null;entity: EntityRef;requires?: Permission[];forUserIds?: string[];priority?: StoredNotification['priority'];kind?: StoredNotification['kind'];}) =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], ...n });

  switch (action.type) {
    case 'OPS_CREATE':{
        if (!canRecordOps(perms)) return fail('Only Accounts records operational payments.');
        const x = action.draft;
        if (x.payee.trim().length < 3) return fail('Enter the payee.');
        if (!(x.amount > 0)) return fail('Enter an amount above zero.');
        if (!/^\d{4}-\d{2}$/.test(x.period)) return fail('Choose the period.');
        if (x.description.trim().length < MIN) return fail(`Describe the payment (at least ${MIN} characters).`);
        if (!x.evidence.length && x.evidenceRef.trim().length < 3) return fail('Attach evidence or enter an evidence reference (bill, agreement, payslip summary, voucher).');
        if (x.recurringId && d.opsExpenses.some((e) => e.recurringId === x.recurringId && e.period === x.period && e.status !== 'Rejected')) return fail('This recurring payment is already recorded for that period.');
        const id = nextId(d.opsExpenses, 'OF-2026-', 4);
        d.opsExpenses.unshift({
          id, category: x.category, payee: x.payee.trim(), amount: Math.round(x.amount), branchId: x.branchId, period: x.period, description: x.description.trim(),
          evidence: x.evidence, evidenceRef: x.evidenceRef.trim(), status: 'Pending Approval', requestedById: actor.id, requestedAt: at, recurringId: x.recurringId,
          history: [{ at, byId: actor.id, byName: actor.name, action: 'Submitted', comment: x.description.trim() }]
        });
        audit('Operational payment recorded', `${id} · ${x.category} · ${x.payee.trim()} · ${formatBDT(x.amount)}`, { type: 'opsExpense', id }, [{ field: 'Status', to: 'Pending Approval' }]);
        notify({ title: 'Operational payment awaiting approval', detail: `${x.category} · ${x.payee.trim()} · ${formatBDT(x.amount)}`, module: 'approvals', branchId: x.branchId, requires: ['approveFinancial'], entity: { type: 'opsExpense', id }, kind: 'Handover' });
        return ok(`${id} sent to the Finance Approver.`);
      }
    case 'OPS_DECIDE':{
        const e = d.opsExpenses.find((x) => x.id === action.id);
        if (!e || e.status !== 'Pending Approval') return fail('Only payments awaiting approval can be decided.');
        if (!canApproveOps(perms)) return fail('Only the Finance Approver decides operational payments.');
        if (e.requestedById === actor.id) return fail('Separation of duties: you can’t decide a payment you recorded.');
        const c = action.comment.trim();
        if (c.length < MIN) return fail(`A comment of at least ${MIN} characters is required.`);
        const from = e.status;
        if (action.decision === 'Returned') {
          e.status = 'Returned';
          e.returned = { at, byId: actor.id, comment: c };
        } else {
          e.status = action.decision;
          e.decidedById = actor.id;
          e.decidedAt = at;
        }
        e.history.push({ at, byId: actor.id, byName: actor.name, action: action.decision, comment: c, rule: { name: 'Operational payment — Finance Approver', approverRoles: ['financeApprover'], requiredPermission: 'approveFinancial', condition: 'Any amount', capturedAt: at } });
        audit(`Operational payment ${action.decision.toLowerCase()}`, `${e.id} · ${formatBDT(e.amount)} — ${c}`, { type: 'opsExpense', id: e.id }, [{ field: 'Status', from, to: e.status }]);
        notify({ title: `Operational payment ${action.decision.toLowerCase()}`, detail: `${e.id} · ${e.payee} · ${c}`, module: 'finance', branchId: e.branchId, forUserIds: [e.requestedById], entity: { type: 'opsExpense', id: e.id }, priority: action.decision === 'Approved' ? 'Normal' : 'High', kind: 'Handover' });
        return ok(action.decision === 'Approved' ? `${e.id} approved. Accounts can record payment.` : `${e.id} ${action.decision.toLowerCase()}.`);
      }
    case 'OPS_RESUBMIT':{
        const e = d.opsExpenses.find((x) => x.id === action.id);
        if (!e || e.status !== 'Returned') return fail('Only returned payments can be resubmitted.');
        if (e.requestedById !== actor.id) return fail('Only the person who recorded it can resubmit.');
        if (action.comment.trim().length < MIN) return fail(`Explain what changed (at least ${MIN} characters).`);
        e.evidence = [...e.evidence, ...action.evidence];
        e.status = 'Pending Approval';
        e.returned = undefined;
        e.history.push({ at, byId: actor.id, byName: actor.name, action: 'Resubmitted', comment: action.comment.trim() });
        audit('Operational payment resubmitted', `${e.id} — ${action.comment.trim()}`, { type: 'opsExpense', id: e.id }, [{ field: 'Status', from: 'Returned', to: 'Pending Approval' }]);
        notify({ title: 'Operational payment resubmitted', detail: `${e.id} · ${e.payee}`, module: 'approvals', branchId: e.branchId, requires: ['approveFinancial'], entity: { type: 'opsExpense', id: e.id }, kind: 'Handover' });
        return ok('Resubmitted.');
      }
    case 'OPS_PAY':{
        const e = d.opsExpenses.find((x) => x.id === action.id);
        if (!e || e.status !== 'Approved') return fail('Only approved payments can be paid.');
        if (!canPayOps(perms)) return fail('Only Accounts records payments.');
        if (e.decidedById === actor.id) return fail('Separation of duties: the approver cannot record the payment.');
        if (action.reference.trim().length < 4) return fail('Enter the payment reference (cheque, transfer or transaction number).');
        if (d.opsExpenses.some((x) => x.payment?.reference.toLowerCase() === action.reference.trim().toLowerCase())) return fail('That payment reference is already used on another payment.');
        e.payment = { reference: action.reference.trim(), method: action.method, paidAt: action.paidAt, paidById: actor.id };
        e.status = 'Paid';
        audit('Operational payment paid', `${e.id} · ${action.method} ${action.reference.trim()} · ${formatBDT(e.amount)}`, { type: 'opsExpense', id: e.id }, [{ field: 'Status', from: 'Approved', to: 'Paid' }, { field: 'Payment reference', to: action.reference.trim() }]);
        return ok(`${e.id} marked paid.`);
      }
    case 'OPS_RECURRING_TOGGLE':{
        const r = d.recurringPayments.find((x) => x.id === action.id);
        if (!r) return fail('Not found.');
        if (!canRecordOps(perms)) return fail('Only Accounts manages recurring reminders.');
        r.active = action.active;
        audit(action.active ? 'Recurring reminder resumed' : 'Recurring reminder paused', `${r.id} · ${r.payee}`, { type: 'opsExpense', id: r.id }, [{ field: 'Active', from: String(!action.active), to: String(action.active) }]);
        return ok(action.active ? 'Reminder resumed.' : 'Reminder paused.');
      }
    case 'CENTRE_RETURN':{
        const list = action.source === 'correction' ? d.profileCorrections : d.surveyBypasses;
        const x = (list as Array<(typeof list)[number]>).find((r) => r.id === action.id);
        if (!x || x.status !== 'Pending' || x.returned) return fail('Only pending requests can be returned.');
        const roleId = d.users.find((u) => u.id === actor.id)?.role;
        const allowed = action.source === 'correction' ? roleId === 'management' || roleId === 'businessHead' : roleId === 'technicalSupervisor';
        if (!allowed) return fail('Your role is not the approver for this request.');
        if (x.requestedById === actor.id) return fail('Separation of duties: you can’t decide your own request.');
        const c = action.comment.trim();
        if (c.length < MIN) return fail(`A comment of at least ${MIN} characters is required.`);
        x.returned = { at, byId: actor.id, comment: c };
        x.centreHistory = [...(x.centreHistory ?? []), { at, byId: actor.id, byName: actor.name, action: 'Returned', comment: c }];
        const ent: EntityRef = action.source === 'correction' ? { type: 'customer', id: (x as {customerId: string;}).customerId } : { type: 'opportunity', id: (x as {opportunityId: string;}).opportunityId };
        audit(`${action.source === 'correction' ? 'Profile correction' : 'Survey bypass'} returned`, `${x.id} — ${c}`, ent, [{ field: 'Status', from: 'Pending', to: 'Returned' }]);
        notify({ title: `${action.source === 'correction' ? 'Profile correction' : 'Survey bypass'} returned for more information`, detail: `${x.id} · ${c}`, module: 'approvals', branchId: x.branchId, forUserIds: [x.requestedById], entity: ent, priority: 'High', kind: 'Handover' });
        return ok('Returned to the requester.');
      }
    case 'CENTRE_RESUBMIT':{
        const c = action.comment.trim();
        if (c.length < MIN) return fail(`Explain what changed (at least ${MIN} characters).`);
        if (action.source === 'claim') {
          const cl = d.expenseClaims.find((x) => x.id === action.id);
          if (!cl || cl.status !== 'Returned') return fail('Only returned claims can be resubmitted.');
          if (cl.claimantId !== actor.id) return fail('Only the claimant can resubmit.');
          cl.status = 'Submitted';
          cl.submittedAt = at;
          cl.history.push({ at, byId: actor.id, action: 'Resubmitted', note: c });
          audit('Expense claim resubmitted', `${cl.id} — ${c}`, { type: 'expenseClaim', id: cl.id }, [{ field: 'Status', from: 'Returned', to: 'Submitted' }]);
          notify({ title: 'Expense claim resubmitted', detail: `${userName(cl.claimantId)} · ${cl.id}`, module: 'approvals', branchId: cl.branchId, requires: ['approveExpense'], entity: { type: 'expenseClaim', id: cl.id }, kind: 'Handover' });
          return ok('Claim resubmitted.');
        }
        const list = action.source === 'correction' ? d.profileCorrections : d.surveyBypasses;
        const x = (list as Array<(typeof list)[number]>).find((r) => r.id === action.id);
        if (!x || !x.returned) return fail('Only returned requests can be resubmitted.');
        if (x.requestedById !== actor.id) return fail('Only the requester can resubmit.');
        x.returned = undefined;
        x.centreHistory = [...(x.centreHistory ?? []), { at, byId: actor.id, byName: actor.name, action: 'Resubmitted', comment: c }];
        audit('Request resubmitted', `${x.id} — ${c}`, { type: action.source === 'correction' ? 'customer' : 'opportunity', id: action.source === 'correction' ? (x as {customerId: string;}).customerId : (x as {opportunityId: string;}).opportunityId }, [{ field: 'Status', from: 'Returned', to: 'Pending' }]);
        return ok('Resubmitted to the approver.');
      }
  }
  return fail('Unknown action.');
}

/**
 * System sweep: overdue tasks and recurring payment reminders. Each notice has a dedupe key, so it is created
 * exactly once however often the sweep runs. Returns null when nothing new is due.
 */
export function sweepNotifications(db: DemoDatabase, now: Date): DemoDatabase | null {
  const fresh: StoredNotification[] = [];
  const keys = new Set(db.notifications.map((n) => n.dedupeKey).filter(Boolean));
  const at = now.toISOString();
  let seq = 0;
  const add = (key: string, n: Omit<StoredNotification, 'id' | 'at' | 'readBy' | 'dedupeKey'>) => {
    if (keys.has(key)) return;
    keys.add(key);
    seq += 1;
    fresh.push({ id: `NT-S${Date.parse(at).toString(36)}${seq}`, at, readBy: [], dedupeKey: key, ...n });
  };
  db.approvals.filter((a) => a.status === 'Pending').forEach((a) => {
    const sla = ruleForApproval(db, a)?.slaHours ?? 48;
    if (Date.parse(a.requestedAt) + sla * 3600000 < now.getTime())
    add(`overdue-${a.id}`, { title: `Overdue: ${a.type} approval`, detail: `${a.title} · waiting more than ${sla} h`, module: 'approvals', branchId: a.branchId, requires: [a.requiredPermission], entity: { type: 'approval', id: a.id }, priority: 'High', kind: 'Overdue' });
  });
  db.opsExpenses.filter((e) => e.status === 'Approved').forEach((e) => {
    if (e.decidedAt && Date.parse(e.decidedAt) + 72 * 3600000 < now.getTime())
    add(`unpaid-${e.id}`, { title: 'Overdue: approved payment not yet paid', detail: `${e.id} · ${e.payee} · ${formatBDT(e.amount)}`, module: 'finance', branchId: e.branchId, requires: ['payExpense'], entity: { type: 'opsExpense', id: e.id }, priority: 'High', kind: 'Overdue' });
  });
  recurringDue(db, now).forEach((r) => {
    if (r.daysLeft <= 5)
    add(`recurring-${r.rule.id}-${r.period}${r.daysLeft < 0 ? '-late' : ''}`, {
      title: r.daysLeft < 0 ? `Recurring payment overdue: ${r.rule.payee}` : `Recurring payment due ${r.daysLeft === 0 ? 'today' : `in ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'}`}`,
      detail: `${r.rule.category} · ${formatBDT(r.rule.amount)} · due ${dueDateFor(r.rule, r.period).slice(0, 10)}`,
      module: 'finance', branchId: r.rule.branchId, requires: ['payExpense'], entity: { type: 'opsExpense', id: r.rule.id }, priority: r.daysLeft < 0 ? 'High' : 'Normal', kind: 'Reminder'
    });
  });
  if (!fresh.length) return null;
  return { ...db, notifications: [...fresh, ...db.notifications] };
}