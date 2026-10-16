import { hasPermission } from './access';
import { recordName } from './relations';
import type { Role } from '../types/erp';
import type { Customer, DemoDatabase, EntityRef, ServiceConnection } from '../types/records';
import {
  BANDWIDTH_PRODUCTS,
  type CorrectableField,
  type CustomerContact,
  type CustomerProfileCategory,
  type CustomerSnapshot,
  type DeliveryMedium,
  type ProfileStage,
  type ServiceProduct } from
'../types/customer';

// NOTE: Demo-only visibility rules. Production access must also be enforced on the server.

// ---------- Derived profile values ----------

const LEAD_CATEGORY_MAP: Record<string, CustomerProfileCategory> = {
  Corporate: 'Corporate',
  SME: 'SOHO',
  Government: 'Government',
  Education: 'Corporate',
  Healthcare: 'Corporate',
  'Residential Bulk': 'Home',
  'ISP / Associate': 'Associate/MAC'
};

export function categoryFromLead(leadCategory: string): CustomerProfileCategory {
  return LEAD_CATEGORY_MAP[leadCategory] ?? 'Corporate';
}

export function segmentFor(category: CustomerProfileCategory): Customer['segment'] {
  if (category === 'Associate/MAC' || category === 'Bandwidth') return 'Associate';
  if (category === 'SOHO' || category === 'Home') return 'SME';
  return 'Corporate';
}

export function profileCategory(c: Customer): CustomerProfileCategory {
  if (c.category) return c.category;
  if (c.segment === 'Associate') return 'Associate/MAC';
  return c.segment === 'SME' ? 'SOHO' : 'Corporate';
}

/** Stage the profile has reached. Work Order and Active are derived from linked records. */
export function profileStage(db: DemoDatabase, c: Customer): ProfileStage {
  if (c.profileStage === 'Draft') return 'Draft';
  if (c.status === 'Active' || c.status === 'Disconnected') return 'Active';
  if (db.workOrders.some((w) => w.customerId === c.id)) return 'Work Order';
  return c.profileStage ?? 'Negotiation';
}

export function isLocked(db: DemoDatabase, c: Customer): boolean {
  return profileStage(db, c) !== 'Draft';
}

/** Corrections to locked fields open once the customer reaches the Work Order stage. */
export function correctionsOpen(db: DemoDatabase, c: Customer): boolean {
  const s = profileStage(db, c);
  return s === 'Work Order' || s === 'Active';
}

export function fieldValue(c: Customer, field: CorrectableField): string {
  switch (field) {
    case 'category':
      return profileCategory(c);
    case 'registeredAddress':
      return c.registeredAddress ?? '';
    default:
      return c[field] as string | undefined ?? '';
  }
}

export function currentSnapshot(c: Customer, at: string): CustomerSnapshot {
  return { name: c.name, nameBn: c.nameBn, category: profileCategory(c), registeredAddress: c.registeredAddress ?? '', capturedAt: at };
}

/** Contacts captured on the profile, falling back to site and billing contacts for older records. */
export function profileContacts(db: DemoDatabase, c: Customer): CustomerContact[] {
  if (c.contacts?.length) return c.contacts;
  const site = db.sites.find((s) => s.customerId === c.id);
  const ba = db.billingAccounts.find((b) => b.customerId === c.id);
  const out: CustomerContact[] = [];
  if (site) out.push({ id: `${c.id}-p`, role: 'Primary', name: site.contactName, designation: 'Site contact', phone: site.contactPhone, email: '' });
  if (ba) out.push({ id: `${c.id}-b`, role: 'Billing', name: ba.billingContact, designation: 'Billing contact', phone: '', email: '' });
  return out;
}

export function connectionProduct(c: ServiceConnection): ServiceProduct {
  if (c.product) return c.product;
  if (c.serviceType === 'IP Transit') return 'IP Transit';
  if (c.serviceType === 'Data Connectivity') return 'Data Connectivity';
  return 'Internet';
}

export function connectionMedium(c: ServiceConnection): DeliveryMedium {
  return c.medium ?? 'Fibre';
}

export function connectionLabel(c: ServiceConnection): string {
  const p = connectionProduct(c);
  if (!BANDWIDTH_PRODUCTS.includes(p)) return p;
  const bw = c.bandwidthMbps >= 1000 ? `${c.bandwidthMbps / 1000} Gbps` : `${c.bandwidthMbps} Mbps`;
  return `${bw} ${p === 'Internet' ? c.serviceType : p}`;
}

