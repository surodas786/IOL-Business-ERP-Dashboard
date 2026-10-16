import type { BranchId, Permission, RoleId } from './erp';
import type { ApprovalType, EntityRef } from './records';

export type RecordScope = 'own' | 'team' | 'branch' | 'company';

export interface OrgNode {
  id: string;
  name: string;
  nameBn?: string;
  /** 0 = top level; label comes from the configured level names. */
  level: number;
  parentId: string | null;
}

export type AdminAreaLevel = 'Division' | 'District' | 'Upazila / Thana';

export interface AdminArea {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  level: AdminAreaLevel;
  parentId: string | null;
}

export interface OperationalZone {
  id: string;
  name: string;
  branchId: BranchId;
  adminAreaIds: string[];
  status: 'Active' | 'Inactive';
}

export interface ApprovalRule {
  id: string;
  name: string;
  approvalType: ApprovalType | 'Disconnection clearance' | 'Role change';
  comparator: 'any' | 'upTo' | 'above';
  thresholdBdt?: number;
  requiredPermission: Permission;
  approverRoles: RoleId[];
  slaHours: number;
  enforcedInDemo: boolean;
  note?: string;
}

export interface MasterDataItem {
  id: string;
  category: string;
  code: string;
  label: string;
  labelBn: string;
  active: boolean;
}

export interface PolicySetting {
  id: string;
  name: string;
  value: string;
  status: 'Confirmed' | 'Awaiting IOL confirmation';
}

export interface OwnershipChange {
  id: string;
  record: EntityRef;
  field: 'Owner' | 'Account manager' | 'Reporting manager';
  fromUserId: string;
  toUserId: string;
  at: string;
  byUserId: string;
}