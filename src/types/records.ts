import type { BranchId, DemoUser, ModuleId, Permission } from './erp';
import type { AdminArea, ApprovalRule, MasterDataItem, OperationalZone, OrgNode, OwnershipChange, PolicySetting } from './admin';
import type {
  Attachment,
  Communication,
  CrmConflict,
  CrmStage,
  CustomerCategory,
  DecisionDateChange,
  ExpansionType,
  OpportunityHistory,
  OpportunityStatus,
  Tender } from
'./crm';
import type { ExpenseClaim, FieldVisit, SalesTarget } from './field';
import type { BomLine, StockItem, SurveyAttachment, SurveyBypass, SurveyCommercial, SurveyHistoryEntry, SurveyStatus, SurveyTechnical } from './survey';
import type { AdvanceRecord, ChangeRequest, CustomerAcceptance, Handover, QuotationVersion, QuotePolicy, SiteValidation, TaxTreatment, WorkOrderSnapshot } from './quotation';
import type { BillingBasis, CompletionForm, JobEquipment, JobEvent, JobHold, JobMaterial, JobNote, JobStatus, MaterialRequest } from './installation';
import type { CustomerContact, CustomerDocument, CustomerProfileCategory, CustomerSnapshot, DeliveryMedium, ProfileCorrection, ServiceProduct, SubmittedStage } from './customer';
import type { BillingAdjustment, BillingPolicy, BillingRun, BillingTerm, DueAllow, InvoiceKind, InvoiceLine, ReceiptMethod, ReceiptPurpose, SuspensionReview } from './billing';
import type { AgentAttribution, AgentProfile, AgentSettlement, AttributionReassignment, CommissionAccrual, CommissionLock, CommissionProposal } from './agent';
import type { AssociateLedgerEntry, AssociateProfile, AssociateSettlement, SettlementRule } from './associate';
import type { EquipmentUnit, InventoryItem, StockAdjustment, StockReservation, StockReturn, Vendor, VendorPrice } from './inventory';
import type { DecisionEvent, OpsExpense, RecurringPayment, ReturnState, RuleSnapshot } from './approvals';
import type { IssueCategory, RosterEntry, SupportTeam, TicketAttachment, TicketEscalation, TicketEvent, TicketHold, TicketPriority, TicketResolution, TicketSource, TicketStatus } from './ticket';
import type { ClearanceTask, CommercialImpact, CostBearer, ImplementationEvidence, ServiceChangeStatus, ServiceChangeType, ShiftDestination, TechnicalAssessment } from './serviceChange';

export type EntityType =
'lead' |
'opportunity' |
'customer' |
'site' |
'connection' |
'billingAccount' |
'survey' |
'quotation' |
'workOrder' |
'installationJob' |
'inventoryMovement' |
'invoice' |
'receipt' |
'serviceChange' |
'ticket' |
'associate' |
'salesAgent' |
'approval' |
'notification' |
'auditEvent' |
'tender' |
'fieldVisit' |
'expenseClaim' |
'opsExpense' |
'user' |
'orgNode' |
'adminArea' |
'operationalZone' |
'approvalRule' |
'masterData' |
'policy';

export interface EntityRef {
  type: EntityType;
  id: string;
}

interface Located {
  branchId: BranchId;
  zoneId: string;
}

export type ServiceType = 'Dedicated Internet' | 'Broadband' | 'IP Transit' | 'Data Connectivity';

export type LeadSource = 'Direct' | 'Sales Agent' | 'Web' | 'Referral' | 'Tender';

export const LEAD_SOURCES: LeadSource[] = ['Direct', 'Sales Agent', 'Web', 'Referral', 'Tender'];

/** The organisation and contact behind an opportunity. */
export interface Lead extends Located {
  id: string;
  company: string;
  companyBn: string;
  category: CustomerCategory;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  source: LeadSource;
  agentId?: string;
  referral?: string;
  ownerId: string;
  status: 'New' | 'Qualified' | 'Converted' | 'Lost' | 'Merged';
  createdAt: string;
}

