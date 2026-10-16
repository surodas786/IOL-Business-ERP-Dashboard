import type { ModuleId, Permission, Role } from '../types/erp';

export const MATRIX_ACTIONS = ['view', 'create', 'edit', 'submit', 'approve', 'export'] as const;
export type MatrixAction = (typeof MATRIX_ACTIONS)[number];
export type MatrixCell = 'allowed' | 'denied' | 'noAccess';

type ActionRules = Partial<Record<'create' | 'edit' | 'submit' | 'approve', Permission[]>>;

/** Which permissions unlock each action per module. A role needs module access plus any listed permission. */
const MODULE_RULES: Partial<Record<ModuleId, ActionRules>> = {
  crm: { create: ['createQuotation'], edit: ['createQuotation'], submit: ['createQuotation'] },
  field: { create: ['createQuotation', 'technicalConfig'], edit: ['createQuotation', 'technicalConfig'], submit: ['createQuotation', 'technicalConfig'], approve: ['approveExpense', 'approveFinancial'] },
  customers: { create: ['manageWorkOrders'], edit: ['manageWorkOrders', 'recordCollection'] },
  surveys: { create: ['createQuotation'], edit: ['technicalConfig'], submit: ['technicalConfig'] },
  quotations: { create: ['createQuotation', 'manageWorkOrders'], edit: ['createQuotation', 'manageWorkOrders'], submit: ['createQuotation'], approve: ['approveQuotation'] },
  installations: { create: ['manageWorkOrders'], edit: ['technicalConfig'], submit: ['technicalConfig'] },
  billing: { create: ['recordCollection'], edit: ['recordCollection'], submit: ['recordCollection'], approve: ['approveFinancial'] },
  serviceChanges: { create: ['createQuotation', 'manageWorkOrders', 'assignTickets'], edit: ['manageWorkOrders'], submit: ['createQuotation', 'assignTickets'], approve: ['technicalConfig', 'recordCollection'] },
  inventory: { create: ['manageStock'], edit: ['manageStock'], submit: ['manageStock'] },
  associates: { create: ['manageWorkOrders'], edit: ['manageWorkOrders'], submit: ['recordCollection'], approve: ['approveFinancial'] },
  agents: { create: ['manageWorkOrders'], edit: ['manageWorkOrders'], submit: ['manageWorkOrders'], approve: ['approveCommission'] },
  tickets: { create: ['assignTickets', 'createQuotation'], edit: ['assignTickets', 'technicalConfig'] },
  approvals: { approve: ['approveQuotation', 'approveFinancial', 'approveCommission'] },
  admin: { create: ['manageUsers'], edit: ['manageUsers'] }
};

/** Cells that carry financial authority — highlighted in the matrix. */
export const FINANCIAL_APPROVAL_CELLS: Partial<Record<ModuleId, MatrixAction[]>> = {
  billing: ['approve'],
  associates: ['approve'],
  agents: ['approve']
};

export function matrixCell(role: Role, module: ModuleId, action: MatrixAction): MatrixCell {
  const canView = role.modules.includes(module);
  if (!canView) return 'noAccess';
  if (action === 'view') return 'allowed';
  if (action === 'export') {
    const ok = role.permissions.includes('exportReports') || module === 'admin' && role.permissions.includes('manageUsers');
    return ok ? 'allowed' : 'denied';
  }
  const perms = MODULE_RULES[module]?.[action];
  return perms?.some((p) => role.permissions.includes(p)) ? 'allowed' : 'denied';
}

export const RECORD_SCOPES = [
{ id: 'own', label: 'Own records', help: 'Records the user created or is assigned as owner.' },
{ id: 'team', label: 'Assigned team', help: 'Own records plus those of people who report to them.' },
{ id: 'branch', label: 'Branch', help: 'Every record tagged to the user’s branch.' },
{ id: 'company', label: 'Authorised company-wide', help: 'All branches. Only for roles with company-wide authority.' }] as
const;

export const SUPERVISOR_POLICIES = [
{ id: 'direct', label: 'Direct reports only', help: 'Supervisors see records owned by people who report directly to them.' },
{ id: 'tree', label: 'Full reporting tree', help: 'Supervisors see records across every level beneath them.' },
{ id: 'branch', label: 'Supervisor’s branch', help: 'Supervisors see every record in their own station branch.' }] as
const;