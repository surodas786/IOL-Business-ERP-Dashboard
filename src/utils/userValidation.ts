import { branches } from '../data/branches';
import { getRoleById } from './relations';
import type { BranchId, DemoUser, Permission, RoleId, ScopeType } from '../types/erp';
import type { DemoDatabase } from '../types/records';

export interface UserDraft {
  id?: string;
  name: string;
  nameBn: string;
  email: string;
  phone: string;
  /** A single role — the form and the data model only ever hold one. */
  role: RoleId | '';
  departmentId: string;
  stationBranchId: BranchId | '';
  scopeType: ScopeType;
  scopeBranchId: BranchId | '';
  zoneIds: string[];
  managerId: string;
  status: 'Active' | 'Inactive';
}

export type DraftErrors = Partial<Record<keyof UserDraft | 'form', string>>;

export const FINANCIAL_APPROVAL_PERMISSIONS: Permission[] = ['approveFinancial', 'approveCommission', 'approveAgentCommission'];

export function grantsFinancialApproval(role: RoleId): boolean {
  return getRoleById(role).permissions.some((p) => FINANCIAL_APPROVAL_PERMISSIONS.includes(p));
}

export function normalisePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

export function zoneBranch(zoneId: string): BranchId | undefined {
  return branches.find((b) => b.zones.some((z) => z.id === zoneId))?.id;
}

/** IDs of everyone below a user in the reporting line. */
export function reportingDescendants(users: DemoUser[], userId: string): Set<string> {
  const out = new Set<string>();
  const walk = (id: string) => {
    users.filter((u) => u.managerId === id).forEach((u) => {
      if (!out.has(u.id)) {
        out.add(u.id);
        walk(u.id);
      }
    });
  };
  walk(userId);
  return out;
}

export function draftFromUser(u: DemoUser): UserDraft {
  return {
    id: u.id,
    name: u.name,
    nameBn: u.nameBn,
    email: u.email,
    phone: u.phone,
    role: u.role,
    departmentId: u.departmentId,
    stationBranchId: u.stationBranchId,
    scopeType: u.scopeType,
    scopeBranchId: u.scopeType === 'branch' ? u.branch ?? '' : '',
    zoneIds: u.zoneIds,
    managerId: u.managerId ?? '',
    status: u.status
  };
}

export const EMPTY_DRAFT: UserDraft = {
  name: '',
  nameBn: '',
  email: '',
  phone: '',
  role: '',
  departmentId: '',
  stationBranchId: '',
  scopeType: 'branch',
  scopeBranchId: '',
  zoneIds: [],
  managerId: '',
  status: 'Active'
};

/** Validation shared by the user form and the administration reducer. */
export function validateUserDraft(db: DemoDatabase, draft: UserDraft, actorId: string): DraftErrors {
  const e: DraftErrors = {};
  const existing = draft.id ? db.users.find((u) => u.id === draft.id) : undefined;

  if (!draft.name.trim()) e.name = 'Enter the person’s name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) e.email = 'Enter a valid email address.';else
  if (db.users.some((u) => u.id !== draft.id && u.email.toLowerCase() === draft.email.trim().toLowerCase()))
  e.email = 'This email already has an account. One person holds one account, and each account has exactly one role.';
  if (!/^(\+?880|0)1[3-9]\d{8}$/.test(normalisePhone(draft.phone))) e.phone = 'Use a Bangladesh mobile number, e.g. +880 1712-345678.';
  if (!draft.role) e.role = 'Choose exactly one role.';
  if (!db.orgNodes.some((n) => n.id === draft.departmentId)) e.departmentId = 'Choose a department.';
  if (!draft.stationBranchId) e.stationBranchId = 'Choose the station or branch.';

  if (draft.scopeType === 'company') {
    if (draft.role && !getRoleById(draft.role).permissions.includes('allBranches'))
    e.scopeType = 'Company-wide scope needs a role with authorised company-wide access.';
  } else if (draft.scopeType === 'branch') {
    if (!draft.scopeBranchId) e.scopeType = 'Choose the branch this user may work in.';
  } else {
    const zoneBranches = new Set(draft.zoneIds.map(zoneBranch));
    if (draft.zoneIds.length === 0) e.scopeType = 'Choose at least one operational zone.';else
    if (zoneBranches.size > 1) e.scopeType = 'Zones must all belong to one branch.';
  }

  if (draft.managerId) {
    const manager = db.users.find((u) => u.id === draft.managerId);
    if (!manager || manager.status !== 'Active') e.managerId = 'The reporting manager must be an active user.';else
    if (draft.id && (draft.managerId === draft.id || reportingDescendants(db.users, draft.id).has(draft.managerId)))
    e.managerId = 'This would create a reporting loop.';
  }

  if (existing && existing.id === actorId) {
    if (draft.role && draft.role !== existing.role && grantsFinancialApproval(draft.role))
    e.role = 'You can’t grant yourself financial approval. Another administrator must make this change under the role-change approval rule.';
    if (draft.status === 'Inactive') e.status = 'You can’t deactivate your own account.';
  }
  if (existing && existing.status === 'Active' && draft.status === 'Inactive' && existing.id !== actorId)
  e.status = 'Use “Deactivate” so open work is handed over and ownership history is kept.';

  return e;
}