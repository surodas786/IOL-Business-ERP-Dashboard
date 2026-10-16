import { formatBDT, formatDhaka, formatDhakaDate } from './format';
import { hasPermission } from './access';
import {
  ENTITY_LABEL,
  accountAdvance,
  accountOutstanding,
  branchName,
  customerName,
  invoiceNet,
  invoiceOutstanding,
  invoiceStatus,
  receiptUnallocated,
  recordName,
  userName,
  zoneName } from
'./relations';
import type { Role } from '../types/erp';
import type { DemoDatabase, EntityRef } from '../types/records';

export interface DetailField {
  label: string;
  value: string;
}

export interface RecordDetail {
  typeLabel: string;
  title: string;
  titleBn?: string;
  status?: string;
  fields: DetailField[];
  related: EntityRef[];
  restrictedNote?: string;
}

type Maybe = DetailField | false | undefined | null | '' | 0;

function f(label: string, value: string | number | undefined | null): DetailField {
  return { label, value: value === undefined || value === null || value === '' ? '—' : String(value) };
}

function clean(fields: Maybe[]): DetailField[] {
  return fields.filter(Boolean) as DetailField[];
}

function loc(branchId: string, zoneId?: string): DetailField {
  return f('Branch / zone', `${branchName(branchId)}${zoneId ? ` · ${zoneName(zoneId)}` : ''}`);
}

