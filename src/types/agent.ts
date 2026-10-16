/** Sales agent (commission-earning introducer) types. FICTIONAL DEMO — production must enforce these rules on the server. */

export type CommissionBasis = 'MRC' | 'OTC' | 'MRC + OTC';
export type CommissionArrangement = 'One-time' | 'Recurring';
export const QUALIFYING_EVENTS = ['Service activation', 'Customer acceptance', 'First invoice paid'] as const;
export type QualifyingEvent = (typeof QUALIFYING_EVENTS)[number];
export const CANCELLATION_TREATMENTS = ['Reverse unpaid accruals only', 'Reverse unpaid and recover paid within clawback window'] as const;
export type CancellationTreatment = (typeof CANCELLATION_TREATMENTS)[number];

/** Restricted — visible to Accounts and the Finance Approver only. */
export interface AgentPaymentDetails {
  method: 'Bank transfer' | 'bKash' | 'Nagad';
  accountName: string;
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  routingNo?: string;
  updatedAt?: string;
  updatedById?: string;
}

/** Extended agent profile and current agreement. Optional so older records still load. */
export interface AgentProfile {
  nid?: string;
  email?: string;
  address?: string;
  territory?: string;
  agreementStart?: string;
  agreementEnd?: string;
  /** Standard terms in the agreement — used as defaults for proposals, never as approved rates. */
  standardBasis?: CommissionBasis;
  standardArrangement?: CommissionArrangement;
  standardMrcPct?: number;
  standardOtcPct?: number;
  standardMonths?: number;
  payment?: AgentPaymentDetails;
  createdAt?: string;
}

/** Agent + customer + salesperson. At most one active attribution per customer. */
export interface AgentAttribution {
  id: string;
  agentId: string;
  customerId: string;
  salespersonId: string;
  effectiveFrom: string;
  /** Set when superseded by an approved reassignment; the record is never deleted. */
  effectiveTo?: string;
  createdById: string;
  createdAt: string;
  note?: string;
  supersededById?: string;
  reassignmentId?: string;
}

export type ReassignmentStatus = 'Pending Approval' | 'Approved' | 'Rejected';

export interface AttributionReassignment {
  id: string;
  attributionId: string;
  customerId: string;
  fromAgentId: string;
  fromSalespersonId: string;
  toAgentId: string;
  toSalespersonId: string;
  effectiveDate: string;
  reason: string;
  requestedById: string;
  requestedAt: string;
  status: ReassignmentStatus;
  approvalId?: string;
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export type ProposalStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Self-Sale' | 'Cancelled';

export interface RateRevision {
  field: 'MRC %' | 'OTC %';
  from: number;
  to: number;
  reason: string;
  byId: string;
  at: string;
}

export interface CommissionProposal {
  id: string;
  /** Empty for Self-Sale. */
  agentId?: string;
  selfSale: boolean;
  customerId: string;
  salespersonId: string;
  attributionId?: string;
  quotationId?: string;
  workOrderId?: string;
  connectionId?: string;
  basis: CommissionBasis;
  arrangement: CommissionArrangement;
  /** Recurring duration in months (1 for one-time). */
  months: number;
  /** Calculation base amounts. */
  mrc: number;
  otc: number;
  proposedMrcPct: number;
  proposedOtcPct: number;
  approvedMrcPct?: number;
  approvedOtcPct?: number;
  qualifyingEvent: QualifyingEvent;
  cancellationTreatment: CancellationTreatment;
  clawbackMonths: number;
  validFrom: string;
  validTo: string;
  status: ProposalStatus;
  preparedById: string;
  preparedAt: string;
  approvalId?: string;
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
  revisions: RateRevision[];
  event?: {at: string;evidence: string;confirmedById: string;confirmedAt: string;};
  cancellation?: {at: string;kind: 'Cancellation' | 'Refund';note: string;byId: string;recordedAt: string;};
  history: {at: string;byId: string;detail: string;}[];
}

export type AccrualStatus = 'Accrued' | 'Pending Approval' | 'Approved' | 'Paid' | 'Reversed';

export interface CommissionAccrual {
  id: string;
  proposalId: string;
  agentId: string;
  customerId: string;
  /** YYYY-MM */
  period: string;
  component: 'MRC' | 'OTC' | 'Clawback';
  base: number;
  pct: number;
  amount: number;
  status: AccrualStatus;
  accruedAt: string;
  settlementId?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export type AgentSettlementStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid';

export interface AgentSettlement {
  id: string;
  agentId: string;
  accrualIds: string[];
  amount: number;
  /** Period range covered, e.g. "Sep–Oct 2026". */
  periods: string;
  status: AgentSettlementStatus;
  preparedById: string;
  preparedAt: string;
  approvalId?: string;
  decidedById?: string;
  decidedAt?: string;
  payment?: {reference: string;method: AgentPaymentDetails['method'];paidAt: string;paidById: string;toAccount: string;};
}

/** Work Order lock — the approved commission (or Self-Sale) frozen against the order. */
export interface CommissionLock {
  proposalId: string;
  agentId?: string;
  selfSale: boolean;
  basis: CommissionBasis;
  arrangement: CommissionArrangement;
  months: number;
  mrcPct: number;
  otcPct: number;
  lockedAt: string;
  lockedById: string;
}