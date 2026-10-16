import { hasPermission } from './access';
import { formatBDT } from './format';
import type { Permission, Role } from '../types/erp';
import type { ApprovalType, DemoDatabase, Quotation, ServiceType, Survey, WorkOrder } from '../types/records';
import type { ApprovalRoute, ChecklistItem, QuotationTerms, QuotationVersion, QuoteApprovalKind, TaxTreatment, WorkOrderSnapshot } from '../types/quotation';

// ---------- Rate card (fictional demo prices, excl. tax) ----------

const RATE_PER_MBPS: Record<ServiceType, {perMbps: number;min: number;}> = {
  'Dedicated Internet': { perMbps: 900, min: 9000 },
  Broadband: { perMbps: 185, min: 1500 },
  'IP Transit': { perMbps: 450, min: 20000 },
  'Data Connectivity': { perMbps: 1100, min: 8000 }
};

export function rateCardMrc(service: ServiceType, mbps: number): number {
  const r = RATE_PER_MBPS[service];
  return Math.max(r.min, Math.round(r.perMbps * mbps));
}

/** Standard installation charge: base plus fibre distance from the survey (500 m assumed when unknown). */
export function rateCardOtc(fibreM: number | undefined): number {
  return 15000 + 30 * Math.round(fibreM && fibreM > 0 ? fibreM : 500);
}

/** One-time commission from the agent's rule text (e.g. "80% of first-month MRC"). */
export function defaultCommission(rule: string | undefined, mrc: number): number {
  const pct = Number(rule?.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? 0);
  return Math.round(mrc * pct / 100);
}

// ---------- Versions ----------

export function currentVersion(q: Quotation): QuotationVersion | undefined {
  return q.versions?.find((v) => v.version === q.version) ?? q.versions?.[q.versions.length - 1];
}

export function termsOf(q: Quotation): QuotationTerms | undefined {
  return currentVersion(q)?.terms;
}

export function latestApprovedVersion(q: Quotation): QuotationVersion | undefined {
  return [...(q.versions ?? [])].reverse().find((v) => v.status === 'Approved');
}

export function currentSnapshot(w: WorkOrder): WorkOrderSnapshot | undefined {
  return w.snapshots?.[w.snapshots.length - 1];
}

// ---------- Tax (illustrative, configurable) ----------

export function taxTreatment(db: DemoDatabase, id: string): TaxTreatment | undefined {
  return db.taxTreatments.find((t) => t.id === id);
}

/** Illustrative tax on an amount. null when the rate isn't configured. */
export function illustrativeTax(t: TaxTreatment | undefined, amount: number): number | null {
  if (!t) return null;
  if (t.basis === 'Exempt') return 0;
  if (t.ratePct === null) return null;
  return t.basis === 'Exclusive' ? Math.round(amount * t.ratePct / 100) : Math.round(amount - amount / (1 + t.ratePct / 100));
}

export function taxLabel(t: TaxTreatment | undefined): string {
  if (!t) return 'Not selected';
  if (t.basis === 'Exempt') return `${t.label}`;
  return `${t.label} · ${t.ratePct === null ? 'rate not configured' : `${t.ratePct}% illustrative`}`;
}

// ---------- Approval routing ----------

export const ROUTE_PERMISSION: Record<QuoteApprovalKind, Permission> = {
  Quotation: 'approveQuotation',
  'Special Pricing': 'approveQuotation',
  'OTC Reduction': 'approveQuotation',
  'Credit Terms': 'approveFinancial',
  'Agent Commission Terms': 'approveAgentCommission'
};

export const ROUTE_TYPE: Record<QuoteApprovalKind, ApprovalType> = {
  Quotation: 'Quotation',
  'Special Pricing': 'Special Pricing',
  'OTC Reduction': 'OTC Reduction',
  'Credit Terms': 'Credit Terms',
  'Agent Commission Terms': 'Agent Commission Terms'
};

