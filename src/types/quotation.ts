import type { BranchId } from './erp';
import type { EntityRef, ServiceType } from './records';
import type { BomLine, Ownership, SurveyTechnical } from './survey';

export type BillingTerm = 'Prepaid' | 'Postpaid';

export interface EquipmentTerm {
  id: string;
  item: string;
  ownership: Ownership;
  returnCondition: string;
}

/** Commercial and delivery terms of one quotation version. All amounts in BDT. */
export interface QuotationTerms {
  siteId?: string;
  siteName: string;
  siteAddress: string;
  serviceType: ServiceType;
  bandwidthMbps: number;
  description: string;
  /** Rate-card prices — not editable on the quotation. */
  listMrc: number;
  listOtc: number;
  mrc: number;
  otc: number;
  advanceRequired: number;
  securityDeposit: number;
  billingTerm: BillingTerm;
  /** Days after invoice for postpaid accounts. 0 for prepaid. */
  creditDays: number;
  taxTreatmentId: string;
  contractMonths: number;
  leadTimeDays: number;
  validUntil: string;
  equipment: EquipmentTerm[];
  agentId?: string;
  /** One-time agent commission proposed on this quotation. */
  agentCommission: number;
  marginPct: number;
}

export type QuotationVersionStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Superseded' | 'Withdrawn';

export interface QuotationVersion {
  version: number;
  status: QuotationVersionStatus;
  terms: QuotationTerms;
  reason: string;
  createdAt: string;
  createdById: string;
  submittedAt?: string;
  approvedAt?: string;
  /** Required approvals computed at submission. */
  routes?: ApprovalRoute[];
}

export type QuoteApprovalKind = 'Quotation' | 'Special Pricing' | 'OTC Reduction' | 'Credit Terms' | 'Agent Commission Terms';

export interface ApprovalRoute {
  kind: QuoteApprovalKind;
  why: string;
  amount: number;
}

export const ACCEPTANCE_METHODS = ['Signed quotation', 'Email confirmation', 'Purchase order'] as const;
export type AcceptanceMethod = (typeof ACCEPTANCE_METHODS)[number];

export interface CustomerAcceptance {
  version: number;
  method: AcceptanceMethod;
  reference: string;
  fileName?: string;
  acceptedByName: string;
  acceptedAt: string;
  recordedById: string;
  recordedAt: string;
}

export type AdvanceState = 'Awaiting verification' | 'Verified' | 'Exception requested' | 'Exception approved' | 'Exception rejected';

export interface AdvanceRecord {
  state: AdvanceState;
  reference?: string;
  verifiedById?: string;
  verifiedAt?: string;
  exceptionReason?: string;
  approvalId?: string;
}

export interface SiteValidation {
  byId: string;
  at: string;
  note: string;
}

export interface TaxTreatment {
  id: string;
  label: string;
  basis: 'Exclusive' | 'Inclusive' | 'Exempt';
  /** Illustrative only. null = rate not configured; no statutory rate is assumed. */
  ratePct: number | null;
  note: string;
  updatedById?: string;
  updatedAt?: string;
}

export interface QuotePolicy {
  standardCreditDays: number;
  /** Minimum prepaid advance, in months of MRC. */
  minAdvanceMonths: number;
  status: 'Awaiting IOL confirmation' | 'Confirmed';
}

export type ChecklistKey = 'customerSite' | 'survey' | 'commercial' | 'acceptance' | 'advance' | 'materials' | 'commission';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  ok: boolean;
  /** Not applicable items always pass (e.g. commission without an agent). */
  applicable: boolean;
  detail: string;
}

/** Locked financial and technical terms of a released work order version. */
export interface WorkOrderSnapshot {
  version: number;
  quotationId: string;
  quotationVersion: number;
  terms: QuotationTerms;
  surveyId?: string;
  bypassId?: string;
  technical?: Partial<SurveyTechnical>;
  bom: BomLine[];
  deadline: string;
  commissioningDate: string;
  checklist: ChecklistItem[];
  lockedAt: string;
  lockedById: string;
  reason: string;
}

export type Department = 'Technical' | 'Accounts';

export interface Handover {
  department: Department;
  snapshotVersion: number;
  sentAt: string;
  acknowledgedById?: string;
  acknowledgedAt?: string;
}

export interface ChangeRequest {
  id: string;
  target: EntityRef;
  kind: 'Revision' | 'Cancellation';
  reason: string;
  /** Revision only: changed terms. */
  proposed?: Partial<Pick<QuotationTerms, 'bandwidthMbps' | 'mrc' | 'leadTimeDays' | 'contractMonths'>>;
  requestedById: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvalId: string;
  decidedById?: string;
  decidedAt?: string;
  branchId: BranchId;
  zoneId: string;
}