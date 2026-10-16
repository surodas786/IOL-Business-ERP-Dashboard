/** Service change lifecycle types. FICTIONAL DEMO — production must enforce these rules on the server. */

export type ServiceChangeType = 'Shifting' | 'Upgrade' | 'Downgrade' | 'Temporary Stop' | 'Resumption' | 'Discontinuation';

export const SERVICE_CHANGE_TYPES: ServiceChangeType[] = ['Shifting', 'Upgrade', 'Downgrade', 'Temporary Stop', 'Resumption', 'Discontinuation'];

export type ServiceChangeStatus =
'Requested' |
'Pending Approval' |
'Approved' |
'Implemented' |
'Stopped' |
'Resumed' |
'Service Stopped' |
'Closed' |
'Rejected' |
'Cancelled';

/** Who pays for any new equipment an upgrade or shift needs. */
export type CostBearer = 'IOL' | 'Customer' | 'No new equipment';

export type Feasibility = 'Feasible' | 'Feasible with conditions' | 'Not Feasible';

export interface TechnicalAssessment {
  byId: string;
  at: string;
  impact: string;
  /** Upgrade/downgrade: upstream, port and PoP capacity confirmed. */
  capacityValidated?: boolean;
  capacityNote?: string;
  /** Shifting: mini-feasibility outcome at the destination. */
  feasibility?: Feasibility;
}

export interface CommercialImpact {
  byId: string;
  at: string;
  summary: string;
}

export interface ImplementationEvidence {
  byId: string;
  at: string;
  /** When the work actually happened (Asia/Dhaka). */
  doneAt: string;
  notes: string;
  files: string[];
}

export type ClearanceStatus = 'Pending' | 'Cleared' | 'Exception Requested' | 'Exception Approved' | 'Exception Rejected';

export interface ClearanceTask {
  status: ClearanceStatus;
  checks: Record<string, boolean>;
  notes?: string;
  byId?: string;
  at?: string;
  /** Technical: charge raised for damaged or lost equipment (hidden from roles without financial access). */
  recoveryCharge?: number;
  exceptionReason?: string;
  exceptionApprovalId?: string;
}

export interface ShiftDestination {
  /** Existing site of the same customer; empty means a new site will be added to the same customer profile. */
  siteId?: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
}