/** Role-aware description of any shared record for the detail drawer. */
export function describeRecord(db: DemoDatabase, ref: EntityRef, role: Role): RecordDetail | null {
  const fin = hasPermission(role, 'viewFinancials');
  const pipe = hasPermission(role, 'viewPipeline');
  const margin = hasPermission(role, 'viewMargins');
  const comm = hasPermission(role, 'viewCommissions');
  const tech = hasPermission(role, 'technicalConfig');
  const money = fin || pipe;
  const base = { typeLabel: ENTITY_LABEL[ref.type] };
  const hiddenNote = !fin ? 'Billing, margin and commission values are hidden for this role.' : undefined;

  switch (ref.type) {
    case 'lead':{
        const r = db.leads.find((x) => x.id === ref.id);
        if (!r) return null;
        const opps = db.opportunities.filter((o) => o.leadId === r.id);
        return {
          ...base, title: r.company, titleBn: r.companyBn, status: r.status,
          fields: clean([f('Contact', `${r.contactName}${r.contactDesignation ? `, ${r.contactDesignation}` : ''}`), f('Phone', r.contactPhone), f('Email', r.contactEmail), f('Category', r.category), f('Address', r.address), f('Source', r.referral ? `${r.source} · ${r.referral}` : r.source), f('Owner', userName(r.ownerId)), loc(r.branchId, r.zoneId), f('Created', formatDhaka(r.createdAt, { year: true }))]),
          related: [...opps.map((o) => ({ type: 'opportunity' as const, id: o.id })), ...(r.agentId ? [{ type: 'salesAgent' as const, id: r.agentId }] : [])]
        };
      }
    case 'opportunity':{
        const r = db.opportunities.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: r.title, status: r.status === 'Open' ? db.crmStages.find((s) => s.id === r.stage)?.label ?? r.stage : r.status,
          fields: clean([f('Service', `${r.bandwidthMbps} Mbps ${r.serviceType}`), f('Service site', `${r.siteName} · ${r.siteAddress}`), pipe && f('Expected MRC', formatBDT(r.expectedMrc)), pipe && f('One-time charge', formatBDT(r.otc)), margin && r.marginPct > 0 && f('Margin', `${r.marginPct}%`), f('Owner', userName(r.ownerId)), loc(r.branchId, r.zoneId), f('Expected decision', formatDhakaDate(r.expectedDecisionDate)), r.nextAction && f('Next action', `${r.nextAction} · due ${formatDhaka(r.nextActionDue)}`), r.lossReason && f('Loss reason', r.lossReason), r.stalledReason && r.status === 'Stalled' && f('Stalled because', r.stalledReason), r.wonAt && f('Won', formatDhaka(r.wonAt, { year: true }))]),
          related: [
          { type: 'lead', id: r.leadId },
          ...db.tenders.filter((t) => t.opportunityId === r.id).map((t) => ({ type: 'tender' as const, id: t.id })),
          ...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : []),
          ...(r.agentId ? [{ type: 'salesAgent' as const, id: r.agentId }] : []),
          ...db.surveys.filter((s) => s.opportunityId === r.id).map((s) => ({ type: 'survey' as const, id: s.id })),
          ...db.quotations.filter((q) => q.opportunityId === r.id).map((q) => ({ type: 'quotation' as const, id: q.id }))],

          restrictedNote: !pipe ? 'Commercial values are hidden for this role.' : undefined
        };
      }
    case 'customer':{
        const r = db.customers.find((x) => x.id === ref.id);
        if (!r) return null;
        const conns = db.connections.filter((c) => c.customerId === r.id);
        const live = conns.filter((c) => c.status === 'Active');
        const bas = db.billingAccounts.filter((b) => b.customerId === r.id);
        return {
          ...base, title: r.name, titleBn: r.nameBn, status: r.status,
          fields: clean([f('Category', r.category ?? r.segment), f('Account manager', userName(r.accountManagerId)), loc(r.branchId, r.zoneId), f('Customer since', formatDhakaDate(r.since)), f('Sites', db.sites.filter((s) => s.customerId === r.id).length), f('Connections', `${conns.length} (${live.length} active)`), fin && f('Contracted MRC', formatBDT(live.reduce((s, c) => s + c.mrc, 0))), fin && f('Outstanding', formatBDT(bas.reduce((s, b) => s + accountOutstanding(db, b.id), 0)))]),
          related: [
          ...db.sites.filter((s) => s.customerId === r.id).map((s) => ({ type: 'site' as const, id: s.id })),
          ...conns.map((c) => ({ type: 'connection' as const, id: c.id })),
          ...bas.map((b) => ({ type: 'billingAccount' as const, id: b.id })),
          ...db.tickets.filter((t) => t.customerId === r.id).map((t) => ({ type: 'ticket' as const, id: t.id })),
          ...(r.associateId ? [{ type: 'associate' as const, id: r.associateId }] : []),
          ...(r.leadId ? [{ type: 'lead' as const, id: r.leadId }] : [])],

          restrictedNote: hiddenNote
        };
      }
    case 'site':{
        const r = db.sites.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.name} — ${customerName(db, r.customerId)}`,
          fields: clean([f('Address', r.address), f('Site contact', `${r.contactName} · ${r.contactPhone}`), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'customer', id: r.customerId }, ...db.connections.filter((c) => c.siteId === r.id).map((c) => ({ type: 'connection' as const, id: c.id }))]
        };
      }
    case 'connection':{
        const r = db.connections.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status,
          fields: clean([f('Customer', customerName(db, r.customerId)), f('Site', recordName(db, { type: 'site', id: r.siteId })), fin && f('MRC', formatBDT(r.mrc)), tech && f('VLAN', r.vlan), tech && f('ONU serial', r.onuSerial), loc(r.branchId, r.zoneId), r.activatedAt && f('Activated', formatDhaka(r.activatedAt, { year: true }))]),
          related: [{ type: 'customer', id: r.customerId }, { type: 'site', id: r.siteId }, { type: 'billingAccount', id: r.billingAccountId }, ...db.installationJobs.filter((j) => j.connectionId === r.id).map((j) => ({ type: 'installationJob' as const, id: j.id })), ...db.serviceChanges.filter((s) => s.connectionId === r.id).map((s) => ({ type: 'serviceChange' as const, id: s.id })), ...db.tickets.filter((t) => t.connectionId === r.id).map((t) => ({ type: 'ticket' as const, id: t.id }))],
          restrictedNote: hiddenNote
        };
      }
    case 'billingAccount':{
        const r = db.billingAccounts.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: r.name, status: r.collectionMode,
          fields: clean([f('Billing contact', r.billingContact), f('Billing address', r.billingAddress), f('Outstanding', formatBDT(accountOutstanding(db, r.id))), f('Unallocated advance', formatBDT(accountAdvance(db, r.id))), loc(r.branchId, r.zoneId)]),
          related: [...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : []), ...(r.associateId ? [{ type: 'associate' as const, id: r.associateId }] : []), ...db.invoices.filter((i) => i.billingAccountId === r.id).map((i) => ({ type: 'invoice' as const, id: i.id })), ...db.receipts.filter((x) => x.billingAccountId === r.id).map((x) => ({ type: 'receipt' as const, id: x.id }))]
        };
      }
    case 'survey':{
        const r = db.surveys.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status === 'Approved' ? 'Approved — Feasible' : r.status,
          fields: clean([f('Site', r.siteLabel), f('Address', r.address), r.requestedService && f('Requested', `${r.requestedService}${r.requestedBandwidthMbps ? ` · ${r.requestedBandwidthMbps} Mbps` : ''}`), f('Technician', r.technicianName || 'Not assigned'), r.fibreDistanceM !== undefined && f('Fibre distance', `${r.fibreDistanceM.toLocaleString('en-IN')} m`), f('Notes', r.notes), f('Requested', formatDhaka(r.requestedAt, { year: true })), r.scheduledAt && f('Scheduled', formatDhaka(r.scheduledAt, { year: true })), r.completedAt && f('Submitted for review', formatDhaka(r.completedAt, { year: true })), r.reviewNote && f('Review note', r.reviewNote), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'opportunity', id: r.opportunityId }, ...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : []), ...(r.siteId ? [{ type: 'site' as const, id: r.siteId }] : [])]
        };
      }
    case 'quotation':{
        const r = db.quotations.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status,
          fields: clean([f('Description', r.description), money && f('MRC', formatBDT(r.mrc)), money && f('One-time charge', formatBDT(r.otc)), margin && f('Margin', `${r.marginPct}%`), f('Prepared by', userName(r.preparedById)), f('Valid until', formatDhakaDate(r.validUntil)), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'opportunity', id: r.opportunityId }, ...db.approvals.filter((a) => a.entity.type === 'quotation' && a.entity.id === r.id).map((a) => ({ type: 'approval' as const, id: a.id })), ...db.workOrders.filter((w) => w.quotationId === r.id).map((w) => ({ type: 'workOrder' as const, id: w.id })), ...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : [])],
          restrictedNote: !money ? 'Commercial values are hidden for this role.' : undefined
        };
      }
    case 'workOrder':{
        const r = db.workOrders.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status,
          fields: clean([f('Type', r.type), f('Customer', customerName(db, r.customerId)), f('Site', recordName(db, { type: 'site', id: r.siteId })), f('Created by', userName(r.createdById)), f('Created', formatDhaka(r.createdAt, { year: true })), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'customer', id: r.customerId }, { type: 'site', id: r.siteId }, ...(r.quotationId ? [{ type: 'quotation' as const, id: r.quotationId }] : []), ...(r.serviceChangeId ? [{ type: 'serviceChange' as const, id: r.serviceChangeId }] : []), ...db.installationJobs.filter((j) => j.workOrderId === r.id).map((j) => ({ type: 'installationJob' as const, id: j.id }))]
        };
      }
    case 'installationJob':{
        const r = db.installationJobs.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${customerName(db, r.customerId)}`, status: r.status,
          fields: clean([f('Site', recordName(db, { type: 'site', id: r.siteId })), f('Technician', r.technicianName || 'Not assigned'), f(r.status === 'Pending Assignment' || r.status === 'Assigned' ? 'Target date' : 'Scheduled', formatDhaka(r.scheduledAt, { year: true })), r.hold && f('On hold', `${r.hold.party} — ${r.hold.reason}`), r.completedAt && f('Installation completed', formatDhaka(r.completedAt, { year: true })), r.verifiedAt && f('Technical verification', formatDhaka(r.verifiedAt, { year: true })), r.billingCommencedAt && f('Billing commencement', formatDhaka(r.billingCommencedAt, { year: true })), f('Materials', r.materials), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'workOrder', id: r.workOrderId }, { type: 'customer', id: r.customerId }, { type: 'connection', id: r.connectionId }, ...db.inventoryMovements.filter((m) => m.jobId === r.id).map((m) => ({ type: 'inventoryMovement' as const, id: m.id }))]
        };
      }
    case 'inventoryMovement':{
        const r = db.inventoryMovements.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${r.itemName}`, status: r.type,
          fields: clean([f('SKU', r.sku), f('Quantity', `${r.quantity.toLocaleString('en-IN')} ${r.unit}`), f('From', r.from), f('To', r.to), r.serial && f('Serial', r.serial), f('Recorded by', r.byName), f('Date', formatDhaka(r.at, { year: true })), f('Branch', branchName(r.branchId))]),
          related: [...(r.jobId ? [{ type: 'installationJob' as const, id: r.jobId }] : []), ...(r.serviceChangeId ? [{ type: 'serviceChange' as const, id: r.serviceChangeId }] : [])]
        };
      }
    case 'invoice':{
        const r = db.invoices.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: invoiceStatus(r),
          fields: clean([f('Description', r.description), f('Amount', formatBDT(r.amount)), r.credits > 0 && f('Credits', `− ${formatBDT(r.credits)}`), f('Net', formatBDT(invoiceNet(r))), f('Paid', formatBDT(r.paidAmount)), f('Outstanding', formatBDT(invoiceOutstanding(r))), f('Issued', formatDhakaDate(r.issuedAt)), f('Due', formatDhakaDate(r.dueDate)), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'billingAccount', id: r.billingAccountId }, ...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : []), ...(r.associateId ? [{ type: 'associate' as const, id: r.associateId }] : []), ...db.receipts.filter((x) => x.allocations.some((a) => a.invoiceId === r.id)).map((x) => ({ type: 'receipt' as const, id: x.id })), ...db.approvals.filter((a) => a.entity.type === 'invoice' && a.entity.id === r.id).map((a) => ({ type: 'approval' as const, id: a.id }))]
        };
      }
    case 'receipt':{
        const r = db.receipts.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status,
          fields: clean([f('Amount', formatBDT(r.amount)), f('Method', r.method), f('Reference', r.reference), f('Received', formatDhaka(r.receivedAt, { year: true })), r.verifiedAt && f('Verified', formatDhaka(r.verifiedAt, { year: true })), f('Allocated', r.allocations.map((a) => `${a.invoiceId} (${formatBDT(a.amount)})`).join(', ') || 'None'), f('Unallocated', formatBDT(receiptUnallocated(r))), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'billingAccount', id: r.billingAccountId }, ...r.allocations.map((a) => ({ type: 'invoice' as const, id: a.invoiceId }))]
        };
      }
    case 'serviceChange':{
        const r = db.serviceChanges.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${recordName(db, ref)}`, status: r.status,
          fields: clean([f('Change', `${r.fromValue} → ${r.toValue}`), f('Reason', r.reason), f('Type', r.type), f('Requested date', formatDhakaDate(r.requestedDate)), f('Approved effective date', r.effectiveDate ? formatDhakaDate(r.effectiveDate) : 'Not approved yet'), r.clearances && f('Technical clearance', r.clearances.technical.status), r.clearances && f('Accounts clearance', r.clearances.accounts.status), r.closedAt && f('Administratively closed', formatDhakaDate(r.closedAt)), f('Requested by', userName(r.requestedById)), f('Requested', formatDhaka(r.requestedAt, { year: true })), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'customer', id: r.customerId }, { type: 'connection', id: r.connectionId }, ...(r.workOrderId ? [{ type: 'workOrder' as const, id: r.workOrderId }] : []), ...db.inventoryMovements.filter((m) => m.serviceChangeId === r.id).map((m) => ({ type: 'inventoryMovement' as const, id: m.id }))]
        };
      }
    case 'ticket':{
        const r = db.tickets.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: `${r.id} · ${r.subject}`, status: r.status,
          fields: clean([f('Priority', r.priority), f('Customer', customerName(db, r.customerId)), f('Site', recordName(db, { type: 'site', id: r.siteId })), f('Assignee', r.assigneeName ?? 'Unassigned'), f('Opened', formatDhaka(r.openedAt, { year: true })), f('SLA due', formatDhaka(r.slaDueAt, { year: true })), r.resolvedAt && f('Resolved', formatDhaka(r.resolvedAt, { year: true })), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'customer', id: r.customerId }, { type: 'site', id: r.siteId }, ...(r.connectionId ? [{ type: 'connection' as const, id: r.connectionId }] : [])]
        };
      }
    case 'associate':{
        const r = db.associates.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: r.name, titleBn: r.nameBn, status: `${r.collectionModel} collections`,
          fields: clean([f('Terms', fin ? r.terms : `${r.collectionModel} collection model`), f('Subscribers', r.subscribers.toLocaleString('en-IN')), f('Contact', `${r.contactName} · ${r.contactPhone}`), fin && r.lastPayout && f('Last approved payout', `${formatBDT(r.lastPayout.amount)} · ${formatDhakaDate(r.lastPayout.at)}`), fin && f('Outstanding', formatBDT(accountOutstanding(db, r.billingAccountId))), f('Partner since', formatDhakaDate(r.since)), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'billingAccount', id: r.billingAccountId }, ...(r.customerId ? [{ type: 'customer' as const, id: r.customerId }] : []), ...db.approvals.filter((a) => a.entity.type === 'associate' && a.entity.id === r.id).map((a) => ({ type: 'approval' as const, id: a.id }))],
          restrictedNote: hiddenNote
        };
      }
    case 'salesAgent':{
        const r = db.salesAgents.find((x) => x.id === ref.id);
        if (!r) return null;
        const pending = db.approvals.filter((a) => a.type === 'Commission' && a.status === 'Pending' && a.related.some((x) => x.type === 'salesAgent' && x.id === r.id));
        return {
          ...base, title: r.name, titleBn: r.nameBn, status: r.status,
          fields: clean([f('Phone', r.phone), f('Activations', r.activations), comm && f('Commission rule', r.commissionRule), comm && f('Approved this year', formatBDT(r.commissionApprovedYtd)), comm && f('Pending approval', formatBDT(pending.reduce((s, a) => s + a.amount, 0))), loc(r.branchId, r.zoneId)]),
          related: [...db.leads.filter((l) => l.agentId === r.id).map((l) => ({ type: 'lead' as const, id: l.id })), ...(comm ? db.approvals.filter((a) => a.type === 'Commission' && a.related.some((x) => x.id === r.id)).map((a) => ({ type: 'approval' as const, id: a.id })) : [])],
          restrictedNote: !comm ? 'Commission details are hidden for this role.' : undefined
        };
      }
    case 'approval':{
        const r = db.approvals.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: r.title, status: r.status,
          fields: clean([f('Type', r.type), f('Detail', r.detail), f('Amount', formatBDT(r.amount)), f('Requested by', userName(r.requestedById)), f('Requested', formatDhaka(r.requestedAt, { year: true })), r.decidedById && f('Decided by', userName(r.decidedById)), r.decidedAt && f('Decided', formatDhaka(r.decidedAt, { year: true })), loc(r.branchId, r.zoneId)]),
          related: [r.entity, ...r.related]
        };
      }
    case 'fieldVisit':{
        const r = db.fieldVisits.find((x) => x.id === ref.id);
        if (!r) return null;
        return {
          ...base, title: recordName(db, ref), status: r.outcome,
          fields: clean([
          f('When', `${formatDhaka(r.at, { year: true })} · ${r.durationMin} min`), f('By', userName(r.userId)), f('Location', r.location), f('Purpose', r.purpose), f('People met', r.peopleMet),
          f('Notes', r.notes), r.nextAction && f('Next action', `${r.nextAction} · due ${formatDhaka(r.nextActionDue)}${r.followUpDoneAt ? ' (done)' : ''}`),
          r.attachments.length > 0 && f('Attachments', r.attachments.map((a) => a.name).join(', ')), r.photos > 0 && f('Photos', `${r.photos} (demo)`),
          r.geo && f('Location stamp', `${r.geo.lat.toFixed(4)}, ${r.geo.lng.toFixed(4)} ±${r.geo.accuracyM} m (${r.geo.source}) — reference only, not proof of visit`),
          loc(r.branchId, r.zoneId)]
          ),
          related: [r.subject, ...(r.claimId ? [{ type: 'expenseClaim' as const, id: r.claimId }] : [])]
        };
      }
    case 'expenseClaim':{
        const r = db.expenseClaims.find((x) => x.id === ref.id);
        if (!r) return null;
        const total = r.lines.reduce((s, l) => s + l.amount, 0) + r.adjustments.reduce((s, a) => s + a.amount, 0);
        return {
          ...base, title: `${r.id} · ${userName(r.claimantId)}`, status: r.status,
          fields: clean([
          f('Total', formatBDT(total)), f('Lines', r.lines.map((l) => `${l.category} ${formatBDT(l.amount)}`).join(' · ')),
          r.submittedAt && f('Submitted', formatDhaka(r.submittedAt, { year: true })), r.decidedById && f('Decided by', `${userName(r.decidedById)} · ${r.decidedAt ? formatDhaka(r.decidedAt) : ''}`),
          r.paidAt && f('Paid', `${formatDhaka(r.paidAt)} · ${r.paymentRef}`), r.adjustments.length > 0 && f('Adjustments', r.adjustments.map((a) => `${formatBDT(a.amount)} — ${a.reason}`).join(' · ')),
          loc(r.branchId, r.zoneId || undefined)]
          ),
          related: Array.from(new Set(r.lines.map((l) => l.visitId).filter((x): x is string => !!x))).map((id) => ({ type: 'fieldVisit' as const, id }))
        };
      }
    case 'tender':{
        const r = db.tenders.find((x) => x.id === ref.id);
        if (!r) return null;
        const req = r.documents.filter((x) => x.required);
        return {
          ...base, title: `${r.reference} · ${r.title}`, titleBn: r.issuingOrganisationBn, status: r.outcome === 'Pending' ? r.submissionStatus : r.outcome,
          fields: clean([f('Issuing organisation', r.issuingOrganisation), f('Clarification deadline', formatDhaka(r.clarificationDeadline, { year: true })), f('Submission deadline', formatDhaka(r.submissionDeadline, { year: true })), f('Win probability', `${r.winProbability}%`), pipe && f('Estimated MRC', formatBDT(r.estimatedValue)), f('Required documents', `${req.filter((x) => x.done).length} of ${req.length} ready`), f('Owner', userName(r.ownerId)), r.outcomeNote && f('Outcome note', r.outcomeNote), loc(r.branchId, r.zoneId)]),
          related: [{ type: 'opportunity', id: r.opportunityId }]
        };
      }
    default:
      return null;
  }
}