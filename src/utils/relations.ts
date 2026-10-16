import { demoUsers } from '../data/users';
import { branches } from '../data/branches';
import { roles } from '../data/roles';
import { DEMO_NOW } from './format';
import type { DemoUser, ModuleId, Permission, Role, RoleId } from '../types/erp';
import type {
  ApprovalType,
  DemoDatabase,
  EntityRef,
  EntityType,
  Invoice,
  Receipt } from
'../types/records';

export const COLLECTION: Record<EntityType, keyof Omit<DemoDatabase, 'version' | 'orgLevels' | 'ownershipChanges'>> = {
  user: 'users',
  orgNode: 'orgNodes',
  adminArea: 'adminAreas',
  operationalZone: 'operationalZones',
  approvalRule: 'approvalRules',
  masterData: 'masterData',
  policy: 'policies',
  lead: 'leads',
  opportunity: 'opportunities',
  customer: 'customers',
  site: 'sites',
  connection: 'connections',
  billingAccount: 'billingAccounts',
  survey: 'surveys',
  quotation: 'quotations',
  workOrder: 'workOrders',
  installationJob: 'installationJobs',
  inventoryMovement: 'inventoryMovements',
  invoice: 'invoices',
  receipt: 'receipts',
  serviceChange: 'serviceChanges',
  ticket: 'tickets',
  associate: 'associates',
  salesAgent: 'salesAgents',
  approval: 'approvals',
  notification: 'notifications',
  auditEvent: 'auditEvents',
  tender: 'tenders',
  fieldVisit: 'fieldVisits',
  expenseClaim: 'expenseClaims',
  opsExpense: 'opsExpenses'
};

export const ENTITY_LABEL: Record<EntityType, string> = {
  tender: 'Tender',
  fieldVisit: 'Field visit',
  expenseClaim: 'Expense claim',
  opsExpense: 'Operational payment',
  lead: 'Lead',
  opportunity: 'Opportunity',
  customer: 'Customer',
  site: 'Site',
  connection: 'Service connection',
  billingAccount: 'Billing account',
  survey: 'Survey',
  quotation: 'Quotation',
  workOrder: 'Work order',
  installationJob: 'Installation job',
  inventoryMovement: 'Inventory movement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  serviceChange: 'Service change',
  ticket: 'Ticket',
  associate: 'Associate',
  salesAgent: 'Sales agent',
  approval: 'Approval',
  notification: 'Notification',
  auditEvent: 'Audit event',
  user: 'User',
  orgNode: 'Organisation node',
  adminArea: 'Administrative area',
  operationalZone: 'Operational zone',
  approvalRule: 'Approval rule',
  masterData: 'Master data item',
  policy: 'Policy setting'
};

/** Record types that belong to Administration configuration. */
export const ADMIN_ENTITY_TYPES: EntityType[] = ['user', 'orgNode', 'adminArea', 'operationalZone', 'approvalRule', 'masterData', 'policy'];

export const ENTITY_MODULE: Record<EntityType, ModuleId> = {
  tender: 'crm',
  fieldVisit: 'field',
  expenseClaim: 'field',
  opsExpense: 'finance',
  lead: 'crm',
  opportunity: 'crm',
  customer: 'customers',
  site: 'customers',
  connection: 'customers',
  billingAccount: 'billing',
  survey: 'surveys',
  quotation: 'quotations',
  workOrder: 'quotations',
  installationJob: 'installations',
  inventoryMovement: 'inventory',
  invoice: 'billing',
  receipt: 'billing',
  serviceChange: 'serviceChanges',
  ticket: 'tickets',
  associate: 'associates',
  salesAgent: 'agents',
  approval: 'approvals',
  notification: 'dashboard',
  auditEvent: 'admin',
  user: 'admin',
  orgNode: 'admin',
  adminArea: 'admin',
  operationalZone: 'admin',
  approvalRule: 'admin',
  masterData: 'admin',
  policy: 'admin'
};

/** Extra permissions needed to open a record type beyond module access (demo-only rule). */
export const ENTITY_REQUIRES: Partial<Record<EntityType, Permission[]>> = {
  billingAccount: ['viewFinancials'],
  invoice: ['viewFinancials'],
  receipt: ['viewFinancials'],
  opsExpense: ['viewFinancials']
};

export const APPROVAL_MODULE: Record<ApprovalType, ModuleId> = {
  Quotation: 'quotations',
  Commission: 'agents',
  'Credit Note': 'billing',
  'Associate Payout': 'associates',
  'Special Pricing': 'quotations',
  'OTC Reduction': 'quotations',
  'Credit Terms': 'quotations',
  'Agent Commission Terms': 'quotations',
  'Advance Exception': 'quotations',
  'Work Order Change': 'quotations',
  'Due Allow': 'billing',
  'Billing Adjustment': 'billing',
  'Service Change': 'serviceChanges',
  'Clearance Exception': 'serviceChanges',
  'Stock Adjustment': 'inventory',
  'Agent Reassignment': 'agents'
};