export interface Opportunity extends Located {
  id: string;
  leadId: string;
  /** Set when the opportunity belongs to an existing customer, or once a work order creates one. */
  customerId?: string;
  expansion: ExpansionType;
  title: string;
  siteName: string;
  siteAddress: string;
  serviceType: ServiceType;
  bandwidthMbps: number;
  expectedMrc: number;
  otc: number;
  marginPct: number;
  /** Configurable stage id (see crmStages). */
  stage: string;
  status: OpportunityStatus;
  ownerId: string;
  agentId?: string;
  createdAt: string;
  expectedDecisionDate: string;
  nextAction: string;
  nextActionDue: string;
  communications: Communication[];
  attachments: Attachment[];
  history: OpportunityHistory[];
  decisionDateHistory: DecisionDateChange[];
  lossReason?: string;
  stalledReason?: string;
  mergedIntoId?: string;
  wonAt?: string;
  /** When the accepted quotation became a work order — the point MRC counts as contracted. */
  contractedAt?: string;
}

export interface Customer extends Located {
  id: string;
  name: string;
  nameBn: string;
  segment: 'Corporate' | 'SME' | 'Associate';
  accountManagerId: string;
  associateId?: string;
  leadId?: string;
  /** Prospect = profile exists but no service has been ordered yet. */
  status: 'Prospect' | 'Onboarding' | 'Active' | 'Disconnected';
  since: string;
  // Profile fields (optional so converted records fall back to derived defaults).
  category?: CustomerProfileCategory;
  profileStage?: SubmittedStage;
  submittedAt?: string;
  registeredAddress?: string;
  tradeLicenceNo?: string;
  tin?: string;
  contacts?: CustomerContact[];
  documents?: CustomerDocument[];
}

export interface Site extends Located {
  id: string;
  customerId: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
}

export interface ServiceConnection extends Located {
  id: string;
  customerId: string;
  siteId: string;
  billingAccountId: string;
  serviceType: ServiceType;
  bandwidthMbps: number;
  mrc: number;
  status: 'Pending Activation' | 'Active' | 'Temporarily Stopped' | 'Disconnection Pending' | 'Disconnected';
  activatedAt?: string;
  onuSerial?: string;
  vlan?: number;
  product?: ServiceProduct;
  medium?: DeliveryMedium;
  /** Customer-premises equipment summary, e.g. "8 × IP camera, 1 × NVR". */
  cpe?: string;
}

export interface BillingAccount extends Located {
  id: string;
  name: string;
  customerId?: string;
  associateId?: string;
  collectionMode: 'Direct' | 'Associate — Centralised' | 'Associate — Decentralised' | 'Associate — Fixed Monthly';
  billingContact: string;
  billingAddress: string;
  /** Approved terms carried from the work order's Accounts handover. */
  billingTerm?: BillingTerm;
  creditDays?: number;
  taxTreatmentId?: string;
}

export interface Survey extends Located {
  id: string;
  opportunityId: string;
  customerId?: string;
  siteId?: string;
  /** Short label for the surveyed location, e.g. "Ward offices 1–7". */
  siteLabel?: string;
  address: string;
  requestedService?: string;
  requestedBandwidthMbps?: number;
  siteContactName?: string;
  siteContactPhone?: string;
  accessInstructions?: string;
  requestedById?: string;
  /** Empty until a technician is assigned. */
  technicianName: string;
  technicianUserId?: string;
  status: SurveyStatus;
  result?: 'Feasible' | 'Not Feasible';
  fibreDistanceM?: number;
  requestedAt: string;
  boReviewerId?: string;
  boClearedAt?: string;
  boNote?: string;
  assignedAt?: string;
  scheduledAt?: string;
  startedAt?: string;
  /** When the survey was submitted for technical review. */
  completedAt?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNote?: string;
  notes: string;
  tech?: Partial<SurveyTechnical>;
  bom?: BomLine[];
  commercial?: SurveyCommercial;
  attachments?: SurveyAttachment[];
  history?: SurveyHistoryEntry[];
}

export interface Quotation extends Located {
  id: string;
  opportunityId: string;
  customerId?: string;
  description: string;
  mrc: number;
  otc: number;
  marginPct: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Accepted' | 'Cancelled';
  preparedById: string;
  createdAt: string;
  validUntil: string;
  customerSnapshot?: CustomerSnapshot;
  /** Current version number; versions[] keeps every version, approved ones locked. */
  version?: number;
  versions?: QuotationVersion[];
  surveyId?: string;
  acceptance?: CustomerAcceptance;
  advance?: AdvanceRecord;
  validation?: SiteValidation;
  workOrderId?: string;
  cancelReason?: string;
}

