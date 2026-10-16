import React from 'react';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../../utils/format';
import {
  APPROVAL_REQUIRES,
  accountAdvance,
  accountHolderName,
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
'../../../utils/relations';
import { hasPermission } from '../../../utils/access';
import { IdCell, NameCell, Status, makeTab, type TabDef, type ViewCtx } from './tabHelpers';

export function customerTabs({ db, fin, tech }: ViewCtx): TabDef[] {
  return [
  makeTab('customers', 'Customers', 'customer', db.customers, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Customer', cell: (r) => <NameCell name={r.name} sub={r.nameBn} /> },
  { label: 'Segment', cell: (r) => r.segment },
  { label: 'Sites', align: 'right', cell: (r) => db.sites.filter((s) => s.customerId === r.id).length },
  { label: 'Connections', align: 'right', cell: (r) => db.connections.filter((c) => c.customerId === r.id).length },
  { label: 'Contracted MRC', align: 'right', show: fin, cell: (r) => formatBDT(db.connections.filter((c) => c.customerId === r.id && c.status === 'Active').reduce((s, c) => s + c.mrc, 0)) },
  { label: 'Account manager', cell: (r) => userName(r.accountManagerId) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  ),
  makeTab('sites', 'Sites', 'site', db.sites, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Site', cell: (r) => <NameCell name={r.name} sub={customerName(db, r.customerId)} /> },
  { label: 'Address', cell: (r) => r.address },
  { label: 'Contact', cell: (r) => <NameCell name={r.contactName} sub={r.contactPhone} /> },
  { label: 'Zone', cell: (r) => `${zoneName(r.zoneId)}, ${branchName(r.branchId)}` }]
  ),
  makeTab('connections', 'Connections', 'connection', db.connections, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Customer', cell: (r) => <NameCell name={customerName(db, r.customerId)} sub={recordName(db, { type: 'site', id: r.siteId }).split(',')[0]} /> },
  { label: 'Service', cell: (r) => recordName(db, { type: 'connection', id: r.id }) },
  { label: 'MRC', align: 'right', show: fin, cell: (r) => formatBDT(r.mrc) },
  { label: 'VLAN', align: 'right', show: tech, cell: (r) => r.vlan ?? '—' },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function quotationTabs({ db, fin, pipe, margin }: ViewCtx): TabDef[] {
  const money = fin || pipe;
  return [
  makeTab('quotations', 'Quotations', 'quotation', db.quotations, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Prospect', cell: (r) => <NameCell name={recordName(db, { type: 'quotation', id: r.id })} sub={r.description} /> },
  { label: 'MRC', align: 'right', show: money, cell: (r) => formatBDT(r.mrc) },
  { label: 'OTC', align: 'right', show: money, cell: (r) => formatBDT(r.otc) },
  { label: 'Margin', align: 'right', show: margin, cell: (r) => `${r.marginPct}%` },
  { label: 'Prepared by', cell: (r) => userName(r.preparedById) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  ),
  makeTab('workOrders', 'Work orders', 'workOrder', db.workOrders, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Type', cell: (r) => r.type },
  { label: 'Customer', cell: (r) => <NameCell name={customerName(db, r.customerId)} sub={recordName(db, { type: 'site', id: r.siteId }).split(',')[0]} /> },
  { label: 'Source', cell: (r) => <IdCell id={r.quotationId ?? r.serviceChangeId ?? '—'} /> },
  { label: 'Created', cell: (r) => formatDhaka(r.createdAt) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function billingTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('invoices', 'Invoices', 'invoice', db.invoices, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Account', cell: (r) => <NameCell name={accountHolderName(db, r.billingAccountId)} sub={r.description} /> },
  { label: 'Period', cell: (r) => r.period },
  { label: 'Net', align: 'right', cell: (r) => formatBDT(invoiceNet(r)) },
  { label: 'Outstanding', align: 'right', cell: (r) => formatBDT(invoiceOutstanding(r)) },
  { label: 'Due', cell: (r) => formatDhakaDate(r.dueDate) },
  { label: 'Status', cell: (r) => <Status value={invoiceStatus(r)} /> }]
  ),
  makeTab('receipts', 'Receipts', 'receipt', db.receipts, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Account', cell: (r) => <NameCell name={accountHolderName(db, r.billingAccountId)} sub={`${r.method} · ${r.reference}`} /> },
  { label: 'Amount', align: 'right', cell: (r) => formatBDT(r.amount) },
  { label: 'Unallocated', align: 'right', cell: (r) => formatBDT(receiptUnallocated(r)) },
  { label: 'Received', cell: (r) => formatDhaka(r.receivedAt) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  ),
  makeTab('accounts', 'Billing accounts', 'billingAccount', db.billingAccounts, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Account', cell: (r) => <NameCell name={r.name} sub={r.billingContact} /> },
  { label: 'Collection mode', cell: (r) => r.collectionMode },
  { label: 'Outstanding', align: 'right', cell: (r) => formatBDT(accountOutstanding(db, r.id)) },
  { label: 'Advance', align: 'right', cell: (r) => formatBDT(accountAdvance(db, r.id)) }]
  )];

}

export function associateTabs({ db, fin }: ViewCtx): TabDef[] {
  return [
  makeTab('associates', 'Associates', 'associate', db.associates, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Associate', cell: (r) => <NameCell name={r.name} sub={r.nameBn} /> },
  { label: 'Collection model', cell: (r) => <Status value={r.collectionModel} /> },
  { label: 'Terms', show: fin, cell: (r) => <span className="block max-w-[280px] text-[11.5px]">{r.terms}</span> },
  { label: 'Subscribers', align: 'right', cell: (r) => r.subscribers.toLocaleString('en-IN') },
  { label: 'Outstanding', align: 'right', show: fin, cell: (r) => formatBDT(accountOutstanding(db, r.billingAccountId)) },
  { label: 'Zone', cell: (r) => `${zoneName(r.zoneId)}, ${branchName(r.branchId)}` }]
  )];

}

export function agentTabs({ db, comm }: ViewCtx): TabDef[] {
  return [
  makeTab('agents', 'Sales agents', 'salesAgent', db.salesAgents, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Agent', cell: (r) => <NameCell name={r.name} sub={r.nameBn} /> },
  { label: 'Activations', align: 'right', cell: (r) => r.activations },
  { label: 'Commission rule', show: comm, cell: (r) => r.commissionRule },
  { label: 'Approved YTD', align: 'right', show: comm, cell: (r) => formatBDT(r.commissionApprovedYtd) },
  {
    label: 'Pending',
    align: 'right',
    show: comm,
    cell: (r) =>
    formatBDT(db.approvals.filter((a) => a.type === 'Commission' && a.status === 'Pending' && a.related.some((x) => x.id === r.id)).reduce((s, a) => s + a.amount, 0))
  },
  { label: 'Zone', cell: (r) => `${zoneName(r.zoneId)}, ${branchName(r.branchId)}` },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function approvalTabs({ db, role }: ViewCtx): TabDef[] {
  const visible = db.approvals.filter((a) => APPROVAL_REQUIRES[a.type].every((p) => hasPermission(role, p)));
  const cols = [
  { label: 'ID', cell: (r: (typeof visible)[number]) => <IdCell id={r.id} /> },
  { label: 'Request', cell: (r: (typeof visible)[number]) => <NameCell name={r.title} sub={r.detail} /> },
  { label: 'Type', cell: (r: (typeof visible)[number]) => r.type },
  { label: 'Amount', align: 'right' as const, cell: (r: (typeof visible)[number]) => formatBDT(r.amount) },
  { label: 'Requested', cell: (r: (typeof visible)[number]) => <NameCell name={userName(r.requestedById)} sub={formatDhaka(r.requestedAt)} /> },
  { label: 'Status', cell: (r: (typeof visible)[number]) => <Status value={r.status} /> }];

  return [
  makeTab('pending', 'Pending', 'approval', visible.filter((a) => a.status === 'Pending'), cols),
  makeTab('decided', 'Decided', 'approval', visible.filter((a) => a.status !== 'Pending'), [
  ...cols,
  { label: 'Decided by', cell: (r) => <NameCell name={userName(r.decidedById)} sub={r.decidedAt ? formatDhaka(r.decidedAt) : undefined} /> }]
  )];

}