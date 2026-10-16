import { hasPermission } from './access';
import { demoNow, formatBDT, formatDhakaDate } from './format';
import type { Role } from '../types/erp';
import type { DemoDatabase, ServiceChange, ServiceConnection } from '../types/records';
import type { ServiceChangeStatus, ServiceChangeType } from '../types/serviceChange';

/* ---------- permissions (demo only — production must enforce on the server) ---------- */
const inModule = (r: Role) => r.modules.includes('serviceChanges');
export const canRequestChange = (r: Role) => inModule(r) && (hasPermission(r, 'createQuotation') || hasPermission(r, 'manageWorkOrders') || hasPermission(r, 'assignTickets'));
export const canAssessTechnical = (r: Role) => inModule(r) && hasPermission(r, 'technicalConfig');
export const canImplement = canAssessTechnical;
export const canSeeCommercial = (r: Role) => hasPermission(r, 'viewFinancials');
export const canEditCommercial = (r: Role) => inModule(r) && hasPermission(r, 'viewFinancials');
export const canSeePayback = (r: Role) => hasPermission(r, 'viewMargins') || hasPermission(r, 'viewPipeline') && hasPermission(r, 'viewFinancials');
export const canDecideChange = (r: Role) => inModule(r) && hasPermission(r, 'approveQuotation');
export const canClearAccounts = (r: Role) => inModule(r) && hasPermission(r, 'recordCollection');
export const canCloseChange = (r: Role) => inModule(r) && (hasPermission(r, 'manageWorkOrders') || hasPermission(r, 'approveQuotation'));

/** Changes whose approved effective date drives billing. */
const BILLING_APPROVED: ServiceChangeStatus[] = ['Approved', 'Implemented', 'Stopped', 'Resumed', 'Service Stopped', 'Closed'];
export const billingApproved = (s: ServiceChange) => BILLING_APPROVED.includes(s.status) && !!s.effectiveDate;

export const OPEN_STATUSES: ServiceChangeStatus[] = ['Requested', 'Pending Approval', 'Approved', 'Stopped', 'Service Stopped'];
export const isOpen = (s: ServiceChange) => OPEN_STATUSES.includes(s.status);

/** Everything except Resumption needs a commercial assessment before approval. */
export const needsCommercial = (t: ServiceChangeType) => t !== 'Resumption';
/** Resumption restores an already-approved service, so it needs technical verification only. */
export const needsApproval = (t: ServiceChangeType) => t !== 'Resumption';

export const TYPE_HINT: Record<ServiceChangeType, string> = {
  Shifting: 'Move the service to another site of the same customer',
  Upgrade: 'More bandwidth or capacity',
  Downgrade: 'Less bandwidth or capacity',
  'Temporary Stop': 'Pause the service for a set period',
  Resumption: 'Restart a temporarily stopped service',
  Discontinuation: 'End the service permanently'
};

/** Ordered steps shown in the status track. */
export function stepsFor(t: ServiceChangeType): ServiceChangeStatus[] {
  switch (t) {
    case 'Temporary Stop':
      return ['Requested', 'Pending Approval', 'Approved', 'Stopped', 'Resumed'];
    case 'Resumption':
      return ['Requested', 'Implemented'];
    case 'Discontinuation':
      return ['Requested', 'Pending Approval', 'Approved', 'Service Stopped', 'Closed'];
    default:
      return ['Requested', 'Pending Approval', 'Approved', 'Implemented'];
  }
}

export const STEP_LABEL: Partial<Record<ServiceChangeStatus, string>> = {
  Requested: 'Assessment',
  'Pending Approval': 'Approval',
  Approved: 'Approved',
  Implemented: 'Implemented',
  Stopped: 'Stopped',
  Resumed: 'Resumed (verified)',
  'Service Stopped': 'Service stopped',
  Closed: 'Administratively closed'
};

export function currentService(db: DemoDatabase, c: ServiceConnection): string {
  const site = db.sites.find((s) => s.id === c.siteId);
  return `${c.product ?? c.serviceType}${c.bandwidthMbps ? ` ${c.bandwidthMbps} Mbps` : ''} · ${c.medium ?? ''}${site ? ` · ${site.name}` : ''}`.replace(' ·  ·', ' ·');
}

/* ---------- assessment gaps ---------- */
export function assessmentGaps(s: ServiceChange): string[] {
  const gaps: string[] = [];
  const t = s.technicalImpact;
  if (!t) gaps.push('Technical impact not assessed');else
  {
    if ((s.type === 'Upgrade' || s.type === 'Downgrade') && t.capacityValidated !== true) gaps.push('Capacity not validated');
    if (s.type === 'Shifting' && (!t.feasibility || t.feasibility === 'Not Feasible')) gaps.push(t.feasibility === 'Not Feasible' ? 'Destination not feasible' : 'Mini-feasibility not recorded');
  }
  if (needsCommercial(s.type) && !s.commercialImpact) gaps.push('Commercial impact not recorded');
  if ((s.type === 'Upgrade' || s.type === 'Downgrade') && s.toMrc === undefined) gaps.push('Revised MRC not set');
  if ((s.type === 'Upgrade' || s.type === 'Downgrade' || s.type === 'Shifting') && !s.costBearer) gaps.push('Cost bearer not set');
  return gaps;
}

