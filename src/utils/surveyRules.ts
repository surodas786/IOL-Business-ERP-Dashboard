import { branches } from '../data/branches';
import { hasPermission } from './access';
import type { DemoUser, Role } from '../types/erp';
import type { DemoDatabase, Survey } from '../types/records';
import { FINAL_SURVEY_STATUSES, type BomLine, type SurveyCommercial, type SurveyTechnical } from '../types/survey';

// NOTE: Demo-only rules applied in the browser. Production access must also be enforced on the server.

// ---------- Roles ----------

export const canRequestSurvey = (r: Role) => hasPermission(r, 'createQuotation') || hasPermission(r, 'manageSalesTeam');
export const canBackOfficeReview = (r: Role) => hasPermission(r, 'manageWorkOrders') && r.modules.includes('surveys');
/** Assigns technicians, reviews technical submissions and approves survey bypasses. */
export const canSuperviseSurveys = (r: Role) => hasPermission(r, 'technicalConfig') && hasPermission(r, 'assignTickets');
export const canReserveStock = (r: Role) => hasPermission(r, 'manageStock');
/** Sales / Business Head cost analysis. Never shown to technical roles. */
export const canViewCostAnalysis = (r: Role) => hasPermission(r, 'viewPipeline') && !hasPermission(r, 'technicalConfig');
export const canEditCommercial = (r: Role) => canViewCostAnalysis(r) && (hasPermission(r, 'createQuotation') || hasPermission(r, 'manageSalesTeam'));
/** Technical form fields are for technical roles only (Accounts never receive them). */
export const canSeeTechnicalForm = (r: Role) => hasPermission(r, 'technicalConfig') || hasPermission(r, 'manageWorkOrders') || hasPermission(r, 'viewPipeline') || hasPermission(r, 'manageStock');

export function isSurveyor(s: Survey, user: DemoUser): boolean {
  return !!s.technicianUserId && s.technicianUserId === user.id;
}

/** Technician on the survey, or a supervisor working on behalf of a technician without a login. */
export function canWorkSurvey(s: Survey, user: DemoUser, role: Role): boolean {
  return isSurveyor(s, user) || canSuperviseSurveys(role);
}

export function canEditTechnical(s: Survey, user: DemoUser, role: Role): boolean {
  return (s.status === 'In Progress' || s.status === 'Returned') && canWorkSurvey(s, user, role);
}

export const isFinal = (s: Survey) => FINAL_SURVEY_STATUSES.includes(s.status);

// ---------- Labels (configurable, awaiting IOL confirmation) ----------

export function componentLabels(db: DemoDatabase) {
  const ggc = db.policies.find((p) => p.id === 'LBL-GGC');
  const fnn = db.policies.find((p) => p.id === 'LBL-FNN');
  return {
    ggc: ggc?.value ?? 'GGC',
    fnn: fnn?.value ?? 'FNN',
    ggcConfirmed: ggc?.status === 'Confirmed',
    fnnConfirmed: fnn?.status === 'Confirmed'
  };
}

// ---------- Survey context ----------

export function surveyContext(db: DemoDatabase, s: Survey) {
  const opp = db.opportunities.find((o) => o.id === s.opportunityId);
  const lead = opp && db.leads.find((l) => l.id === opp.leadId);
  const customerId = s.customerId ?? opp?.customerId;
  const customer = customerId ? db.customers.find((c) => c.id === customerId) : undefined;
  const site = s.siteId ? db.sites.find((x) => x.id === s.siteId) : undefined;
  return { opp, lead, customer, site, name: customer?.name ?? lead?.company ?? s.id };
}

export function warehouseFor(s: Survey): string {
  return branches.find((b) => b.id === s.branchId)?.warehouse ?? 'Dhaka Central Warehouse';
}

// ---------- Quantities ----------

export interface LineQuantities {
  estimated: number;
  reserved: number;
  issued: number;
  installed: number;
  returned: number;
}

