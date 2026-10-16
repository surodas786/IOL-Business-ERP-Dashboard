import { hasPermission, canAccessModule } from './access';
import type { BranchId, DemoUser, Role } from '../types/erp';
import type { DemoDatabase, InstallationJob } from '../types/records';
import type { BillingBasis, JobStatus } from '../types/installation';

/** Field technicians per branch. Some have no demo login; the supervisor acts for them. */
export const TECHNICIANS: {name: string;userId?: string;branchId: BranchId;}[] = [
{ name: 'Jahid Hasan', branchId: 'dhaka-north' },
{ name: 'Faruk Hossain', branchId: 'dhaka-north' },
{ name: 'Sohel Rana', branchId: 'dhaka-south' },
{ name: 'Rakib Uddin', userId: 'u-07', branchId: 'chattogram' },
{ name: 'Mizanur Rahman', branchId: 'chattogram' },
{ name: 'Tareq Aziz', userId: 'u-13', branchId: 'sylhet' }];


export const OPEN_STATUSES: JobStatus[] = ['Pending Assignment', 'Assigned', 'Scheduled', 'In Progress', 'On Hold'];
export const DONE_STATUSES: JobStatus[] = ['Work Completed', 'Verified', 'Closed'];
export const isOpenJob = (j: InstallationJob) => OPEN_STATUSES.includes(j.status);
export const isDoneJob = (j: InstallationJob) => DONE_STATUSES.includes(j.status);

/** Supervisors assign, schedule and verify. */
export const canDispatch = (r: Role) => hasPermission(r, 'technicalConfig') && hasPermission(r, 'assignTickets');
/** Field work: the assigned technician, or a supervisor acting for a technician without a login. */
export const canWorkJob = (r: Role, u: DemoUser, j: InstallationJob) =>
hasPermission(r, 'technicalConfig') && (j.technicianUserId === u.id || canDispatch(r) && !TECHNICIANS.find((t) => t.name === j.technicianName)?.userId);
export const canFulfilMaterials = (r: Role) => hasPermission(r, 'manageStock');
export const canReviewBilling = (r: Role) => hasPermission(r, 'recordCollection');
/** Billing amounts only for roles that may see financials. */
export const seesJobMoney = (r: Role) => hasPermission(r, 'viewFinancials');
/** Technical forms (notes, equipment, completion, materials) — never for Accounts. */
export const seesTechnicalForms = (r: Role) => canAccessModule(r, 'installations');
export const canOpenJobPage = (r: Role) => canAccessModule(r, 'installations') || hasPermission(r, 'recordCollection') || hasPermission(r, 'viewFinancials');

export const ackMissing = (j: InstallationJob) => !j.completion?.acknowledgement;

/** Approved billing basis comes from the work order's Accounts handover. */
export function billingBasisFor(j: InstallationJob): BillingBasis {
  return j.billingBasis ?? 'Later of technical verification and customer acceptance';
}

/** Commencement date per approved basis, or undefined while its inputs are missing. */
export function commencementDate(db: DemoDatabase, j: InstallationJob): string | undefined {
  const basis = billingBasisFor(j);
  if (basis === 'Service activation date') return j.activatedAt;
  if (basis === 'Contract commissioning date') {
    const wo = db.workOrders.find((w) => w.id === j.workOrderId);
    return wo?.snapshots?.[wo.snapshots.length - 1]?.commissioningDate;
  }
  if (!j.verifiedAt || !j.customerAcceptedAt) return undefined;
  return j.verifiedAt > j.customerAcceptedAt ? j.verifiedAt : j.customerAcceptedAt;
}

export interface BillingCheck {
  label: string;
  ok: boolean;
}

export function billingChecks(db: DemoDatabase, j: InstallationJob): BillingCheck[] {
  return [
  { label: 'Technical verification recorded', ok: !!j.verifiedAt },
  { label: 'Customer acceptance recorded', ok: !!j.customerAcceptedAt },
  { label: 'Service activated', ok: !!j.activatedAt },
  { label: 'Commencement date resolvable under the approved rule', ok: !!commencementDate(db, j) }];

}

export const jobDates = (j: InstallationJob): {label: string;at?: string;by?: string;note: string;}[] => [
{ label: 'Installation completed', at: j.completedAt, note: 'From the completion form' },
{ label: 'Technical verification', at: j.verifiedAt, by: j.verifiedById, note: 'Supervisor, separate from completion' },
{ label: 'Customer acceptance', at: j.customerAcceptedAt, note: 'Customer acknowledgement on the job sheet' },
{ label: 'Service activation', at: j.activatedAt, note: 'Set at technical verification' },
{ label: 'Billing commencement', at: j.billingCommencedAt, by: j.billingReviewedById, note: 'Set by Accounts after reviewing the rule' }];


/** Next step wording for lists and cards. */
export function jobNextStep(j: InstallationJob): string {
  switch (j.status) {
    case 'Pending Assignment':
      return 'Supervisor to assign a technician';
    case 'Assigned':
      return 'Confirm visit date';
    case 'Scheduled':
      return 'Technician to start on site';
    case 'In Progress':
      return 'Complete and mark job done';
    case 'On Hold':
      return `On hold — ${j.hold?.party ?? 'see reason'}`;
    case 'Work Completed':
      return 'Supervisor to verify';
    case 'Verified':
      return 'Accounts to review billing commencement';
    case 'Closed':
      return 'Billing commenced';
    default:
      return '—';
  }
}