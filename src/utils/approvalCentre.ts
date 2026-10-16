import { roles } from '../data/roles';
import { approverNote, ruleForApproval } from './approvalRules';
import { canDecideClaim, claimTotal } from './fieldRules';
import { formatBDT } from './format';
import { recordName, userName } from './relations';
import type { DemoUser, Permission, Role } from '../types/erp';
import type { Approval, ApprovalType, DemoDatabase, EntityRef } from '../types/records';
import type { CentreCategory, DecisionEvent, RuleSnapshot } from '../types/approvals';
import type { AnyAction } from '../contexts/DataContext';

export type CentreSource = 'approval' | 'correction' | 'bypass' | 'claim' | 'ops';
export type CentreStatus = 'Pending' | 'Returned' | 'Approved' | 'Rejected' | 'Paid' | 'Withdrawn';

export interface CentreItem {
  key: string;
  source: CentreSource;
  id: string;
  category: CentreCategory;
  typeLabel: string;
  title: string;
  detail: string;
  linked: EntityRef;
  linkedLabel: string;
  linkPath?: string;
  requestedById: string;
  requestedAt: string;
  approverLabel: string;
  amount?: number;
  /** Permission needed to see the amount and financial impact. */
  amountRequires: Permission;
  impact: string;
  evidence: string[];
  status: CentreStatus;
  returnedComment?: string;
  history: DecisionEvent[];
  ruleSnapshot?: RuleSnapshot;
  branchId: string | null;
  slaHours: number;
  note?: string;
}

const TYPE_CATEGORY: Record<ApprovalType, CentreCategory> = {
  Quotation: 'Special pricing',
  'Special Pricing': 'Special pricing',
  'OTC Reduction': 'Special pricing',
  'Credit Terms': 'Special pricing',
  'Advance Exception': 'Work Order release',
  'Work Order Change': 'Work Order release',
  Commission: 'Agent commission',
  'Agent Commission Terms': 'Agent commission',
  'Agent Reassignment': 'Agent commission',
  'Associate Payout': 'Associate agreement and settlement',
  'Due Allow': 'Due Allow',
  'Service Change': 'Service change',
  'Billing Adjustment': 'Refund or adjustment',
  'Credit Note': 'Refund or adjustment',
  'Stock Adjustment': 'Refund or adjustment',
  'Clearance Exception': 'Disconnection exception'
};

const IMPACT: Record<CentreCategory, string> = {
  'Profile correction': 'Changes the legal identity on future documents. Issued quotations, work orders and invoices keep the old identity.',
  'Survey bypass': 'Skips the site survey. Delivery risk moves to the requester and the technical team.',
  'Special pricing': 'Reduces recurring or one-time revenue below the rate card.',
  'Work Order release': 'Releases, revises or cancels committed delivery work.',
  'Agent commission': 'Commits agent commission against this customer. Kept separate from Associate shares.',
  'Associate agreement and settlement': 'Locks the settlement figures; later rule changes do not recalculate it.',
  'Due Allow': 'Allows service to continue with dues outstanding up to the limit and date.',
  Expense: 'Company cash out once approved and paid.',
  'Service change': 'Changes billing from the approved effective date.',
  'Refund or adjustment': 'Reduces receivables or stock value.',
  'Disconnection exception': 'Closes discontinuation without full clearance on one side.'
};

export const EXCLUSIVE_SALES_HEAD: ApprovalType[] = ['Agent Commission Terms', 'Agent Reassignment'];

const approvalStatus = (a: Approval): CentreStatus => a.status;
const userRole = (db: DemoDatabase, id: string) => db.users.find((u) => u.id === id)?.role;

function approvalLink(a: Approval): string | undefined {
  if (a.stockAdjustmentId) return '/inventory/adjustments';
  if (a.serviceChangeId) return `/service-changes/records/${a.serviceChangeId}`;
  if (a.settlementId) return `/associates/settlements/${a.settlementId}`;
  if (a.commissionProposalId) return `/sales-agents/proposals/${a.commissionProposalId}`;
  if (a.dueAllowId) return '/billing/due-allow';
  if (a.adjustmentId) return '/billing/adjustments';
  if (a.entity.type === 'quotation') return `/quotations/records/${a.entity.id}`;
  if (a.entity.type === 'workOrder') return `/quotations/wo/${a.entity.id}`;
  if (a.entity.type === 'salesAgent') return `/sales-agents/records/${a.entity.id}`;
  return undefined;
}