/** Installation jobs delivering this survey's opportunity. */
export function surveyJobs(db: DemoDatabase, s: Survey) {
  const quoteIds = new Set(db.quotations.filter((q) => q.opportunityId === s.opportunityId).map((q) => q.id));
  const woIds = new Set(db.workOrders.filter((w) => w.quotationId && quoteIds.has(w.quotationId)).map((w) => w.id));
  return db.installationJobs.filter((j) => woIds.has(j.workOrderId));
}

/** Estimated, reserved, issued, installed and returned are kept separate; only movements change stock. */
export function lineQuantities(db: DemoDatabase, s: Survey, l: BomLine): LineQuantities {
  if (!l.sku) return { estimated: l.quantity, reserved: 0, issued: 0, installed: 0, returned: 0 };
  const jobs = surveyJobs(db, s);
  const jobIds = new Set(jobs.map((j) => j.id));
  const moves = db.inventoryMovements.filter((m) => m.sku === l.sku && m.jobId && jobIds.has(m.jobId));
  const issued = moves.filter((m) => m.type === 'Issue').reduce((n, m) => n + m.quantity, 0);
  const returned = moves.filter((m) => m.type === 'Return').reduce((n, m) => n + m.quantity, 0);
  const done = jobs.some((j) => j.status === 'Work Completed' || j.status === 'Verified' || j.status === 'Closed');
  return { estimated: l.quantity, reserved: l.reservedQty, issued, installed: done ? Math.max(0, issued - returned) : 0, returned };
}

/** Quantity still to reserve: estimate minus outstanding reservation and anything already issued. */
export function unreserved(db: DemoDatabase, s: Survey, l: BomLine): number {
  const q = lineQuantities(db, s, l);
  return Math.max(0, q.estimated - q.reserved - q.issued);
}

export function stockFor(db: DemoDatabase, sku: string | undefined, warehouse: string) {
  if (!sku) return undefined;
  return db.stockItems.find((x) => x.sku === sku && x.warehouse === warehouse);
}

export const availableStock = (st: {onHand: number;reserved: number;}) => Math.max(0, st.onHand - st.reserved);

// ---------- Submission checks ----------

export const REQUIRED_TECH: {key: keyof SurveyTechnical;label: string;}[] = [
{ key: 'medium', label: 'Connection medium' },
{ key: 'nearbyPop', label: 'Nearby PoP' },
{ key: 'route', label: 'Route' },
{ key: 'lastMile', label: 'Last-mile responsibility' },
{ key: 'nttn', label: 'NTTN / upstream dependency' },
{ key: 'capacity', label: 'Capacity availability' },
{ key: 'latencyMs', label: 'Latency' },
{ key: 'mtu', label: 'MTU' },
{ key: 'redundancy', label: 'Redundancy' },
{ key: 'ipRequirement', label: 'IP requirements' },
{ key: 'power', label: 'Power' },
{ key: 'grounding', label: 'Grounding' },
{ key: 'rack', label: 'Rack' },
{ key: 'deliveryDays', label: 'Estimated delivery time' },
{ key: 'outcome', label: 'Feasibility outcome' }];


export function submissionGaps(s: Survey): string[] {
  const t = s.tech ?? {};
  const gaps = REQUIRED_TECH.filter((f) => !String(t[f.key] ?? '').trim()).map((f) => f.label);
  if (t.outcome && t.outcome !== 'Not feasible' && !(s.bom ?? []).length) gaps.push('At least one BOM line');
  if (!(s.attachments ?? []).some((a) => a.kind === 'Photo')) gaps.push('At least one site photo');
  if (t.outcome === 'Not feasible' && !String(t.outcomeNotes ?? '').trim()) gaps.push('Reason the site is not feasible');
  return gaps;
}

// ---------- Cost analysis (proposed demo formula — awaiting Finance confirmation) ----------