// ---------- Linked records ----------

export function customerQuotations(db: DemoDatabase, c: Customer) {
  const oppIds = new Set(customerOpportunities(db, c).map((o) => o.id));
  return db.quotations.filter((q) => q.customerId === c.id || oppIds.has(q.opportunityId));
}

export function customerOpportunities(db: DemoDatabase, c: Customer) {
  return db.opportunities.filter((o) => o.customerId === c.id || c.leadId && o.leadId === c.leadId);
}

export function customerInvoices(db: DemoDatabase, c: Customer) {
  const bas = new Set(db.billingAccounts.filter((b) => b.customerId === c.id).map((b) => b.id));
  return db.invoices.filter((i) => i.customerId === c.id || bas.has(i.billingAccountId));
}

/** Every record that belongs to the customer — used for the activity history. */
export function customerRefs(db: DemoDatabase, c: Customer): EntityRef[] {
  const id = c.id;
  const opps = customerOpportunities(db, c);
  const oppIds = new Set(opps.map((o) => o.id));
  const bas = db.billingAccounts.filter((b) => b.customerId === id);
  const baIds = new Set(bas.map((b) => b.id));
  const jobs = db.installationJobs.filter((j) => j.customerId === id);
  return [
  { type: 'customer', id },
  ...(c.leadId ? [{ type: 'lead' as const, id: c.leadId }] : []),
  ...opps.map((o) => ({ type: 'opportunity' as const, id: o.id })),
  ...db.sites.filter((s) => s.customerId === id).map((s) => ({ type: 'site' as const, id: s.id })),
  ...db.connections.filter((x) => x.customerId === id).map((x) => ({ type: 'connection' as const, id: x.id })),
  ...bas.map((b) => ({ type: 'billingAccount' as const, id: b.id })),
  ...db.surveys.filter((s) => oppIds.has(s.opportunityId)).map((s) => ({ type: 'survey' as const, id: s.id })),
  ...customerQuotations(db, c).map((q) => ({ type: 'quotation' as const, id: q.id })),
  ...db.workOrders.filter((w) => w.customerId === id).map((w) => ({ type: 'workOrder' as const, id: w.id })),
  ...jobs.map((j) => ({ type: 'installationJob' as const, id: j.id })),
  ...db.invoices.filter((i) => baIds.has(i.billingAccountId)).map((i) => ({ type: 'invoice' as const, id: i.id })),
  ...db.receipts.filter((r) => baIds.has(r.billingAccountId)).map((r) => ({ type: 'receipt' as const, id: r.id })),
  ...db.serviceChanges.filter((s) => s.customerId === id).map((s) => ({ type: 'serviceChange' as const, id: s.id })),
  ...db.tickets.filter((t) => t.customerId === id).map((t) => ({ type: 'ticket' as const, id: t.id }))];

}

export function linkedName(db: DemoDatabase, ref: EntityRef): string {
  return recordName(db, ref);
}

// ---------- Role rules ----------

export const canEditProfile = (r: Role) => hasPermission(r, 'createQuotation') || hasPermission(r, 'manageWorkOrders');
export const canRequestCorrection = (r: Role) => canEditProfile(r) || hasPermission(r, 'recordCollection');
export const canApproveCorrection = (r: Role) => hasPermission(r, 'manageSalesTeam');
/** Identity documents and numbers (trade licence, TIN, NID). */
export const canViewIdentity = (r: Role) => hasPermission(r, 'manageWorkOrders') || hasPermission(r, 'manageSalesTeam') || hasPermission(r, 'recordCollection');
/** Full bank account and wallet numbers. */
export const canViewPaymentDetails = (r: Role) => hasPermission(r, 'recordCollection') || hasPermission(r, 'approveFinancial');
export const canViewBillingContact = (r: Role) => hasPermission(r, 'viewFinancials') || hasPermission(r, 'manageWorkOrders');
export const canSeeMoney = (r: Role) => hasPermission(r, 'viewFinancials') || hasPermission(r, 'viewPipeline');

/** Masks all but the last four digits of any long number in a reference. */
export function maskReference(ref: string): string {
  return ref.replace(/\d[\d\s-]{5,}\d/g, (m) => `•••• ${m.replace(/\D/g, '').slice(-4)}`);
}

export const redactAmounts = (text: string) => text.replace(/৳ [\d,]+/g, '৳ •••');