/* ---------- payback (proposed demo formula, awaiting Finance confirmation) ---------- */
export interface ChangePayback {
  applies: boolean;
  investment: number;
  recovery: number;
  equipment: number;
  mrcDelta: number;
  recurringDelta: number;
  contribution: number;
  months: number | null;
  label: string;
}

export function changePayback(s: ServiceChange): ChangePayback {
  const equipment = s.costBearer === 'IOL' ? s.equipmentCost ?? 0 : 0;
  const recovery = s.type === 'Shifting' ? s.relocationCharge ?? 0 : s.upgradeCharge ?? 0;
  const investment = equipment - recovery;
  const mrcDelta = (s.toMrc ?? s.fromMrc ?? 0) - (s.fromMrc ?? 0);
  const recurringDelta = s.recurringCostDelta ?? 0;
  const contribution = mrcDelta - recurringDelta;
  const applies = equipment > 0;
  let months: number | null = null;
  let label: string;
  if (investment <= 0) label = 'Recovered upfront';else
  if (contribution <= 0) label = 'No positive payback';else
  {
    months = Math.round(investment / contribution * 10) / 10;
    label = `${months} months`;
  }
  return { applies, investment, recovery, equipment, mrcDelta, recurringDelta, contribution, months, label };
}

/* ---------- discontinuation clearances ---------- */
export const TECH_CHECKS: {key: string;label: string;}[] = [
{ key: 'retrieved', label: 'IOL-owned equipment retrieved or accounted for' },
{ key: 'damage', label: 'Returned equipment inspected; any damage recorded' },
{ key: 'loss', label: 'Missing items recorded with a recovery charge' },
{ key: 'exceptions', label: 'Approved exceptions (customer-owned or written-off items) applied' },
{ key: 'released', label: 'Port, VLAN and IP addresses released' }];


export const ACCOUNTS_CHECKS: {key: string;label: string;}[] = [
{ key: 'final', label: 'Final invoice issued up to the service stop date' },
{ key: 'dues', label: 'All dues settled' },
{ key: 'advance', label: 'Unallocated advance refunded or applied' },
{ key: 'deposit', label: 'Security deposit refunded or adjusted with approval' },
{ key: 'refund', label: 'Any refund paid and recorded' }];


export const clearanceDone = (s?: {status: string;}) => s?.status === 'Cleared' || s?.status === 'Exception Approved';

export function closureGaps(s: ServiceChange): string[] {
  const gaps: string[] = [];
  if (s.status !== 'Service Stopped') gaps.push(s.status === 'Approved' ? 'Service stop not yet recorded' : `Status is ${s.status}`);
  if (!clearanceDone(s.clearances?.technical)) gaps.push(`Technical clearance: ${s.clearances?.technical.status ?? 'Pending'}`);
  if (!clearanceDone(s.clearances?.accounts)) gaps.push(`Accounts clearance: ${s.clearances?.accounts.status ?? 'Pending'}`);
  return gaps;
}

/* ---------- temporary stop reminders ---------- */
export type ResumptionState = 'not-due' | 'reminder' | 'overdue';
export function resumptionState(s: ServiceChange): ResumptionState {
  if (s.type !== 'Temporary Stop' || s.status !== 'Stopped') return 'not-due';
  const now = demoNow().toISOString();
  if (s.expectedResumption && now > s.expectedResumption) return 'overdue';
  if (s.reminderAt && now >= s.reminderAt) return 'reminder';
  return 'not-due';
}

/** Plain-language description of how billing treats this change. */
export function billingEffect(s: ServiceChange, showAmounts: boolean): string {
  const amt = (n?: number) => showAmounts ? formatBDT(n ?? 0) : 'the revised rate';
  const when = s.effectiveDate ? formatDhakaDate(s.effectiveDate) : 'the approved effective date';
  if (!billingApproved(s) && s.type !== 'Resumption') {
    if (s.status === 'Rejected' || s.status === 'Cancelled') return 'No billing change.';
    return 'No billing change until approved — the current rate continues.';
  }
  switch (s.type) {
    case 'Upgrade':
    case 'Downgrade':
      return `${showAmounts ? `${formatBDT(s.fromMrc ?? 0)} until the day before, ` : ''}${amt(s.toMrc)} from ${when}, pro-rated by actual days. Implementation date does not move billing.`;
    case 'Shifting':
      return `MRC unchanged.${s.relocationCharge ? ` One-time relocation charge${showAmounts ? ` of ${formatBDT(s.relocationCharge)}` : ''} invoiced by Accounts after implementation.` : ''}`;
    case 'Temporary Stop':
      return s.status === 'Approved' ?
      'Approved but not yet carried out — the full rate continues until the stop is recorded.' :
      `From ${when}: ${showAmounts ? `${formatBDT(s.continuingCharge ?? 0)}/month` : 'the continuing charge'} while stopped. Full rate returns only from the verified resumption date${s.resumedAt ? ` (${formatDhakaDate(s.resumedAt)})` : ''} — never automatically on the expected date.`;
    case 'Resumption':
      return s.status === 'Implemented' ? `Full rate from the verified resumption date ${s.effectiveDate ? formatDhakaDate(s.effectiveDate) : ''}.` : 'Full rate returns only after Technical verifies the service is restored.';
    case 'Discontinuation':
      return `Charges stop on ${when}. Pending clearance paperwork does not extend billing.`;
  }
}