export interface WorkOrder extends Located {
  id: string;
  type: 'New Connection' | 'Service Change' | 'Disconnection';
  customerId: string;
  siteId: string;
  quotationId?: string;
  serviceChangeId?: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  createdById: string;
  customerSnapshot?: CustomerSnapshot;
  /** Locked, versioned terms. The last entry is current. */
  snapshots?: WorkOrderSnapshot[];
  handovers?: Handover[];
  cancelReason?: string;
  /** Approved agent commission (or Self-Sale) locked against this order. */
  commissionLock?: CommissionLock;
}

export interface InstallationJob extends Located {
  id: string;
  workOrderId: string;
  customerId: string;
  siteId: string;
  connectionId: string;
  technicianName: string;
  technicianUserId?: string;
  /** Target date while unscheduled; the confirmed visit once Scheduled. */
  scheduledAt: string;
  status: JobStatus;
  /** Installation completed on site (from the completion form). */
  completedAt?: string;
  /** When the technician marked the job done and handed over. */
  handoverAt?: string;
  handoverById?: string;
  verifiedAt?: string;
  verifiedById?: string;
  customerAcceptedAt?: string;
  activatedAt?: string;
  billingCommencedAt?: string;
  billingReviewedById?: string;
  billingBasis?: BillingBasis;
  /** Short summary used by older lists. */
  materials: string;
  materialLines?: JobMaterial[];
  materialRequests?: MaterialRequest[];
  equipment?: JobEquipment[];
  notes?: JobNote[];
  hold?: JobHold;
  completion?: CompletionForm;
  verificationNote?: string;
  history?: JobEvent[];
}

export interface InventoryMovement {
  id: string;
  branchId: BranchId;
  zoneId?: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  type: 'Receipt' | 'Issue' | 'Transfer' | 'Return' | 'Adjustment' | 'Installation';
  from: string;
  to: string;
  jobId?: string;
  serviceChangeId?: string;
  serial?: string;
  serials?: string[];
  workOrderId?: string;
  customerId?: string;
  connectionId?: string;
  vendorId?: string;
  /** Delivery challan, GRN or transfer note number. */
  reference?: string;
  unitPrice?: number;
  technicianName?: string;
  ticketId?: string;
  reservationId?: string;
  returnId?: string;
  adjustmentId?: string;
  note?: string;
  at: string;
  byName: string;
}

export interface Invoice extends Located {
  id: string;
  billingAccountId: string;
  customerId?: string;
  associateId?: string;
  period: string;
  description: string;
  amount: number;
  credits: number;
  paidAmount: number;
  issuedAt: string;
  dueDate: string;
  customerSnapshot?: CustomerSnapshot;
  kind?: InvoiceKind;
  /** YYYY-MM service period for recurring charges; used to prevent duplicates. */
  periodKey?: string;
  connectionIds?: string[];
  lines?: InvoiceLine[];
  billingTerm?: BillingTerm;
  runId?: string;
  taxNote?: string;
  postedById?: string;
}

export interface Allocation {
  invoiceId: string;
  amount: number;
}

export interface Receipt extends Located {
  id: string;
  billingAccountId: string;
  amount: number;
  method: ReceiptMethod;
  reference: string;
  receivedAt: string;
  status: 'Pending Verification' | 'Verified' | 'Rejected' | 'Reversed';
  verifiedAt?: string;
  allocations: Allocation[];
  purpose?: ReceiptPurpose;
  payer?: string;
  collectorName?: string;
  evidence?: string;
  recordedById?: string;
  recordedAt?: string;
  verifiedById?: string;
  /** Collector's suggested allocation; Accounts decides on verification. */
  intendedInvoiceIds?: string[];
  note?: string;
  rejectReason?: string;
  reversedAt?: string;
  reversedAllocations?: Allocation[];
}

