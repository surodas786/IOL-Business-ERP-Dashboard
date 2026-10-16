import { formatBDT } from './format';
import { roleLabel } from './relations';
import type { ApprovalRule } from '../types/admin';
import type { Approval, DemoDatabase } from '../types/records';
import type { Permission, RoleId } from '../types/erp';
import type { RuleSnapshot } from '../types/approvals';

export function ruleCondition(rule: ApprovalRule): string {
  if (rule.comparator === 'any' || rule.thresholdBdt === undefined) return 'Any amount';
  return rule.comparator === 'above' ? `Above ${formatBDT(rule.thresholdBdt)}` : `Up to ${formatBDT(rule.thresholdBdt)}`;
}

/** The configured rule that governs a pending approval, if any. */
export function ruleForApproval(db: DemoDatabase, approval: Approval): ApprovalRule | undefined {
  return db.approvalRules.find((r) => {
    if (r.approvalType !== approval.type) return false;
    if (r.comparator === 'any' || r.thresholdBdt === undefined) return true;
    return r.comparator === 'above' ? approval.amount > r.thresholdBdt : approval.amount <= r.thresholdBdt;
  });
}

/** Freezes the governing rule at decision time so later rule edits never rewrite completed decisions. */
export function snapshotRule(rule: ApprovalRule | undefined, fallback: {permission: Permission;roles: RoleId[];}, at: string): RuleSnapshot {
  return rule ?
  { ruleId: rule.id, name: rule.name, approverRoles: [...rule.approverRoles], requiredPermission: rule.requiredPermission, condition: ruleCondition(rule), capturedAt: at } :
  { name: 'Default authority (no configured rule)', approverRoles: [...fallback.roles], requiredPermission: fallback.permission, condition: 'Any amount', capturedAt: at };
}

export function approverNote(rule: ApprovalRule): string {
  const who = rule.approverRoles.map(roleLabel).join(' or ');
  return `Requires ${who} approval${rule.comparator === 'any' ? '' : ` (${ruleCondition(rule).toLowerCase()})`}`;
}