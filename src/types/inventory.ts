import type { BranchId } from './erp';

/** Inventory and equipment types. FICTIONAL DEMO — production must enforce these rules on the server. */

export type TrackingMode = 'Serial' | 'Quantity';

export const ITEM_CATEGORIES = ['CPE', 'Optics', 'Network equipment', 'Fibre & cable', 'Passive & hardware', 'Security & CCTV'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Item master. Stock per warehouse lives in StockItem (one row per SKU and warehouse). */
export interface InventoryItem {
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  tracking: TrackingMode;
  /** IOL expects it back when a service ends (ONTs, radios, routers). */
  returnable: boolean;
  /** Serial-tracked equipment only — drives the expected replacement date. */
  usableLifeMonths?: number;
  /** Available quantity at or below this is flagged per warehouse. */
  reorderLevel: number;
  description?: string;
  active: boolean;
}

export const OWNERSHIPS = ['IOL-owned', 'Customer-owned', 'Rented', 'Associate-owned'] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export type UnitStatus = 'In Stock' | 'Issued' | 'Installed' | 'Receivable' | 'Awaiting Inspection' | 'Damaged' | 'Lost';

/** States in which a serial is actively allocated and cannot be allocated again. */
export const ACTIVE_UNIT_STATUSES: UnitStatus[] = ['Issued', 'Installed', 'Receivable', 'Awaiting Inspection'];

export interface UnitEvent {
  at: string;
  byName: string;
  event: string;
  detail: string;
}

/** One serial-tracked piece of equipment. */
export interface EquipmentUnit {
  id: string;
  sku: string;
  /** Only for equipment not in the item master (e.g. customer-supplied). */
  itemName?: string;
  serial: string;
  status: UnitStatus;
  ownership: Ownership;
  /** Owner when not IOL, e.g. the associate's name. */
  ownerName?: string;
  /** Home warehouse. Empty for customer-owned equipment never held by IOL. */
  warehouse: string;
  branchId: BranchId;
  technicianName?: string;
  jobId?: string;
  workOrderId?: string;
  serviceChangeId?: string;
  customerId?: string;
  siteId?: string;
  connectionId?: string;
  deployedAt?: string;
  receivedAt?: string;
  vendorId?: string;
  unitCost?: number;
  /** Set when a discontinuation makes returnable IOL equipment due back. */
  receivableSince?: string;
  history: UnitEvent[];
}

export interface StockReservation {
  id: string;
  sku: string;
  warehouse: string;
  quantity: number;
  /** Quantity already issued against this reservation. */
  issued: number;
  status: 'Active' | 'Fulfilled' | 'Released';
  jobId?: string;
  workOrderId?: string;
  serviceChangeId?: string;
  customerId?: string;
  connectionId?: string;
  note?: string;
  at: string;
  byName: string;
  releasedReason?: string;
  releasedAt?: string;
  branchId: BranchId;
}

export const RETURN_SOURCES = ['Technician (unused)', 'Customer site', 'Discontinuation'] as const;
export type ReturnSource = (typeof RETURN_SOURCES)[number];

export interface ReturnInspection {
  at: string;
  byName: string;
  good: number;
  damaged: number;
  serialOutcomes?: Record<string, 'Good' | 'Damaged'>;
  notes: string;
}

/** Physical return. Stock is restored only after inspection. */
export interface StockReturn {
  id: string;
  sku: string;
  warehouse: string;
  quantity: number;
  serials: string[];
  source: ReturnSource;
  fromName: string;
  jobId?: string;
  serviceChangeId?: string;
  customerId?: string;
  connectionId?: string;
  receivedAt: string;
  receivedBy: string;
  status: 'Awaiting Inspection' | 'Inspected';
  inspection?: ReturnInspection;
  branchId: BranchId;
}

export const ADJUSTMENT_KINDS = ['Damaged', 'Lost', 'Found', 'Count correction'] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

export interface StockAdjustment {
  id: string;
  sku: string;
  warehouse: string;
  kind: AdjustmentKind;
  direction: 'Increase' | 'Decrease';
  quantity: number;
  serials: string[];
  reason: string;
  requestedById: string;
  requestedAt: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  approvalId: string;
  decidedById?: string;
  decidedAt?: string;
  branchId: BranchId;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  phone: string;
}

export interface PriceBreak {
  minQty: number;
  unitPrice: number;
}

/** One purchase price point. Full procurement (POs, payments) is outside the demo. */
export interface VendorPrice {
  id: string;
  vendorId: string;
  sku: string;
  purchasedAt: string;
  quantity: number;
  unitPrice: number;
  reference: string;
  /** Vendor's quoted bulk price breaks at the time of purchase. */
  breaks: PriceBreak[];
}