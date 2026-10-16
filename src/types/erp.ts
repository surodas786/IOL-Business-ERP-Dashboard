import type { LucideIcon } from 'lucide-react';

export type RoleId =
'management' |
'businessHead' |
'salesExecutive' |
'accountManager' |
'backOffice' |
'technicalSupervisor' |
'fieldTechnician' |
'inventoryOfficer' |
'accountsOfficer' |
'financeApprover' |
'systemAdmin' |
'supportStaff';

export type ModuleId =
'dashboard' |
'crm' |
'field' |
'customers' |
'surveys' |
'quotations' |
'installations' |
'billing' |
'serviceChanges' |
'inventory' |
'associates' |
'agents' |
'tickets' |
'approvals' |
'finance' |
'reports' |
'admin';

export type Permission =
'viewFinancials' |
'viewPipeline' |
'viewMargins' |
'viewCommissions' |
'approveQuotation' |
'approveCommission' |
'approveFinancial' |
'recordCollection' |
'technicalConfig' |
'assignTickets' |
'manageStock' |
'manageUsers' |
'manageWorkOrders' |
'createQuotation' |
'exportReports'
/** Resolve duplicate/assignment conflicts, reassign opportunities and configure pipeline stages. */ |
'manageSalesTeam'
/** Approve expense claims of direct reports (never one's own). */ |
'approveExpense'
/** Record payment of approved expense claims. */ |
'payExpense'
/** Approve agent commission terms on quotations (Business Head / Sales Head only). */ |
'approveAgentCommission' |
'allBranches';

export type BranchId = 'dhaka-north' | 'dhaka-south' | 'chattogram' | 'sylhet';

export interface Role {
  id: RoleId;
  label: string;
  modules: ModuleId[];
  permissions: Permission[];
  can: string[];
  cannot: string[];
}

export type ScopeType = 'company' | 'branch' | 'zones';

export interface DemoUser {
  id: string;
  name: string;
  nameBn: string;
  initials: string;
  /** Exactly one role per account. */
  role: RoleId;
  /** Effective data branch derived from the operational scope; null = authorised company-wide. */
  branch: BranchId | null;
  email: string;
  phone: string;
  departmentId: string;
  stationBranchId: BranchId;
  scopeType: ScopeType;
  zoneIds: string[];
  managerId: string | null;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Branch {
  id: BranchId;
  name: string;
  nameBn: string;
  color: string;
  address: string;
  warehouse: string;
  fieldTeamLead: string;
  fieldTeamUserId?: string;
  zones: Zone[];
}

export type MetricKey =
'mrc' |
'billed' |
'collected' |
'pipeline' |
'activeLinks' |
'installsOpen' |
'ticketsOpen';

export interface BaselineZoneMetrics extends Record<MetricKey, number> {
  zoneId: string;
  branchId: BranchId;
}

export interface ZoneMetrics extends BaselineZoneMetrics {
  openTasks: number;
}

export type Severity = 'critical' | 'warning' | 'info' | 'neutral';

export interface NavItem {
  id: ModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}