export function centreItems(db: DemoDatabase): CentreItem[] {
  const out: CentreItem[] = [];
  db.approvals.forEach((a) => {
    const rule = ruleForApproval(db, a);
    const category = TYPE_CATEGORY[a.type];
    const commissionLike = category === 'Agent commission';
    out.push({
      key: `approval:${a.id}`, source: 'approval', id: a.id, category, typeLabel: a.type, title: a.title, detail: a.detail,
      linked: a.entity.type === 'approval' ? a.related[0] ?? a.entity : a.entity, linkedLabel: a.entity.type === 'approval' ? a.title.split(' — ')[0] : recordName(db, a.entity),
      linkPath: approvalLink(a), requestedById: a.requestedById, requestedAt: a.requestedAt,
      approverLabel: EXCLUSIVE_SALES_HEAD.includes(a.type) ? 'Business Head (Sales Head) only' : a.ruleSnapshot ? a.ruleSnapshot.approverRoles.map((r) => roles.find((x) => x.id === r)?.label).join(' or ') : rule ? approverNote(rule).replace('Requires ', '') : 'Holder of the approval permission',
      amount: a.amount || undefined, amountRequires: commissionLike ? 'viewCommissions' : category === 'Special pricing' || category === 'Work Order release' || category === 'Service change' ? 'viewPipeline' : 'viewFinancials',
      impact: IMPACT[category], evidence: a.related.map((r) => `${r.type} ${r.id}`), status: approvalStatus(a), returnedComment: a.returned?.comment,
      history: [{ at: a.requestedAt, byId: a.requestedById, byName: userName(a.requestedById), action: 'Submitted', comment: a.detail }, ...(a.history ?? []), ...(!a.history?.length && a.decidedById ? [{ at: a.decidedAt ?? a.requestedAt, byId: a.decidedById, byName: userName(a.decidedById), action: a.status === 'Rejected' ? 'Rejected' as const : 'Approved' as const, comment: 'Decided before mandatory comments were introduced.' }] : [])],
      ruleSnapshot: a.ruleSnapshot, branchId: a.branchId, slaHours: rule?.slaHours ?? 48,
      note: a.commissionProposalId && a.status === 'Pending' ? 'Rate revisions are made on the commission proposal page.' : undefined
    });
  });
  db.profileCorrections.forEach((p) => {
    out.push({
      key: `correction:${p.id}`, source: 'correction', id: p.id, category: 'Profile correction', typeLabel: 'Profile correction', title: `Profile correction — ${recordName(db, { type: 'customer', id: p.customerId })}`,
      detail: `${p.field}: “${p.oldValue}” → “${p.proposedValue}”`, linked: { type: 'customer', id: p.customerId }, linkedLabel: recordName(db, { type: 'customer', id: p.customerId }), linkPath: `/customers/${p.customerId}`,
      requestedById: p.requestedById, requestedAt: p.requestedAt, approverLabel: 'Management or Business Head', amountRequires: 'viewFinancials', impact: IMPACT['Profile correction'],
      evidence: [p.reason], status: p.returned ? 'Returned' : p.status, returnedComment: p.returned?.comment, branchId: p.branchId, slaHours: 48,
      history: [{ at: p.requestedAt, byId: p.requestedById, byName: userName(p.requestedById), action: 'Submitted', comment: p.reason }, ...(p.centreHistory ?? []), ...(p.decidedById ? [{ at: p.decidedAt!, byId: p.decidedById, byName: userName(p.decidedById), action: p.status as 'Approved' | 'Rejected', comment: p.decisionNote ?? '—' }] : [])]
    });
  });
  db.surveyBypasses.forEach((b) => {
    out.push({
      key: `bypass:${b.id}`, source: 'bypass', id: b.id, category: 'Survey bypass', typeLabel: 'Survey bypass', title: `Survey bypass — ${recordName(db, { type: 'opportunity', id: b.opportunityId })}`,
      detail: b.reason, linked: { type: 'opportunity', id: b.opportunityId }, linkedLabel: recordName(db, { type: 'opportunity', id: b.opportunityId }), linkPath: `/sales-crm/opportunities/${b.opportunityId}`,
      requestedById: b.requestedById, requestedAt: b.requestedAt, approverLabel: 'Technical Supervisor', amountRequires: 'viewFinancials', impact: IMPACT['Survey bypass'],
      evidence: [b.justification, b.documentRef].filter(Boolean), status: b.returned ? 'Returned' : b.status, returnedComment: b.returned?.comment, branchId: b.branchId, slaHours: 24,
      history: [{ at: b.requestedAt, byId: b.requestedById, byName: userName(b.requestedById), action: 'Submitted', comment: b.justification }, ...(b.centreHistory ?? []), ...(b.decidedById ? [{ at: b.decidedAt!, byId: b.decidedById, byName: userName(b.decidedById), action: b.status as 'Approved' | 'Rejected', comment: b.decisionNote ?? '—' }] : [])]
    });
  });
  db.expenseClaims.filter((c) => c.status !== 'Draft').forEach((c) => {
    const map: Record<string, CentreStatus> = { Submitted: 'Pending', Approved: 'Approved', Returned: 'Returned', Rejected: 'Rejected', Paid: 'Paid' };
    out.push({
      key: `claim:${c.id}`, source: 'claim', id: c.id, category: 'Expense', typeLabel: 'Field expense claim', title: `Expense claim ${c.id} — ${userName(c.claimantId)}`,
      detail: `${c.lines.length} line${c.lines.length === 1 ? '' : 's'} · ${[...new Set(c.lines.map((l) => l.category))].join(', ')}`, linked: { type: 'expenseClaim', id: c.id }, linkedLabel: c.id, linkPath: '/field-activities/expenses',
      requestedById: c.claimantId, requestedAt: c.submittedAt ?? c.createdAt, approverLabel: 'Line manager (Finance Approver if none)', amount: claimTotal(c), amountRequires: 'viewFinancials', impact: IMPACT.Expense,
      evidence: c.lines.map((l) => l.receipt ? `Receipt: ${l.receipt.name}` : `No receipt — ${l.noReceiptReason ?? 'below threshold'}`), status: map[c.status] ?? 'Pending',
      returnedComment: c.status === 'Returned' ? [...c.history].reverse().find((h) => h.action === 'Returned')?.note : undefined, branchId: c.branchId, slaHours: 72,
      history: c.history.map((h) => ({ at: h.at, byId: h.byId, byName: userName(h.byId), action: (['Approved', 'Rejected', 'Returned', 'Resubmitted'].includes(h.action) ? h.action : 'Submitted') as DecisionEvent['action'], comment: h.note ?? h.action }))
    });
  });
  db.opsExpenses.forEach((e) => {
    const map: Record<string, CentreStatus> = { 'Pending Approval': 'Pending', Returned: 'Returned', Approved: 'Approved', Rejected: 'Rejected', Paid: 'Paid' };
    out.push({
      key: `ops:${e.id}`, source: 'ops', id: e.id, category: 'Expense', typeLabel: `Operational · ${e.category}`, title: `${e.category} — ${e.payee}`, detail: e.description,
      linked: { type: 'opsExpense', id: e.id }, linkedLabel: e.id, linkPath: `/operational-finance/register?id=${e.id}`, requestedById: e.requestedById, requestedAt: e.requestedAt,
      approverLabel: 'Finance Approver', amount: e.amount, amountRequires: 'viewFinancials', impact: IMPACT.Expense,
      evidence: [...e.evidence.map((f) => f.name), ...(e.evidenceRef ? [`Ref ${e.evidenceRef}`] : [])], status: map[e.status], returnedComment: e.returned?.comment, branchId: e.branchId, slaHours: 48,
      history: e.history.map((h) => ({ ...h, byName: userName(h.byId) })), ruleSnapshot: [...e.history].reverse().find((h) => h.rule)?.rule
    });
  });
  return out.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

/** Null when the user may decide; otherwise the reason they cannot. Enforces authority and separation of duties. */
export function decideBlock(db: DemoDatabase, item: CentreItem, user: DemoUser, role: Role): string | null {
  if (item.status !== 'Pending') return item.status === 'Returned' ? 'Returned — waiting for the requester to resubmit.' : 'Already decided.';
  if (item.requestedById === user.id) return 'Separation of duties: you submitted this request.';
  if (item.source === 'approval') {
    const a = db.approvals.find((x) => x.id === item.id)!;
    if (EXCLUSIVE_SALES_HEAD.includes(a.type) && role.id !== 'businessHead') return 'Business Head (Sales Head) only. Management, Chairman, Operations, Accounts and System Admin do not hold this authority.';
    if (!role.permissions.includes(a.requiredPermission)) return `Assigned to ${item.approverLabel}.`;
    const rule = ruleForApproval(db, a);
    if (rule && !rule.approverRoles.includes(role.id)) return approverNote(rule);
    if (a.settlementId) {
      const s = db.associateSettlements?.find((x) => x.id === a.settlementId);
      if (s?.history.find((h) => h.detail.startsWith('Reviewed'))?.byId === user.id) return 'Separation of duties: you reviewed this settlement.';
    }
    if (a.agentSettlementId) {
      const s = db.agentSettlements?.find((x) => x.id === a.agentSettlementId);
      if (s?.preparedById === user.id) return 'Separation of duties: you prepared this settlement.';
    }
    return null;
  }
  if (item.source === 'correction') return role.id === 'management' || role.id === 'businessHead' ? null : 'Assigned to Management or Business Head.';
  if (item.source === 'bypass') return role.id === 'technicalSupervisor' ? null : 'Assigned to the Technical Supervisor.';
  if (item.source === 'claim') {
    const c = db.expenseClaims.find((x) => x.id === item.id)!;
    return canDecideClaim(c, user, role, db);
  }
  return role.permissions.includes('approveFinancial') ? null : 'Assigned to the Finance Approver.';
}

export function decisionAction(item: CentreItem, decision: 'Approved' | 'Rejected' | 'Returned', comment: string): AnyAction {
  switch (item.source) {
    case 'approval':
      return { type: 'DECIDE_APPROVAL', approvalId: item.id, decision, comment };
    case 'correction':
      return decision === 'Returned' ? { type: 'CENTRE_RETURN', source: 'correction', id: item.id, comment } : { type: 'CUST_DECIDE_CORRECTION', correctionId: item.id, decision, note: comment };
    case 'bypass':
      return decision === 'Returned' ? { type: 'CENTRE_RETURN', source: 'bypass', id: item.id, comment } : { type: 'SURVEY_DECIDE_BYPASS', bypassId: item.id, decision, note: comment };
    case 'claim':
      return { type: 'FIELD_DECIDE_CLAIM', claimId: item.id, decision, note: comment };
    case 'ops':
      return { type: 'OPS_DECIDE', id: item.id, decision, comment };
  }
}

export function resubmitAction(item: CentreItem, comment: string): AnyAction {
  switch (item.source) {
    case 'approval':
      return { type: 'RESUBMIT_APPROVAL', approvalId: item.id, comment };
    case 'ops':
      return { type: 'OPS_RESUBMIT', id: item.id, comment, evidence: [] };
    default:
      return { type: 'CENTRE_RESUBMIT', source: item.source, id: item.id, comment };
  }
}

/** Requesters see their own requests; approvers see what they could decide; financial viewers see the rest in scope. */
export function canSeeItem(db: DemoDatabase, item: CentreItem, user: DemoUser, role: Role): boolean {
  if (item.requestedById === user.id) return true;
  if (item.source === 'approval') {
    const a = db.approvals.find((x) => x.id === item.id)!;
    if (role.permissions.includes(a.requiredPermission)) return true;
  }
  if (item.source === 'claim') {
    const c = db.expenseClaims.find((x) => x.id === item.id)!;
    if (db.users.find((u) => u.id === c.claimantId)?.managerId === user.id) return true;
  }
  if (item.source === 'correction') return ['management', 'businessHead'].includes(role.id);
  if (item.source === 'bypass') return role.id === 'technicalSupervisor' || role.permissions.includes('viewPipeline');
  if (item.source === 'ops' || item.source === 'claim') return role.permissions.includes('viewFinancials') && (role.permissions.includes('approveFinancial') || role.permissions.includes('payExpense') || role.id === 'management');
  return role.permissions.includes('allBranches') && role.permissions.includes(item.amountRequires) && role.id !== 'systemAdmin';
}

export const isOverdue = (item: CentreItem, now: Date) => item.status === 'Pending' && Date.parse(item.requestedAt) + item.slaHours * 3600000 < now.getTime();
export const showAmount = (item: CentreItem, role: Role) => item.amount !== undefined && role.permissions.includes(item.amountRequires);
export const amountText = (item: CentreItem, role: Role) => item.amount === undefined ? '—' : showAmount(item, role) ? formatBDT(item.amount) : 'Restricted';
export { userRole };