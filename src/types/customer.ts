import type { BranchId } from './erp';
import type { DecisionEvent, ReturnState } from './approvals';

/** Customer categories used on the customer profile (separate from CRM lead categories). */
export const CUSTOMER_PROFILE_CATEGORIES = ['Bank', 'Corporate', 'Associate/MAC', 'Bandwidth', 'Government', 'Home', 'SOHO'] as const;
export type CustomerProfileCategory = (typeof CUSTOMER_PROFILE_CATEGORIES)[number];

/** Service products are maintained separately from the delivery medium. */
export const SERVICE_PRODUCTS = ['Internet', 'IP Transit', 'Data Connectivity', 'CCTV', 'LAN', 'Access Control'] as const;
export type ServiceProduct = (typeof SERVICE_PRODUCTS)[number];

export const DELIVERY_MEDIA = ['Fibre', 'Radio', 'Cat6'] as const;
export type DeliveryMedium = (typeof DELIVERY_MEDIA)[number];

/** Products sold by bandwidth; the others are managed services. */
export const BANDWIDTH_PRODUCTS: ServiceProduct[] = ['Internet', 'IP Transit', 'Data Connectivity'];

export type ContactRole = 'Primary' | 'Technical' | 'Billing' | 'Authorised';
export const CONTACT_ROLES: ContactRole[] = ['Primary', 'Technical', 'Billing', 'Authorised'];

export interface CustomerContact {
  id: string;
  role: ContactRole;
  name: string;
  nameBn?: string;
  designation: string;
  phone: string;
  email: string;
}

/** identity = trade licence, TIN, NID; payment = bank/MFS instructions. Both are restricted. */
export type DocumentSensitivity = 'identity' | 'payment' | 'general';

export interface CustomerDocument {
  id: string;
  type: string;
  fileName: string;
  /** Number or account reference held on the document. */
  reference: string;
  sensitivity: DocumentSensitivity;
  uploadedAt: string;
  byId: string;
}

/** Stage a profile was submitted into. Later stages (Work Order, Active) are derived from records. */
export type SubmittedStage = 'Draft' | 'Survey' | 'Negotiation';
export type ProfileStage = SubmittedStage | 'Work Order' | 'Active';

/** Core fields locked once a profile leaves Draft. */
export const CORRECTABLE_FIELDS = ['name', 'nameBn', 'category', 'registeredAddress', 'tradeLicenceNo', 'tin'] as const;
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

export const FIELD_LABEL: Record<CorrectableField, string> = {
  name: 'Legal name',
  nameBn: 'Legal name (Bangla)',
  category: 'Customer category',
  registeredAddress: 'Registered address',
  tradeLicenceNo: 'Trade licence no.',
  tin: 'TIN'
};

/** Identity fields that are restricted like identity documents. */
export const RESTRICTED_FIELDS: CorrectableField[] = ['tradeLicenceNo', 'tin'];

export interface ProfileCorrection {
  id: string;
  customerId: string;
  field: CorrectableField;
  oldValue: string;
  proposedValue: string;
  reason: string;
  requestedById: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decidedById?: string;
  decidedAt?: string;
  decisionNote?: string;
  /** Documents frozen (snapshot taken) when the correction was applied. */
  frozenDocs?: string[];
  /** Sent back to the requester from the Approvals centre. */
  returned?: ReturnState;
  centreHistory?: DecisionEvent[];
  branchId: BranchId;
  zoneId: string;
}

/** Customer identity as it stood when a quotation, work order or invoice was issued. */
export interface CustomerSnapshot {
  name: string;
  nameBn: string;
  category: string;
  registeredAddress: string;
  capturedAt: string;
}