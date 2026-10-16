import type { BranchId } from './erp';
import type { EntityRef } from './records';

/** Behaviour a stage carries. Custom stages added by managers have none. */
export type StageRole = 'entry' | 'prospect' | 'workOrder' | 'won';

export interface CrmStage {
  id: string;
  label: string;
  /** System stages can be renamed but not removed or moved. */
  role?: StageRole;
}

export type OpportunityStatus = 'Open' | 'Stalled' | 'Lost' | 'Won' | 'Merged';

export type CustomerCategory = 'Corporate' | 'SME' | 'Government' | 'Education' | 'Healthcare' | 'Residential Bulk' | 'ISP / Associate';

export const CUSTOMER_CATEGORIES: CustomerCategory[] = ['Corporate', 'SME', 'Government', 'Education', 'Healthcare', 'Residential Bulk', 'ISP / Associate'];

export type CommunicationChannel = 'Call' | 'Visit' | 'Meeting' | 'Email' | 'WhatsApp';

export const COMMUNICATION_CHANNELS: CommunicationChannel[] = ['Call', 'Visit', 'Meeting', 'Email', 'WhatsApp'];

export interface Communication {
  id: string;
  at: string;
  channel: CommunicationChannel;
  summary: string;
  byId: string;
  /** The customer expressed interest during this contact. */
  interest: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  sizeKb: number;
  uploadedAt: string;
  byId: string;
}

export type OpportunityHistoryKind = 'Created' | 'Stage' | 'Lost' | 'Stalled' | 'Reopened' | 'Reassigned' | 'Decision date' | 'Merged' | 'Linked';

export interface OpportunityHistory {
  at: string;
  byId: string;
  kind: OpportunityHistoryKind;
  detail: string;
  reason?: string;
}

export interface DecisionDateChange {
  at: string;
  byId: string;
  from: string;
  to: string;
  reason: string;
}

export type ExpansionType = 'New customer' | 'Additional site' | 'Additional service';

export const LOSS_REASONS = ['Price', 'Chose competitor', 'Not feasible', 'Budget withdrawn', 'No decision', 'Duplicate', 'Other'] as const;
export type LossReason = (typeof LOSS_REASONS)[number];

export interface TenderDocument {
  id: string;
  name: string;
  required: boolean;
  done: boolean;
}

export interface Competitor {
  name: string;
  note: string;
}

export interface Tender {
  id: string;
  reference: string;
  title: string;
  issuingOrganisation: string;
  issuingOrganisationBn: string;
  opportunityId: string;
  ownerId: string;
  branchId: BranchId;
  zoneId: string;
  publishedAt: string;
  clarificationDeadline: string;
  submissionDeadline: string;
  winProbability: number;
  estimatedValue: number;
  competitors: Competitor[];
  documents: TenderDocument[];
  submissionStatus: 'Preparing' | 'Submitted' | 'Withdrawn';
  submittedAt?: string;
  outcome: 'Pending' | 'Won' | 'Lost' | 'Cancelled';
  outcomeNote?: string;
}

export type ConflictKind = 'Possible duplicate' | 'Assignment conflict';

export type ConflictResolution =
'Not a duplicate' |
'Merged' |
'Linked as additional site/service' |
'Reassigned' |
'Kept with current owner';

export interface CrmConflict {
  id: string;
  kind: ConflictKind;
  /** The opportunity under review (the newer record, or the contested one for assignment conflicts). */
  opportunityId: string;
  matches: EntityRef[];
  reasons: string[];
  requestedById: string;
  raisedAt: string;
  note?: string;
  status: 'Open' | 'Resolved';
  resolution?: ConflictResolution;
  resolutionNote?: string;
  resolvedById?: string;
  resolvedAt?: string;
}