export const APPROVAL_REQUIRES: Record<ApprovalType, Permission[]> = {
  Quotation: ['viewPipeline'],
  Commission: ['viewCommissions'],
  'Credit Note': ['viewFinancials'],
  'Associate Payout': ['viewFinancials'],
  'Special Pricing': ['viewPipeline'],
  'OTC Reduction': ['viewPipeline'],
  'Credit Terms': ['viewFinancials'],
  'Agent Commission Terms': ['viewCommissions'],
  'Advance Exception': ['viewFinancials'],
  'Work Order Change': ['viewPipeline'],
  'Due Allow': ['viewFinancials'],
  'Billing Adjustment': ['viewFinancials'],
  'Service Change': ['viewPipeline'],
  'Clearance Exception': [],
  'Stock Adjustment': [],
  'Agent Reassignment': []
};

export const APPROVAL_BLOCKED_NOTE: Record<ApprovalType, string> = {
  Quotation: 'Awaiting Management or Business Head approval',
  Commission: 'Requires Finance Approver sign-off',
  'Credit Note': 'Requires Finance Approver sign-off',
  'Associate Payout': 'Requires Finance Approver sign-off',
  'Special Pricing': 'Requires the configured pricing authority',
  'OTC Reduction': 'Requires the configured pricing authority',
  'Credit Terms': 'Requires Finance Approver sign-off',
  'Agent Commission Terms': 'Business Head (Sales Head) only',
  'Advance Exception': 'Requires Finance Approver sign-off',
  'Work Order Change': 'Requires Management or Business Head approval',
  'Due Allow': 'Requires Finance Approver sign-off',
  'Billing Adjustment': 'Requires Finance Approver sign-off',
  'Service Change': 'Requires Business Head or Management approval',
  'Clearance Exception': 'Technical: Business Head or Management · Accounts: Finance Approver',
  'Stock Adjustment': 'Requires Finance Approver sign-off',
  'Agent Reassignment': 'Business Head (Sales Head) only'
};

export function sameRef(a: EntityRef | undefined, b: EntityRef | undefined): boolean {
  return !!a && !!b && a.type === b.type && a.id === b.id;
}

export function findRecord(db: DemoDatabase, ref: EntityRef): Record<string, unknown> | undefined {
  const list = db[COLLECTION[ref.type]] as unknown as Array<{id: string;}>;
  return list.find((r) => r.id === ref.id) as Record<string, unknown> | undefined;
}

/**
 * Current user directory. DataProvider keeps this in sync with the shared database so that
 * names of created, reassigned or deactivated accounts still resolve on historical records.
 */
let userDirectory: DemoUser[] = demoUsers;

export function setUserDirectory(users: DemoUser[]) {
  userDirectory = users;
}

export function userName(id?: string | null): string {
  const u = userDirectory.find((x) => x.id === id);
  if (!u) return '—';
  return u.status === 'Inactive' ? `${u.name} (inactive)` : u.name;
}

export function roleLabel(id: RoleId): string {
  return roles.find((r) => r.id === id)?.label ?? id;
}

export function getRoleById(id: RoleId): Role {
  return roles.find((r) => r.id === id)!;
}

export function branchName(id?: string | null): string {
  return branches.find((b) => b.id === id)?.name ?? 'All branches';
}

export function zoneName(id?: string): string {
  for (const b of branches) {
    const z = b.zones.find((zone) => zone.id === id);
    if (z) return z.name;
  }
  return '—';
}

export function customerName(db: DemoDatabase, id?: string): string {
  return db.customers.find((c) => c.id === id)?.name ?? '—';
}

export function accountHolderName(db: DemoDatabase, billingAccountId: string): string {
  const ba = db.billingAccounts.find((b) => b.id === billingAccountId);
  if (!ba) return '—';
  if (ba.customerId) return customerName(db, ba.customerId);
  return db.associates.find((a) => a.id === ba.associateId)?.name ?? ba.name;
}

export function invoiceNet(inv: Invoice): number {
  return inv.amount - inv.credits;
}

export function invoiceOutstanding(inv: Invoice): number {
  return Math.max(0, invoiceNet(inv) - inv.paidAmount);
}

export function invoiceStatus(inv: Invoice): 'Paid' | 'Partially Paid' | 'Overdue' | 'Unpaid' {
  const outstanding = invoiceOutstanding(inv);
  if (outstanding === 0) return 'Paid';
  if (new Date(inv.dueDate).getTime() < DEMO_NOW.getTime()) return 'Overdue';
  if (inv.paidAmount > 0) return 'Partially Paid';
  return 'Unpaid';
}

export function receiptUnallocated(r: Receipt): number {
  return r.amount - r.allocations.reduce((s, a) => s + a.amount, 0);
}

export function accountOutstanding(db: DemoDatabase, billingAccountId: string): number {
  return db.invoices.filter((i) => i.billingAccountId === billingAccountId).reduce((s, i) => s + invoiceOutstanding(i), 0);
}

export function accountAdvance(db: DemoDatabase, billingAccountId: string): number {
  return db.receipts
  // Security deposits are held separately and never count as an advance.
  .filter((r) => r.billingAccountId === billingAccountId && r.status === 'Verified' && r.purpose !== 'Security deposit').
  reduce((s, r) => s + receiptUnallocated(r), 0);
}