/** Which authorities a set of terms must go through. Commercial approval is always required. */
export function computeRoutes(db: DemoDatabase, t: QuotationTerms): ApprovalRoute[] {
  const routes: ApprovalRoute[] = [{ kind: 'Quotation', why: 'Commercial approval of MRC and terms', amount: t.mrc }];
  if (t.mrc < t.listMrc) {
    const pct = Math.round((t.listMrc - t.mrc) / t.listMrc * 100);
    routes.push({ kind: 'Special Pricing', why: `MRC ${formatBDT(t.mrc)} is ${pct}% below the rate card (${formatBDT(t.listMrc)})`, amount: t.listMrc - t.mrc });
  }
  if (t.otc < t.listOtc) routes.push({ kind: 'OTC Reduction', why: `OTC ${formatBDT(t.otc)} is below the standard ${formatBDT(t.listOtc)}`, amount: t.listOtc - t.otc });
  const p = db.quotePolicy;
  const credit: string[] = [];
  if (t.billingTerm === 'Postpaid' && t.creditDays > p.standardCreditDays) credit.push(`${t.creditDays}-day credit exceeds the standard ${p.standardCreditDays} days`);
  if (t.billingTerm === 'Prepaid' && t.advanceRequired < t.mrc * p.minAdvanceMonths) credit.push(`advance ${formatBDT(t.advanceRequired)} is below ${p.minAdvanceMonths} month(s) of MRC`);
  if (credit.length) routes.push({ kind: 'Credit Terms', why: `Exceptional credit terms: ${credit.join('; ')}`, amount: t.mrc });
  if (t.agentId && t.agentCommission > 0) routes.push({ kind: 'Agent Commission Terms', why: `Agent commission ${formatBDT(t.agentCommission)} — Business Head (Sales Head) authority only`, amount: t.agentCommission });
  return routes;
}

export function validateTerms(t: QuotationTerms, now: Date): string[] {
  const e: string[] = [];
  if (!t.siteAddress.trim()) e.push('Site address is required.');
  if (!(t.bandwidthMbps > 0)) e.push('Bandwidth must be above zero.');
  if (!(t.mrc > 0)) e.push('MRC must be above zero.');
  if (t.otc < 0 || t.advanceRequired < 0 || t.securityDeposit < 0 || t.agentCommission < 0) e.push('Amounts can’t be negative.');
  if (!(t.contractMonths > 0)) e.push('Contract duration is required.');
  if (!(t.leadTimeDays > 0)) e.push('Installation lead time is required.');
  if (!t.validUntil || new Date(t.validUntil).getTime() <= now.getTime()) e.push('Validity must end in the future.');
  if (t.billingTerm === 'Postpaid' && !(t.creditDays > 0)) e.push('Postpaid terms need credit days.');
  if (!t.taxTreatmentId) e.push('Choose a tax treatment.');
  if (t.equipment.length === 0) e.push('List the equipment and its ownership and return conditions.');
  if (t.equipment.some((x) => !x.item.trim() || !x.returnCondition.trim())) e.push('Every equipment line needs an item and a return condition.');
  return e;
}

// ---------- Release checklist ----------

export function quoteSurvey(db: DemoDatabase, q: Quotation): Survey | undefined {
  const list = db.surveys.filter((s) => s.opportunityId === q.opportunityId);
  return list.find((s) => s.id === q.surveyId) ?? list.find((s) => s.status === 'Approved') ?? list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
}

export function quoteBypass(db: DemoDatabase, q: Quotation) {
  return db.surveyBypasses.find((b) => b.opportunityId === q.opportunityId && b.status === 'Approved');
}

export function releaseChecklist(db: DemoDatabase, q: Quotation): ChecklistItem[] {
  const v = currentVersion(q);
  const t = v?.terms;
  const survey = quoteSurvey(db, q);
  const bypass = quoteBypass(db, q);
  const surveyOk = survey?.status === 'Approved';
  const commissionAp = db.approvals.find((a) => a.type === 'Agent Commission Terms' && a.entity.type === 'quotation' && a.entity.id === q.id && a.quotationVersion === q.version);
  const hasCommission = !!t?.agentId && (t?.agentCommission ?? 0) > 0;
  const adv = q.advance;
  const advNeeded = (t?.advanceRequired ?? 0) > 0;
  return [
  {
    key: 'customerSite', label: 'Customer and site validated', applicable: true, ok: !!q.validation,
    detail: q.validation ? `Validated${q.validation.note ? ` — ${q.validation.note}` : ''}` : 'Back Office must check customer identity, contacts and site address'
  },
  {
    key: 'survey', label: 'Survey approved or authorised bypass approved', applicable: true, ok: surveyOk || !!bypass,
    detail: surveyOk ? `${survey!.id} approved` : bypass ? `Bypass ${bypass.id} approved` : survey ? `${survey.id} is ${survey.status}` : 'No survey or approved bypass'
  },
  {
    key: 'commercial', label: 'Commercial terms approved', applicable: true, ok: v?.status === 'Approved',
    detail: v ? `Version ${v.version} — ${v.status}` : 'No version'
  },
  {
    key: 'acceptance', label: 'Customer acceptance recorded', applicable: true, ok: !!q.acceptance && q.acceptance.version === q.version,
    detail: q.acceptance ? q.acceptance.version === q.version ? `${q.acceptance.method} · ${q.acceptance.reference}` : `Recorded against v${q.acceptance.version}, not the current v${q.version}` : 'Not recorded'
  },
  {
    key: 'advance', label: 'Required advance verified or exception approved', applicable: advNeeded,
    ok: !advNeeded || adv?.state === 'Verified' || adv?.state === 'Exception approved',
    detail: !advNeeded ? 'No advance required' : adv ? adv.state : 'Awaiting verification by Accounts'
  },
  {
    key: 'materials', label: 'Materials identified', applicable: true,
    ok: surveyOk && (survey?.bom ?? []).length > 0 || !!bypass && (t?.equipment.length ?? 0) > 0,
    detail: surveyOk && (survey?.bom ?? []).length ? `${survey!.bom!.length} BOM line(s) on ${survey!.id}` : bypass ? 'From the equipment terms (survey bypassed)' : 'No approved BOM'
  },
  {
    key: 'commission', label: 'Agent commission approved where applicable', applicable: hasCommission,
    ok: !hasCommission || commissionAp?.status === 'Approved',
    detail: !hasCommission ? 'Not agent-sourced' : commissionAp ? `Commission terms ${commissionAp.status.toLowerCase()}` : 'Not yet routed'
  }];

}