export interface ServiceChange extends Located {
  id: string;
  customerId: string;
  connectionId: string;
  type: ServiceChangeType;
  fromValue: string;
  toValue: string;
  reason: string;
  requestedAt: string;
  requestedById: string;
  /** Date the customer asked for. */
  requestedDate: string;
  /** Approved effective date — set only when the change is approved. Billing follows this date. */
  effectiveDate?: string;
  status: ServiceChangeStatus;
  technicalImpact?: TechnicalAssessment;
  commercialImpact?: CommercialImpact;
  approvalId?: string;
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
  cancelReason?: string;
  evidence?: ImplementationEvidence;
  workOrderId?: string;
  /** Tariff before and after an upgrade/downgrade, for effective-dated billing. */
  fromMrc?: number;
  toMrc?: number;
  fromBandwidth?: number;
  toBandwidth?: number;
  costBearer?: CostBearer;
  /** New equipment cost if IOL funds it. */
  equipmentCost?: number;
  /** One-time charge recovered from the customer for the change. */
  upgradeCharge?: number;
  /** Extra recurring delivery cost per month (upstream, NTTN) — negative when a downgrade saves cost. */
  recurringCostDelta?: number;
  // Shifting
  fromSiteId?: string;
  destination?: ShiftDestination;
  relocationCharge?: number;
  equipmentMovement?: string;
  interruptionHours?: number;
  relocationInvoiceId?: string;
  // Temporary stop (stop starts on the approved effective date)
  expectedResumption?: string;
  /** Monthly charge that continues while stopped (port retention etc). */
  continuingCharge?: number;
  reminderAt?: string;
  resumedAt?: string;
  resumptionId?: string;
  // Resumption
  stopChangeId?: string;
  // Discontinuation
  serviceStoppedAt?: string;
  closedAt?: string;
  closedById?: string;
  clearances?: {technical: ClearanceTask;accounts: ClearanceTask;};
}

export interface Ticket extends Located {
  id: string;
  customerId: string;
  siteId: string;
  connectionId?: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  /** Technician assigned. */
  assigneeName?: string;
  /** Created timestamp. */
  openedAt: string;
  /** Resolution target (before any policy-allowed pauses). */
  slaDueAt: string;
  resolvedAt?: string;
  source?: TicketSource;
  category?: IssueCategory;
  description?: string;
  callerName?: string;
  callerContact?: string;
  team?: SupportTeam;
  createdByName?: string;
  /** Set when the ticket came from a "Simulate incoming call/email" action. */
  simulated?: 'Call' | 'Email';
  responseDueAt?: string;
  firstResponseAt?: string;
  firstResponseByName?: string;
  firstResponseNote?: string;
  startedAt?: string;
  holds?: TicketHold[];
  escalations?: TicketEscalation[];
  attachments?: TicketAttachment[];
  resolution?: TicketResolution;
  previousResolutions?: TicketResolution[];
  closedAt?: string;
  closedByName?: string;
  reopenCount?: number;
  events?: TicketEvent[];
}

export interface Associate extends Located, AssociateProfile {
  id: string;
  name: string;
  nameBn: string;
  collectionModel: 'Centralised' | 'Decentralised' | 'Fixed Monthly';
  terms: string;
  revenueSharePct?: number;
  fixedMonthly?: number;
  subscribers: number;
  contactName: string;
  contactPhone: string;
  customerId?: string;
  billingAccountId: string;
  since: string;
  lastPayout?: {amount: number;at: string;};
}

export interface SalesAgent extends Located, AgentProfile {
  id: string;
  name: string;
  nameBn: string;
  phone: string;
  commissionRule: string;
  activations: number;
  commissionApprovedYtd: number;
  status: 'Active' | 'Suspended';
}

export type ApprovalType =
'Quotation' |
'Commission' |
'Credit Note' |
'Associate Payout' |
'Special Pricing' |
'OTC Reduction' |
'Credit Terms' |
'Agent Commission Terms' |
'Advance Exception' |
'Work Order Change' |
'Due Allow' |
'Billing Adjustment' |
'Service Change' |
'Clearance Exception' |
'Stock Adjustment' |
'Agent Reassignment';