/** Verified security deposits held for the account. Never applied to monthly charges automatically. */
export function accountDeposit(db: DemoDatabase, billingAccountId: string): number {
  return db.receipts.filter((r) => r.billingAccountId === billingAccountId && r.status === 'Verified' && r.purpose === 'Security deposit').reduce((s, r) => s + r.amount, 0);
}

/** Short human name for any record, used in links and labels. */
export function recordName(db: DemoDatabase, ref: EntityRef): string {
  switch (ref.type) {
    case 'lead':
      return db.leads.find((r) => r.id === ref.id)?.company ?? ref.id;
    case 'opportunity':
      return db.opportunities.find((r) => r.id === ref.id)?.title ?? ref.id;
    case 'customer':
      return customerName(db, ref.id);
    case 'site':{
        const s = db.sites.find((r) => r.id === ref.id);
        return s ? `${s.name}, ${customerName(db, s.customerId)}` : ref.id;
      }
    case 'connection':{
        const c = db.connections.find((r) => r.id === ref.id);
        if (!c) return ref.id;
        if (c.product && ['CCTV', 'LAN', 'Access Control'].includes(c.product)) return `${c.product} (${c.medium ?? 'Cat6'})`;
        return `${c.bandwidthMbps >= 1000 ? `${c.bandwidthMbps / 1000} Gbps` : `${c.bandwidthMbps} Mbps`} ${c.serviceType}`;
      }
    case 'billingAccount':
      return db.billingAccounts.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'survey':{
        const s = db.surveys.find((r) => r.id === ref.id);
        const opp = db.opportunities.find((o) => o.id === s?.opportunityId);
        return opp ? recordName(db, { type: 'lead', id: opp.leadId }) : ref.id;
      }
    case 'quotation':{
        const q = db.quotations.find((r) => r.id === ref.id);
        const opp = db.opportunities.find((o) => o.id === q?.opportunityId);
        return opp ? recordName(db, { type: 'lead', id: opp.leadId }) : ref.id;
      }
    case 'workOrder':{
        const w = db.workOrders.find((r) => r.id === ref.id);
        return w ? `${w.type} — ${customerName(db, w.customerId)}` : ref.id;
      }
    case 'installationJob':{
        const j = db.installationJobs.find((r) => r.id === ref.id);
        return j ? customerName(db, j.customerId) : ref.id;
      }
    case 'inventoryMovement':
      return db.inventoryMovements.find((r) => r.id === ref.id)?.itemName ?? ref.id;
    case 'invoice':{
        const i = db.invoices.find((r) => r.id === ref.id);
        return i ? `${i.period} — ${accountHolderName(db, i.billingAccountId)}` : ref.id;
      }
    case 'receipt':{
        const r = db.receipts.find((x) => x.id === ref.id);
        return r ? accountHolderName(db, r.billingAccountId) : ref.id;
      }
    case 'serviceChange':{
        const s = db.serviceChanges.find((r) => r.id === ref.id);
        return s ? `${s.type} — ${customerName(db, s.customerId)}` : ref.id;
      }
    case 'ticket':
      return db.tickets.find((r) => r.id === ref.id)?.subject ?? ref.id;
    case 'associate':
      return db.associates.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'salesAgent':
      return db.salesAgents.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'approval':
      return db.approvals.find((r) => r.id === ref.id)?.title ?? ref.id;
    case 'notification':
      return db.notifications.find((r) => r.id === ref.id)?.title ?? ref.id;
    case 'auditEvent':
      return db.auditEvents.find((r) => r.id === ref.id)?.action ?? ref.id;
    case 'user':
      return db.users.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'orgNode':
      return db.orgNodes.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'adminArea':
      return db.adminAreas.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'operationalZone':
      return db.operationalZones.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'approvalRule':
      return db.approvalRules.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'masterData':
      return db.masterData.find((r) => r.id === ref.id)?.label ?? ref.id;
    case 'policy':
      return db.policies.find((r) => r.id === ref.id)?.name ?? ref.id;
    case 'tender':{
        const t = db.tenders.find((r) => r.id === ref.id);
        return t ? `${t.reference} — ${t.issuingOrganisation}` : ref.id;
      }
    case 'fieldVisit':{
        const v = db.fieldVisits.find((r) => r.id === ref.id);
        return v ? `Visit — ${recordName(db, v.subject)}` : ref.id;
      }
    case 'expenseClaim':{
        const c = db.expenseClaims.find((r) => r.id === ref.id);
        return c ? `${c.id} — ${userName(c.claimantId)}` : ref.id;
      }
  }
}

/** Next sequential ID for a prefix, e.g. nextId(['WO-2026-0151'], 'WO-2026-', 4) → 'WO-2026-0152'. */
export function nextId(list: Array<{id: string;}>, prefix: string, pad: number): string {
  const max = list.
  filter((r) => r.id.startsWith(prefix)).
  reduce((m, r) => Math.max(m, Number(r.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}