export const checklistGaps = (items: ChecklistItem[]) => items.filter((i) => !i.ok);

// ---------- Visibility ----------

export const canPrepareQuote = (r: Role) => hasPermission(r, 'createQuotation');
export const canApproveQuote = (r: Role) => hasPermission(r, 'approveQuotation');
export const canReleaseWo = (r: Role) => hasPermission(r, 'manageWorkOrders');
export const seesQuoteMoney = (r: Role) => hasPermission(r, 'viewPipeline') || hasPermission(r, 'viewFinancials');
export const seesMargin = (r: Role) => hasPermission(r, 'viewMargins');
export const seesCommission = (r: Role) => hasPermission(r, 'viewCommissions');

/** Accounts-type roles: financial view without pipeline, work orders or technical access. */
export const isAccountsRole = (r: Role) => hasPermission(r, 'viewFinancials') && !hasPermission(r, 'viewPipeline') && !hasPermission(r, 'manageWorkOrders') && !hasPermission(r, 'technicalConfig');
export const isTechnicalRole = (r: Role) => hasPermission(r, 'technicalConfig') || hasPermission(r, 'manageStock');

/** Technical handover: scope, parameters, BOM and deadline. Never shown to Accounts. */
export const seesTechnicalHandover = (r: Role) => !isAccountsRole(r) && (isTechnicalRole(r) || r.modules.includes('quotations'));
/** Accounts handover: billing terms and commissioning date. Never shown to Technical. */
export const seesAccountsHandover = (r: Role) => hasPermission(r, 'viewFinancials') && !isTechnicalRole(r);
export const canOpenWorkOrderPage = (r: Role) => seesTechnicalHandover(r) || seesAccountsHandover(r);
/** Quotation pages carry billing terms, so technical roles never open them. */
export const canOpenQuotePage = (r: Role) => !isTechnicalRole(r) && (r.modules.includes('quotations') || hasPermission(r, 'viewFinancials'));

export function quoteName(db: DemoDatabase, q: Quotation): string {
  const c = q.customerId ? db.customers.find((x) => x.id === q.customerId) : undefined;
  if (c) return c.name;
  const opp = db.opportunities.find((o) => o.id === q.opportunityId);
  return db.leads.find((l) => l.id === opp?.leadId)?.company ?? q.id;
}

/** Plain-language next step for a quotation. */
export function quoteNextStep(db: DemoDatabase, q: Quotation): string {
  if (q.status === 'Cancelled') return 'Cancelled';
  if (q.workOrderId) return `Work order ${q.workOrderId}`;
  const v = currentVersion(q);
  if (!v) return '—';
  if (v.status === 'Draft') return 'Draft — submit for approval';
  if (v.status === 'Pending Approval') {
    const pending = db.approvals.filter((a) => a.entity.id === q.id && a.quotationVersion === q.version && a.status === 'Pending').map((a) => a.type);
    return `Awaiting ${pending.join(', ') || 'approval'}`;
  }
  if (v.status === 'Rejected') return 'Rejected — revise or cancel';
  const gaps = checklistGaps(releaseChecklist(db, q));
  return gaps.length ? `${gaps.length} release item(s) open` : 'Ready to release';
}