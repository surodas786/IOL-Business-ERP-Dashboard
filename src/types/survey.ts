import type { BranchId } from './erp';
import type { DeliveryMedium } from './customer';
import type { DecisionEvent, ReturnState } from './approvals';

/** Survey workflow, in order. Approved / Returned / Not Feasible are technical review outcomes. */
export const SURVEY_FLOW = [
'Submitted',
'Back Office Review',
'Assigned',
'Scheduled',
'In Progress',
'Submitted for Technical Review'] as
const;
export type SurveyStatus = (typeof SURVEY_FLOW)[number] | 'Approved' | 'Returned' | 'Not Feasible';
export const SURVEY_STATUSES: SurveyStatus[] = [...SURVEY_FLOW, 'Approved', 'Returned', 'Not Feasible'];
export const FINAL_SURVEY_STATUSES: SurveyStatus[] = ['Approved', 'Not Feasible'];

export const LAST_MILE_OWNERS = ['IOL', 'NTTN partner', 'Customer', 'Shared'] as const;
export type LastMileOwner = (typeof LAST_MILE_OWNERS)[number];

export const NTTN_DEPENDENCIES = ['None — IOL own fibre', 'NTTN partner last mile', 'NTTN partner backhaul', 'Upstream capacity upgrade'] as const;
export type NttnDependency = (typeof NTTN_DEPENDENCIES)[number];

export const CAPACITY_STATES = ['Available', 'Available after upgrade', 'Not available'] as const;
export type CapacityState = (typeof CAPACITY_STATES)[number];

export const REDUNDANCY_OPTIONS = ['None', 'Dual path, same PoP', 'Dual PoP', 'Radio backup'] as const;
export type Redundancy = (typeof REDUNDANCY_OPTIONS)[number];

export const SURVEY_OUTCOMES = ['Feasible', 'Feasible with conditions', 'Not feasible'] as const;
export type SurveyOutcome = (typeof SURVEY_OUTCOMES)[number];

export interface SurveyTechnical {
  medium: DeliveryMedium;
  nearbyPop: string;
  popDistanceM: string;
  route: string;
  lastMile: LastMileOwner;
  nttn: NttnDependency;
  nttnNotes: string;
  capacity: CapacityState;
  capacityNotes: string;
  ggcRequired: boolean;
  ggcNotes: string;
  fnnRequired: boolean;
  fnnNotes: string;
  latencyMs: string;
  mtu: string;
  redundancy: Redundancy;
  ipRequirement: string;
  power: string;
  grounding: string;
  rack: string;
  constraints: string;
  deliveryDays: string;
  outcome: SurveyOutcome | '';
  outcomeNotes: string;
}

export const SUPPLY_OPTIONS = ['IOL stock', 'IOL purchase', 'Customer', 'NTTN partner'] as const;
export type SupplyResponsibility = (typeof SUPPLY_OPTIONS)[number];

export const OWNERSHIP_OPTIONS = ['IOL-owned · returnable', 'IOL-owned · consumed', 'Customer-owned', 'Partner-owned'] as const;
export type Ownership = (typeof OWNERSHIP_OPTIONS)[number];

/** Bill of materials line. The estimate never moves physical stock. */
export interface BomLine {
  id: string;
  /** Stock item code; free-text items have no SKU. */
  sku?: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  pricedAt: string;
  supply: SupplyResponsibility;
  ownership: Ownership;
  /** Reserved by Inventory against this survey (does not reduce on-hand). */
  reservedQty: number;
}

/** Commercial inputs for the cost analysis. All values exclude VAT. */
export interface SurveyCommercial {
  mrc: number;
  mrcDiscount: number;
  otc: number;
  otcWaiver: number;
  /** Shown for transparency only — never counted as cost recovery. */
  refundableDeposit: number;
  advanceReceived: number;
  labour: number;
  permits: number;
  nttnOtc: number;
  otherOneTime: number;
  nttnMonthly: number;
  upstreamMonthly: number;
  otherRecurring: number;
  agentRecurringPct: number;
  updatedById?: string;
  updatedAt?: string;
}

export interface SurveyAttachment {
  id: string;
  name: string;
  kind: 'Photo' | 'Document';
  at: string;
  byId: string;
}

export interface SurveyHistoryEntry {
  at: string;
  byId: string;
  action: string;
  note?: string;
}

export const BYPASS_REASONS = ['Building already lit by IOL', 'Same site, capacity change only', 'Recent survey covers the route', 'Tender deadline — post-award survey'] as const;
export type BypassReason = (typeof BYPASS_REASONS)[number];

export interface SurveyBypass {
  id: string;
  opportunityId: string;
  reason: BypassReason;
  justification: string;
  documentRef: string;
  requestedById: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
  /** Sent back to the requester from the Approvals centre. */
  returned?: ReturnState;
  centreHistory?: DecisionEvent[];
  branchId: BranchId;
  zoneId: string;
}

/** Warehouse stock. On-hand changes only with physical movements; reservations are tracked separately. */
export interface StockItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  unitCost: number;
  pricedAt: string;
  /** Quantity items: issued and still held by technicians. Serial items derive this from units. */
  withTechnician?: number;
  /** Quantity items: consumed at customer sites. */
  installed?: number;
  /** Cumulative quantity received back and inspected. */
  returnedTotal?: number;
  /** Written off as damaged or lost. */
  damaged?: number;
}