export const EMPTY_COMMERCIAL: SurveyCommercial = {
  mrc: 0, mrcDiscount: 0, otc: 0, otcWaiver: 0, refundableDeposit: 0, advanceReceived: 0,
  labour: 0, permits: 0, nttnOtc: 0, otherOneTime: 0, nttnMonthly: 0, upstreamMonthly: 0, otherRecurring: 0, agentRecurringPct: 0
};

/** Saved inputs, or defaults from the latest quotation / opportunity. */
export function commercialFor(db: DemoDatabase, s: Survey): SurveyCommercial {
  if (s.commercial) return s.commercial;
  const opp = db.opportunities.find((o) => o.id === s.opportunityId);
  const q = db.quotations.filter((x) => x.opportunityId === s.opportunityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return { ...EMPTY_COMMERCIAL, mrc: q?.mrc ?? opp?.expectedMrc ?? 0, otc: q?.otc ?? opp?.otc ?? 0 };
}

export interface CostBreakdown {
  materialsCompanyFunded: number;
  materialsExcluded: number;
  oneTimeServices: number;
  companyFundedInstall: number;
  netOtcRecovery: number;
  netInvestment: number;
  netMrc: number;
  recurringDelivery: number;
  agentCommission: number;
  monthlyContribution: number;
  /** null when contribution ≤ 0 (no positive payback). 0 when OTC fully recovers the install. */
  paybackMonths: number | null;
  excludedFromRecovery: number;
}

const COMPANY_FUNDED = new Set(['IOL stock', 'IOL purchase']);

export function computeCost(bom: BomLine[], c: SurveyCommercial): CostBreakdown {
  // Materials are counted once, by supply responsibility. Customer- and partner-supplied lines carry no IOL cost here;
  // partner one-time charges are entered once as NTTN OTC.
  const materialsCompanyFunded = bom.filter((l) => COMPANY_FUNDED.has(l.supply)).reduce((n, l) => n + l.quantity * l.unitCost, 0);
  const materialsExcluded = bom.filter((l) => !COMPANY_FUNDED.has(l.supply)).reduce((n, l) => n + l.quantity * l.unitCost, 0);
  const oneTimeServices = c.labour + c.permits + c.nttnOtc + c.otherOneTime;
  const companyFundedInstall = materialsCompanyFunded + oneTimeServices;
  // Refundable deposits and unapplied advances are liabilities, not recovery.
  const netOtcRecovery = Math.max(0, c.otc - c.otcWaiver);
  const netInvestment = companyFundedInstall - netOtcRecovery;
  const netMrc = Math.max(0, c.mrc - c.mrcDiscount);
  const recurringDelivery = c.nttnMonthly + c.upstreamMonthly + c.otherRecurring;
  const agentCommission = Math.round(netMrc * c.agentRecurringPct / 100);
  const monthlyContribution = netMrc - recurringDelivery - agentCommission;
  const paybackMonths = monthlyContribution <= 0 ? null : netInvestment <= 0 ? 0 : netInvestment / monthlyContribution;
  return {
    materialsCompanyFunded, materialsExcluded, oneTimeServices, companyFundedInstall, netOtcRecovery, netInvestment,
    netMrc, recurringDelivery, agentCommission, monthlyContribution, paybackMonths, excludedFromRecovery: c.refundableDeposit + c.advanceReceived
  };
}

export function paybackLabel(b: CostBreakdown): string {
  if (b.paybackMonths === null) return 'No positive payback';
  if (b.paybackMonths === 0) return 'Recovered by OTC';
  return `${b.paybackMonths.toFixed(1)} months`;
}

/** Plain-language status of the survey for sales-facing summaries. */
export function surveyLabel(s: Survey): string {
  if (s.status === 'Approved') return s.tech?.outcome === 'Feasible with conditions' ? 'Feasible with conditions' : 'Feasible';
  if (s.status === 'Back Office Review' && s.boClearedAt) return 'Awaiting assignment';
  return s.status;
}