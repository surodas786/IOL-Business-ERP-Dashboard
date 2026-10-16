/** Associate (local ISP / MAC partner) types. FICTIONAL DEMO — production must enforce these rules on the server. */

export type CollectionModel = 'Centralised' | 'Decentralised' | 'Fixed Monthly';

export const SHARING_BASES = ['Invoiced revenue', 'Collected revenue', 'Revenue after defined deductions', 'Gross profit after agreed costs'] as const;
export type SharingBasis = (typeof SHARING_BASES)[number];

export type NetworkResponsibility = 'IOL' | 'Associate' | 'Shared';
export type VatBearer = 'IOL' | 'Associate' | 'Subscriber';
export type AssociateStatus = 'Active' | 'Suspension Review' | 'Suspended';

export interface AssociateContact {
  role: 'Owner' | 'Billing' | 'Technical' | 'Support';
  name: string;
  phone: string;
  email?: string;
}

/** Extended agreement profile. Optional so older records still load. */
export interface AssociateProfile {
  address?: string;
  tradeLicenceNo?: string;
  contacts?: AssociateContact[];
  territory?: string;
  responsibleExecutiveId?: string;
  parentId?: string;
  backbone?: NetworkResponsibility;
  lastMile?: NetworkResponsibility;
  sharingBasis?: SharingBasis;
  agreementStart?: string;
  agreementEnd?: string;
  /** Day of the month following the period when settlement falls due. */
  settlementDay?: number;
  graceDays?: number;
  creditLimit?: number;
  creditDays?: number;
  depositRequired?: number;
  clientIdPrefix?: string;
  minRenewalDays?: number;
  maxRenewalDays?: number;
  vatBearer?: VatBearer;
  servicesSummary?: string;
  status?: AssociateStatus;
  /** Simulated only — no network change happens in the demo. */
  controls?: {autoRecharge: boolean;networkRestricted: boolean;changedAt?: string;changedBy?: string;note?: string;};
}

export const RULE_KINDS = ['Tax', 'OTC', 'Discount', 'Refund', 'Direct cost'] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export type RuleMethod = 'Percent of revenue' | 'Fixed per settlement' | 'Per subscriber';

/** Effective-dated deduction or cost rule. Global when associateId is empty. */
export interface SettlementRule {
  id: string;
  associateId?: string;
  kind: RuleKind;
  label: string;
  method: RuleMethod;
  value: number;
  effectiveFrom: string;
  effectiveTo?: string;
  createdById: string;
  createdAt: string;
}

export type SettlementStatus = 'Draft' | 'Reviewed' | 'Approved' | 'Paid/Remitted' | 'Reconciled';
export const SETTLEMENT_FLOW: SettlementStatus[] = ['Draft', 'Reviewed', 'Approved', 'Paid/Remitted', 'Reconciled'];

export interface SettlementLine {
  label: string;
  amount: number;
  note?: string;
  ruleId?: string;
}

export interface Remittance {
  id: string;
  amount: number;
  at: string;
  reference: string;
  recordedById: string;
  verified: boolean;
  verifiedById?: string;
  verifiedAt?: string;
}

export interface SettlementDispute {
  id: string;
  amount: number;
  reason: string;
  raisedAt: string;
  raisedById: string;
  status: 'Open' | 'Resolved';
  resolution?: string;
  resolvedAt?: string;
}

export interface AssociateSettlement {
  id: string;
  associateId: string;
  /** YYYY-MM */
  period: string;
  model: CollectionModel;
  basis?: SharingBasis;
  ratePct?: number;
  fixedMonthly?: number;
  inputs: {invoiced: number;collected: number;subscribers: number;};
  /** Decentralised: what the associate says it collected. Not a verified remittance. */
  declaration?: {amount: number;at: string;reference: string;};
  lines: SettlementLine[];
  base: number;
  partnerShare: number;
  /** Centralised: IOL pays the associate. */
  payout: number;
  /** Decentralised / fixed: the associate owes IOL. */
  receivable: number;
  vat: number;
  rulesUsed: {id: string;kind: RuleKind;label: string;method: RuleMethod;value: number;}[];
  calculatedAt: string;
  status: SettlementStatus;
  dueDate: string;
  approvalId?: string;
  remittances: Remittance[];
  disputes: SettlementDispute[];
  paidAt?: string;
  paymentReference?: string;
  history: {at: string;byId: string;detail: string;}[];
}

export type LedgerBucket = 'Advance' | 'Due' | 'Collection' | 'Security Deposit';

/** Each bucket is kept separately; balances are the sum of its entries. */
export interface AssociateLedgerEntry {
  id: string;
  associateId: string;
  bucket: LedgerBucket;
  amount: number;
  at: string;
  description: string;
  settlementId?: string;
  byId: string;
}