export interface Approval extends Located {
  id: string;
  type: ApprovalType;
  title: string;
  detail: string;
  amount: number;
  entity: EntityRef;
  related: EntityRef[];
  requestedById: string;
  requestedAt: string;
  requiredPermission: Permission;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Returned';
  decidedById?: string;
  decidedAt?: string;
  /** Decision trail with mandatory comments. */
  history?: DecisionEvent[];
  /** Rule applied at decision time — preserved when rules later change. */
  ruleSnapshot?: RuleSnapshot;
  returned?: ReturnState;
  /** Quotation version this approval belongs to. */
  quotationVersion?: number;
  changeRequestId?: string;
  adjustmentId?: string;
  dueAllowId?: string;
  serviceChangeId?: string;
  clearanceSide?: 'technical' | 'accounts';
  stockAdjustmentId?: string;
  settlementId?: string;
  commissionProposalId?: string;
  reassignmentId?: string;
  agentSettlementId?: string;
}

export interface StoredNotification {
  id: string;
  title: string;
  detail: string;
  at: string;
  module: ModuleId;
  branchId: BranchId | null;
  requires?: Permission[];
  /** When set, only these users receive it (e.g. the customer's Account Manager). */
  forUserIds?: string[];
  entity: EntityRef;
  readBy: string[];
  priority?: 'High' | 'Normal' | 'Low';
  /** System notifications with the same key are created only once. */
  dedupeKey?: string;
  kind?: 'Handover' | 'Overdue' | 'Reminder' | 'Update';
}

export interface AuditEvent {
  id: string;
  at: string;
  actorName: string;
  actorId?: string;
  action: string;
  summary: string;
  entity: EntityRef;
  related: EntityRef[];
  /** Relevant field changes, e.g. status Pending → Approved. */
  changes?: {field: string;from?: string;to: string;}[];
}

export interface DemoDatabase {
  version: number;
  leads: Lead[];
  opportunities: Opportunity[];
  customers: Customer[];
  sites: Site[];
  connections: ServiceConnection[];
  billingAccounts: BillingAccount[];
  surveys: Survey[];
  quotations: Quotation[];
  workOrders: WorkOrder[];
  installationJobs: InstallationJob[];
  inventoryMovements: InventoryMovement[];
  invoices: Invoice[];
  receipts: Receipt[];
  serviceChanges: ServiceChange[];
  tickets: Ticket[];
  associates: Associate[];
  salesAgents: SalesAgent[];
  approvals: Approval[];
  notifications: StoredNotification[];
  auditEvents: AuditEvent[];
  users: DemoUser[];
  orgLevels: string[];
  orgNodes: OrgNode[];
  adminAreas: AdminArea[];
  operationalZones: OperationalZone[];
  approvalRules: ApprovalRule[];
  masterData: MasterDataItem[];
  policies: PolicySetting[];
  ownershipChanges: OwnershipChange[];
  crmStages: CrmStage[];
  tenders: Tender[];
  crmConflicts: CrmConflict[];
  fieldVisits: FieldVisit[];
  expenseClaims: ExpenseClaim[];
  salesTargets: SalesTarget[];
  profileCorrections: ProfileCorrection[];
  surveyBypasses: SurveyBypass[];
  stockItems: StockItem[];
  inventoryItems: InventoryItem[];
  associateSettlements: AssociateSettlement[];
  associateLedger: AssociateLedgerEntry[];
  settlementRules: SettlementRule[];
  agentAttributions: AgentAttribution[];
  attributionReassignments: AttributionReassignment[];
  commissionProposals: CommissionProposal[];
  commissionAccruals: CommissionAccrual[];
  agentSettlements: AgentSettlement[];
  equipmentUnits: EquipmentUnit[];
  stockReservations: StockReservation[];
  stockReturns: StockReturn[];
  stockAdjustments: StockAdjustment[];
  vendors: Vendor[];
  vendorPrices: VendorPrice[];
  taxTreatments: TaxTreatment[];
  quotePolicy: QuotePolicy;
  changeRequests: ChangeRequest[];
  billingAdjustments: BillingAdjustment[];
  dueAllows: DueAllow[];
  billingRuns: BillingRun[];
  suspensionReviews: SuspensionReview[];
  billingPolicy: BillingPolicy;
  dutyRoster: RosterEntry[];
  opsExpenses: OpsExpense[];
  recurringPayments: RecurringPayment[];
}