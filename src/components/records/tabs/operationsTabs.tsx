import React from 'react';
import { formatDhaka } from '../../../utils/format';
import { ADMIN_ENTITY_TYPES, COLLECTION, ENTITY_LABEL, customerName, recordName } from '../../../utils/relations';
import { IdCell, NameCell, Status, makeTab, type TabDef, type ViewCtx } from './tabHelpers';
import type { EntityType } from '../../../types/records';

export function surveyTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('surveys', 'Surveys', 'survey', db.surveys, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Prospect', cell: (r) => <NameCell name={recordName(db, { type: 'survey', id: r.id })} sub={r.address} /> },
  { label: 'Technician', cell: (r) => r.technicianName },
  { label: 'Fibre distance', align: 'right', cell: (r) => r.fibreDistanceM !== undefined ? `${r.fibreDistanceM.toLocaleString('en-IN')} m` : '—' },
  { label: 'Result', cell: (r) => r.result ? <Status value={r.result} /> : '—' },
  { label: 'Date', cell: (r) => formatDhaka(r.completedAt ?? r.scheduledAt ?? r.requestedAt) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function installationTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('jobs', 'Installation jobs', 'installationJob', db.installationJobs, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Customer', cell: (r) => <NameCell name={customerName(db, r.customerId)} sub={recordName(db, { type: 'site', id: r.siteId }).split(',')[0]} /> },
  { label: 'Connection', cell: (r) => <IdCell id={r.connectionId} /> },
  { label: 'Technician', cell: (r) => r.technicianName },
  { label: 'Scheduled', cell: (r) => formatDhaka(r.scheduledAt) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function serviceChangeTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('changes', 'Service changes', 'serviceChange', db.serviceChanges, [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Customer', cell: (r) => <NameCell name={customerName(db, r.customerId)} sub={r.connectionId} /> },
  { label: 'Change', cell: (r) => <NameCell name={r.type} sub={`${r.fromValue} → ${r.toValue}`} /> },
  { label: 'Technical', cell: (r) => r.clearances ? <Status value={r.clearances.technical.status} /> : '—' },
  { label: 'Accounts', cell: (r) => r.clearances ? <Status value={r.clearances.accounts.status} /> : '—' },
  { label: 'Effective', cell: (r) => r.effectiveDate ? formatDhaka(r.effectiveDate).split(',')[0] : '—' },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function inventoryTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('movements', 'Stock movements', 'inventoryMovement', [...db.inventoryMovements].sort((a, b) => b.at.localeCompare(a.at)), [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Item', cell: (r) => <NameCell name={r.itemName} sub={r.serial ?? r.sku} /> },
  { label: 'Type', cell: (r) => <Status value={r.type} /> },
  { label: 'Qty', align: 'right', cell: (r) => `${r.quantity.toLocaleString('en-IN')} ${r.unit}` },
  { label: 'From → To', cell: (r) => <NameCell name={r.from} sub={`→ ${r.to}`} /> },
  { label: 'Date', cell: (r) => formatDhaka(r.at) },
  { label: 'By', cell: (r) => r.byName }]
  )];

}

export function ticketTabs({ db }: ViewCtx): TabDef[] {
  return [
  makeTab('tickets', 'Tickets', 'ticket', [...db.tickets].sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt)), [
  { label: 'ID', cell: (r) => <IdCell id={r.id} /> },
  { label: 'Subject', cell: (r) => <NameCell name={r.subject} sub={customerName(db, r.customerId)} /> },
  { label: 'Priority', cell: (r) => <Status value={r.priority} /> },
  { label: 'Assignee', cell: (r) => r.assigneeName ?? 'Unassigned' },
  { label: 'SLA due', cell: (r) => formatDhaka(r.slaDueAt) },
  { label: 'Status', cell: (r) => <Status value={r.status} /> }]
  )];

}

export function reportTabs({ db }: ViewCtx): TabDef[] {
  const rows = (Object.keys(COLLECTION) as EntityType[]).filter((t) => !ADMIN_ENTITY_TYPES.includes(t)).map((t) => ({
    id: t,
    label: ENTITY_LABEL[t],
    count: (db[COLLECTION[t]] as unknown[]).length
  }));
  return [
  makeTab('dataset', 'Demo dataset', null, rows, [
  { label: 'Record type', cell: (r) => <span className="font-semibold text-slate-900">{r.label}</span> },
  { label: 'Records', align: 'right', cell: (r) => r.count }]
  )];

}