import { accountHolderName, customerName, recordName } from './relations';
import type { BranchId } from '../types/erp';
import type { DemoDatabase, EntityRef } from '../types/records';

export interface SearchHit {
  ref: EntityRef;
  title: string;
  titleBn?: string;
  detail: string;
  branchId: BranchId | null;
}

/** Search entries derived from the shared demo records (English and Bangla names). */
export function buildSearchEntries(db: DemoDatabase): SearchHit[] {
  return [
  ...db.customers.map((c) => ({ ref: { type: 'customer' as const, id: c.id }, title: c.name, titleBn: c.nameBn, detail: `Customer · ${c.id} · ${c.category ?? c.segment}`, branchId: c.branchId })),
  ...db.leads.map((l) => ({ ref: { type: 'lead' as const, id: l.id }, title: l.company, titleBn: l.companyBn, detail: `Lead · ${l.id} · ${l.address}`, branchId: l.branchId })),
  ...db.tenders.map((t) => ({ ref: { type: 'tender' as const, id: t.id }, title: t.reference, titleBn: t.issuingOrganisationBn, detail: `Tender · ${t.issuingOrganisation} · ${t.title}`, branchId: t.branchId })),
  ...db.opportunities.map((o) => ({ ref: { type: 'opportunity' as const, id: o.id }, title: o.id, detail: `Opportunity · ${o.title}`, branchId: o.branchId })),
  ...db.quotations.map((q) => ({ ref: { type: 'quotation' as const, id: q.id }, title: q.id, detail: `Quotation · ${recordName(db, { type: 'quotation', id: q.id })}`, branchId: q.branchId })),
  ...db.workOrders.map((w) => ({ ref: { type: 'workOrder' as const, id: w.id }, title: w.id, detail: `Work order · ${w.type} · ${customerName(db, w.customerId)}`, branchId: w.branchId })),
  ...db.installationJobs.map((j) => ({ ref: { type: 'installationJob' as const, id: j.id }, title: j.id, detail: `Installation job · ${customerName(db, j.customerId)}`, branchId: j.branchId })),
  ...db.surveys.map((s) => ({ ref: { type: 'survey' as const, id: s.id }, title: s.id, detail: `Survey · ${s.address}`, branchId: s.branchId })),
  ...db.connections.map((c) => ({ ref: { type: 'connection' as const, id: c.id }, title: c.id, detail: `Connection · ${customerName(db, c.customerId)}`, branchId: c.branchId })),
  ...db.tickets.map((t) => ({ ref: { type: 'ticket' as const, id: t.id }, title: t.id, detail: `Ticket · ${t.subject}`, branchId: t.branchId })),
  ...db.invoices.map((i) => ({ ref: { type: 'invoice' as const, id: i.id }, title: i.id, detail: `Invoice · ${accountHolderName(db, i.billingAccountId)} · ${i.period}`, branchId: i.branchId })),
  ...db.receipts.map((r) => ({ ref: { type: 'receipt' as const, id: r.id }, title: r.id, detail: `Receipt · ${accountHolderName(db, r.billingAccountId)} · ${r.reference}`, branchId: r.branchId })),
  ...db.serviceChanges.map((s) => ({ ref: { type: 'serviceChange' as const, id: s.id }, title: s.id, detail: `Service change · ${s.type} · ${customerName(db, s.customerId)}`, branchId: s.branchId })),
  ...db.associates.map((a) => ({ ref: { type: 'associate' as const, id: a.id }, title: a.name, titleBn: a.nameBn, detail: `Associate · ${a.id} · ${a.collectionModel}`, branchId: a.branchId })),
  ...db.salesAgents.map((a) => ({ ref: { type: 'salesAgent' as const, id: a.id }, title: a.name, titleBn: a.nameBn, detail: `Sales agent · ${a.id}`, branchId: a.branchId })),
  ...db.inventoryMovements.map((m) => ({ ref: { type: 'inventoryMovement' as const, id: m.id }, title: m.id, detail: `Inventory · ${m.type} · ${m.itemName}${m.serial ? ` · ${m.serial}` : ''}`, branchId: m.branchId }))];

}