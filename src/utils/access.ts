import { APPROVAL_REQUIRES, ENTITY_MODULE, ENTITY_REQUIRES, findRecord } from './relations';
import type { BranchId, DemoUser, ModuleId, Permission, Role } from '../types/erp';
import type { Approval, DemoDatabase, EntityRef } from '../types/records';

interface Scoped {
  module: ModuleId;
  branchId: BranchId | null;
  requires?: Permission[];
}

// NOTE: These checks only shape what the demo shows. They are not a security control.

export function hasPermission(role: Role, permission: Permission): boolean {
  return role.permissions.includes(permission);
}

export function canAccessModule(role: Role, module: ModuleId): boolean {
  return role.modules.includes(module);
}

export function inUserScope(user: DemoUser, branchId: BranchId | null | undefined): boolean {
  return !user.branch || !branchId || branchId === user.branch;
}

/** Module access, required permissions and branch scope. */
export function isVisibleTo(item: Scoped, user: DemoUser, role: Role): boolean {
  if (!canAccessModule(role, item.module)) return false;
  if (item.requires && !item.requires.every((p) => hasPermission(role, p))) return false;
  return inUserScope(user, item.branchId);
}

/** Whether the active demo account may open a record's detail view. */
export function canOpenRecord(db: DemoDatabase, ref: EntityRef, user: DemoUser, role: Role): boolean {
  const record = findRecord(db, ref) as {branchId?: BranchId | null;} | undefined;
  if (!record) return false;
  let requires = ENTITY_REQUIRES[ref.type];
  if (ref.type === 'approval') requires = APPROVAL_REQUIRES[(record as unknown as Approval).type];
  return isVisibleTo({ module: ENTITY_MODULE[ref.type], branchId: record.branchId ?? null, requires }, user, role);
}