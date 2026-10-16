import type { FileRef } from './field';

export type JobStatus = 'Pending Assignment' | 'Assigned' | 'Scheduled' | 'In Progress' | 'On Hold' | 'Work Completed' | 'Verified' | 'Closed' | 'Cancelled';

/** Main path, in order. On Hold and Cancelled sit outside it. */
export const JOB_FLOW: JobStatus[] = ['Pending Assignment', 'Assigned', 'Scheduled', 'In Progress', 'On Hold', 'Work Completed', 'Verified', 'Closed'];

export const HOLD_PARTIES = ['IOL Technical', 'IOL Inventory', 'Customer', 'NTTN / upstream', 'Building owner / landlord', 'Local authority'] as const;
export type HoldParty = (typeof HOLD_PARTIES)[number];

export interface JobHold {
  reason: string;
  party: HoldParty;
  nextReviewAt: string;
  since: string;
  byId: string;
  /** Status to return to when the hold is lifted. */
  resumeTo: JobStatus;
}

/** One planned material with its quantities kept separately. Reservation never reduces physical stock. */
export interface JobMaterial {
  id: string;
  item: string;
  sku: string;
  unit: string;
  planned: number;
  reserved: number;
  issued: number;
  consumed: number;
  returned: number;
  serialised?: boolean;
}

export type MaterialRequestKind = 'Reservation' | 'Issue' | 'Return';

export interface MaterialRequest {
  id: string;
  kind: MaterialRequestKind;
  lines: {materialId: string;quantity: number;}[];
  note?: string;
  status: 'Requested' | 'Fulfilled' | 'Rejected';
  requestedById: string;
  requestedAt: string;
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface JobEquipment {
  id: string;
  item: string;
  serial: string;
  ownership: 'IOL-owned (returnable)' | 'Sold to customer' | 'Customer-owned';
}

export interface JobNote {
  id: string;
  at: string;
  byId: string;
  text: string;
}

export interface TestResults {
  opticalPowerDbm?: number;
  throughputMbps?: number;
  latencyMs?: number;
  packetLossPct?: number;
  result: 'Pass' | 'Fail';
  notes?: string;
}

export const ACK_METHODS = ['Signed job sheet', 'Signature on device', 'OTP to customer mobile'] as const;
export type AckMethod = (typeof ACK_METHODS)[number];

export interface CompletionForm {
  workPerformed: string;
  installedAt: string;
  consumed: {materialId: string;quantity: number;}[];
  tests: TestResults;
  photos: FileRef[];
  acknowledgement?: {name: string;designation?: string;method: AckMethod;at: string;};
  outstandingIssues: string;
}

export const BILLING_BASES = ['Later of technical verification and customer acceptance', 'Service activation date', 'Contract commissioning date'] as const;
export type BillingBasis = (typeof BILLING_BASES)[number];

export interface JobEvent {
  at: string;
  byId: string;
  kind: 'Status' | 'Assignment' | 'Schedule' | 'Hold' | 'Material' | 'Equipment' | 'Note' | 'Completion' | 'Verification' | 'Billing';
  detail: string;
}