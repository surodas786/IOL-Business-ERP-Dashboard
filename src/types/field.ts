import type { BranchId } from './erp';
import type { EntityRef } from './records';

export const VISIT_PURPOSES = [
'Prospecting',
'Requirement discussion',
'Proposal presentation',
'Negotiation',
'Account servicing',
'Collection follow-up',
'Technical support'] as
const;
export type VisitPurpose = (typeof VISIT_PURPOSES)[number];

export const VISIT_OUTCOMES = ['Positive', 'Neutral', 'Negative', 'Contact unavailable', 'Rescheduled'] as const;
export type VisitOutcome = (typeof VISIT_OUTCOMES)[number];

/** Optional location stamp. Reference only — never treated as proof that a visit took place. */
export interface GeoStamp {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
  source: 'Demo' | 'Device';
}

export interface FileRef {
  name: string;
  sizeKb: number;
}

export interface FieldVisit {
  id: string;
  userId: string;
  at: string;
  durationMin: number;
  /** A lead or a customer. */
  subject: EntityRef;
  location: string;
  purpose: VisitPurpose;
  peopleMet: string;
  outcome: VisitOutcome;
  notes: string;
  nextAction: string;
  nextActionDue: string;
  followUpDoneAt?: string;
  followUpNote?: string;
  attachments: FileRef[];
  photos: number;
  geo?: GeoStamp;
  claimId?: string;
  createdAt: string;
  branchId: BranchId;
  zoneId: string;
}

export const EXPENSE_CATEGORIES = ['Conveyance', 'Entertainment', 'Mobile & data', 'Printing & documents', 'Other approved'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseRelation = 'Customer acquisition' | 'Account servicing';
export const EXPENSE_RELATIONS: ExpenseRelation[] = ['Customer acquisition', 'Account servicing'];

export interface ExpenseLine {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  purpose: string;
  relation: ExpenseRelation;
  subject?: EntityRef;
  visitId?: string;
  receipt?: FileRef;
  noReceiptReason?: string;
}

export type ClaimStatus = 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Rejected' | 'Paid';

export interface ClaimEvent {
  at: string;
  byId: string;
  action: string;
  note?: string;
}

export interface ClaimAdjustment {
  id: string;
  at: string;
  byId: string;
  amount: number;
  reason: string;
}

export interface ExpenseClaim {
  id: string;
  claimantId: string;
  lines: ExpenseLine[];
  status: ClaimStatus;
  history: ClaimEvent[];
  adjustments: ClaimAdjustment[];
  createdAt: string;
  submittedAt?: string;
  decidedById?: string;
  decidedAt?: string;
  paidAt?: string;
  paymentRef?: string;
  branchId: BranchId;
  zoneId: string;
}

export type TargetMeasure = 'visits' | 'wonDeals' | 'newMrc' | 'collectedCash';

export interface SalesTarget {
  id: string;
  userId: string;
  /** YYYY-MM */
  period: string;
  measure: TargetMeasure;
  target: number;
}