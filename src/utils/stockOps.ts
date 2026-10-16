import { nextId } from './relations';
import { formatDhakaDate } from './format';
import { isReturnableToIol, itemOf, normaliseSerial, stockOf, stockPosition, warehouseBranch } from './inventoryRules';
import type { DemoDatabase, InventoryMovement } from '../types/records';
import type { StockItem } from '../types/survey';
import type { EquipmentUnit, Ownership, ReturnSource, StockReservation, StockReturn } from '../types/inventory';
import type { Actor } from './workflow';

/**
 * Stock operations shared by Inventory, Installations and Service Changes.
 * They mutate a cloned draft database and throw StockError when a rule is broken,
 * so callers return the untouched original. FICTIONAL DEMO — production must enforce this on the server.
 */
export class StockError extends Error {}
/** Equipment IOL does not stock (customer or associate supplied). */
export const NON_STOCK_SKU = 'NON-STOCK';
const stop = (msg: string): never => {
  throw new StockError(msg);
};

export interface StockLinks {
  jobId?: string;
  workOrderId?: string;
  serviceChangeId?: string;
  ticketId?: string;
  customerId?: string;
  connectionId?: string;
}

/** Fills customer, service and work order from the most specific link given. */
export function resolveLinks(d: DemoDatabase, l: StockLinks): StockLinks {
  const out = { ...l };
  const tk = l.ticketId ? d.tickets.find((t) => t.id === l.ticketId) : undefined;
  if (l.ticketId && !tk) stop(`Ticket ${l.ticketId} not found.`);
  if (tk) Object.assign(out, { customerId: out.customerId ?? tk.customerId, connectionId: out.connectionId ?? tk.connectionId });
  const job = l.jobId ? d.installationJobs.find((j) => j.id === l.jobId) : undefined;
  if (l.jobId && !job) stop(`Job ${l.jobId} not found.`);
  if (job) Object.assign(out, { workOrderId: out.workOrderId ?? job.workOrderId, customerId: job.customerId, connectionId: out.connectionId ?? job.connectionId });
  const wo = out.workOrderId ? d.workOrders.find((w) => w.id === out.workOrderId) : undefined;
  if (out.workOrderId && !wo) stop(`Work order ${out.workOrderId} not found.`);
  if (wo) out.customerId = out.customerId ?? wo.customerId;
  const sc = l.serviceChangeId ? d.serviceChanges.find((s) => s.id === l.serviceChangeId) : undefined;
  if (l.serviceChangeId && !sc) stop(`Service change ${l.serviceChangeId} not found.`);
  if (sc) Object.assign(out, { customerId: out.customerId ?? sc.customerId, connectionId: out.connectionId ?? sc.connectionId });
  if (out.connectionId) {
    const c = d.connections.find((x) => x.id === out.connectionId);
    if (!c) stop(`Service ${out.connectionId} not found.`);
    if (out.customerId && c!.customerId !== out.customerId) stop(`${out.connectionId} does not belong to this customer.`);
    out.customerId = c!.customerId;
  }
  return out;
}

export function ensureStock(d: DemoDatabase, sku: string, warehouse: string): StockItem {
  const existing = stockOf(d, sku, warehouse);
  if (existing) return existing;
  const item = itemOf(d, sku) ?? stop(`Unknown item ${sku}.`);
  const last = d.vendorPrices.filter((p) => p.sku === sku).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0];
  const row: StockItem = { id: `STK-${warehouse.slice(0, 3).toUpperCase()}-${sku}`, sku, name: item.name, unit: item.unit, warehouse, onHand: 0, reserved: 0, unitCost: last?.unitPrice ?? 0, pricedAt: last?.purchasedAt ?? new Date(0).toISOString() };
  d.stockItems.push(row);
  return row;
}

export function pushMovement(d: DemoDatabase, m: Omit<InventoryMovement, 'id'>): InventoryMovement {
  const mv: InventoryMovement = { id: nextId(d.inventoryMovements, 'IM-2026-', 4), ...m };
  d.inventoryMovements.unshift(mv);
  return mv;
}

export const unitEvent = (u: EquipmentUnit, actor: Actor, at: string, event: string, detail: string) => {
  u.history = [...u.history, { at, byName: actor.name, event, detail }];
};

/** Integer, positive quantity; serial items must list one unique serial per unit. */
export function checkQuantity(d: DemoDatabase, sku: string, quantity: number, serials: string[]): string[] {
  const item = itemOf(d, sku) ?? stop(`Unknown item ${sku}.`);
  if (!Number.isFinite(quantity) || quantity <= 0) stop('Enter a quantity above zero.');
  if (item.tracking === 'Serial') {
    if (!Number.isInteger(quantity)) stop(`${item.name} is counted in whole units.`);
    const list = serials.map(normaliseSerial).filter(Boolean);
    if (list.length !== quantity) stop(`${item.name} is serial-tracked — enter exactly ${quantity} serial number${quantity === 1 ? '' : 's'} (${list.length} entered).`);
    const dup = list.find((s, i) => list.indexOf(s) !== i);
    if (dup) stop(`Serial ${dup} is entered twice.`);
    return list;
  }
  return [];
}

export const unitBySerial = (d: DemoDatabase, serial: string) => d.equipmentUnits.find((u) => u.serial === normaliseSerial(serial));

function describeUnit(u: EquipmentUnit): string {
  if (u.status === 'Issued') return `issued to ${u.technicianName ?? 'a technician'}${u.jobId ? ` for ${u.jobId}` : ''}`;
  if (u.status === 'Installed' || u.status === 'Receivable') return `${u.status.toLowerCase()} at ${u.connectionId ?? 'a customer site'}`;
  if (u.status === 'In Stock') return `in stock at ${u.warehouse}`;
  return u.status.toLowerCase();
}

/** Reservation holds available stock for a job, work order or service change. Physical on-hand is unchanged. */
export function reserveStock(
d: DemoDatabase,
p: {sku: string;warehouse: string;quantity: number;links: StockLinks;note?: string;},
actor: Actor,
at: string)
: StockReservation {
  if (!itemOf(d, p.sku)) stop(`Unknown item ${p.sku}.`);
  if (!Number.isInteger(p.quantity) || p.quantity <= 0) stop('Enter a whole quantity above zero.');
  if (!p.links.jobId && !p.links.workOrderId && !p.links.serviceChangeId) stop('Link the reservation to an installation job, work order or service change.');
  const links = resolveLinks(d, p.links);
  const stock = ensureStock(d, p.sku, p.warehouse);
  const pos = stockPosition(d, stock);
  if (p.quantity > pos.available) stop(`Only ${pos.available} ${stock.unit} of ${stock.name} available at ${p.warehouse} (on hand ${pos.onHand}, already reserved ${pos.reserved}).`);
  stock.reserved += p.quantity;
  const r: StockReservation = {
    id: nextId(d.stockReservations, 'RS-2026-', 4), sku: p.sku, warehouse: p.warehouse, quantity: p.quantity, issued: 0, status: 'Active', ...links,
    note: p.note?.trim() || undefined, at, byName: actor.name, branchId: warehouseBranch(p.warehouse)
  };
  d.stockReservations.unshift(r);
  return r;
}

export function releaseReservation(d: DemoDatabase, r: StockReservation, reason: string, at: string) {
  const stock = stockOf(d, r.sku, r.warehouse);
  const left = r.quantity - r.issued;
  if (stock) stock.reserved = Math.max(0, stock.reserved - left);
  r.status = 'Released';
  r.releasedReason = reason;
  r.releasedAt = at;
}

/** Issue reduces warehouse on-hand and moves stock to a technician. Consumes the linked reservation first. */
export function issueStock(
d: DemoDatabase,
p: {sku: string;warehouse: string;quantity: number;serials: string[];technicianName: string;links: StockLinks;reservationId?: string;note?: string;},
actor: Actor,
at: string)
: InventoryMovement {
  const serials = checkQuantity(d, p.sku, p.quantity, p.serials);
  if (!p.technicianName.trim()) stop('Choose the technician receiving the stock.');
  if (!p.links.jobId && !p.links.workOrderId && !p.links.serviceChangeId && !p.links.ticketId) stop('Link the issue to an installation job, work order, service change or support ticket.');
  const links = resolveLinks(d, p.links);
  const stock = ensureStock(d, p.sku, p.warehouse);

  // Reservations held for this job / work order are used first; other jobs' reservations are untouchable.
  const own = p.reservationId ?
  d.stockReservations.filter((r) => r.id === p.reservationId) :
  d.stockReservations.filter((r) => r.status === 'Active' && r.sku === p.sku && r.warehouse === p.warehouse && (links.jobId && r.jobId === links.jobId || !r.jobId && links.workOrderId && r.workOrderId === links.workOrderId || links.serviceChangeId && r.serviceChangeId === links.serviceChangeId));
  if (p.reservationId && (!own[0] || own[0].status !== 'Active' || own[0].sku !== p.sku || own[0].warehouse !== p.warehouse)) stop('That reservation is not active for this item and warehouse.');
  const ownLeft = own.reduce((n, r) => n + r.quantity - r.issued, 0);
  const fromReserve = Math.min(ownLeft, p.quantity);
  const freeNeeded = p.quantity - fromReserve;
  const free = stock.onHand - stock.reserved;
  if (p.quantity > stock.onHand) stop(`Only ${stock.onHand} ${stock.unit} of ${stock.name} on hand at ${p.warehouse}. Stock cannot go negative.`);
  if (freeNeeded > free) stop(`Only ${Math.max(0, free)} ${stock.unit} of ${stock.name} is unreserved at ${p.warehouse}${ownLeft ? ` plus ${ownLeft} reserved for this job` : ''}. The rest is reserved for other work.`);

  for (const s of serials) {
    const u = unitBySerial(d, s);
    if (!u || u.sku !== p.sku) stop(`Serial ${s} is not a recorded ${stock.name}. Receive it first.`);
    if (u!.status !== 'In Stock') stop(`Serial ${s} is already ${describeUnit(u!)} — a serial can have only one active allocation.`);
    if (u!.warehouse !== p.warehouse) stop(`Serial ${s} is held at ${u!.warehouse}, not ${p.warehouse}.`);
  }

  let take = fromReserve;
  for (const r of own) {
    if (take <= 0) break;
    const use = Math.min(take, r.quantity - r.issued);
    r.issued += use;
    if (r.issued >= r.quantity) r.status = 'Fulfilled';
    take -= use;
  }
  stock.onHand -= p.quantity;
  stock.reserved = Math.max(0, stock.reserved - fromReserve);
  if (!serials.length) stock.withTechnician = (stock.withTechnician ?? 0) + p.quantity;
  serials.forEach((s) => {
    const u = unitBySerial(d, s)!;
    Object.assign(u, { status: 'Issued', technicianName: p.technicianName.trim(), jobId: links.jobId, workOrderId: links.workOrderId, serviceChangeId: links.serviceChangeId, customerId: links.customerId, connectionId: links.connectionId });
    unitEvent(u, actor, at, 'Issued', `To ${p.technicianName.trim()}${links.jobId ? ` for ${links.jobId}` : links.workOrderId ? ` for ${links.workOrderId}` : ''}`);
  });
  return pushMovement(d, {
    branchId: warehouseBranch(p.warehouse), itemName: stock.name, sku: p.sku, quantity: p.quantity, unit: stock.unit, type: 'Issue', from: p.warehouse, to: p.technicianName.trim(),
    ...links, serial: serials[0], serials: serials.length ? serials : undefined, technicianName: p.technicianName.trim(), reservationId: own[0]?.id, note: p.note?.trim() || undefined, at, byName: actor.name
  });
}

/** Records a physical return. Nothing is added back to stock until inspection. */
export function logReturn(
d: DemoDatabase,
p: {sku: string;warehouse: string;quantity: number;serials: string[];source: ReturnSource;fromName: string;links: StockLinks;},
actor: Actor,
at: string)
: StockReturn {
  const serials = checkQuantity(d, p.sku, p.quantity, p.serials);
  const links = resolveLinks(d, p.links);
  const stock = ensureStock(d, p.sku, p.warehouse);
  if (!p.fromName.trim()) stop('Say who handed the items back.');
  if (serials.length) {
    for (const s of serials) {
      const u = unitBySerial(d, s);
      if (!u || u.sku !== p.sku) stop(`Serial ${s} is not a recorded ${stock.name}.`);
      const okStatus = p.source === 'Technician (unused)' ? ['Issued'] : ['Installed', 'Receivable'];
      if (!okStatus.includes(u!.status)) stop(`Serial ${s} is ${describeUnit(u!)} and cannot be returned from ${p.source.toLowerCase()}.`);
      if (u!.ownership === 'Customer-owned' || u!.ownership === 'Associate-owned') stop(`Serial ${s} is ${u!.ownership.toLowerCase()} — it is not returned to IOL stock.`);
    }
  } else if (p.source === 'Technician (unused)') {
    const held = stock.withTechnician ?? 0;
    if (p.quantity > held) stop(`Only ${held} ${stock.unit} of ${stock.name} is recorded as with technicians from ${p.warehouse}.`);
    stock.withTechnician = held - p.quantity;
  } else {
    stock.installed = Math.max(0, (stock.installed ?? 0) - p.quantity);
  }
  serials.forEach((s) => {
    const u = unitBySerial(d, s)!;
    u.status = 'Awaiting Inspection';
    u.warehouse = p.warehouse;
    u.branchId = warehouseBranch(p.warehouse);
    unitEvent(u, actor, at, 'Returned', `${p.source} — from ${p.fromName.trim()}${u.connectionId ? ` (${u.connectionId})` : ''}; awaiting inspection`);
  });
  const r: StockReturn = {
    id: nextId(d.stockReturns, 'RT-2026-', 4), sku: p.sku, warehouse: p.warehouse, quantity: p.quantity, serials, source: p.source, fromName: p.fromName.trim(), ...links,
    receivedAt: at, receivedBy: actor.name, status: 'Awaiting Inspection', branchId: warehouseBranch(p.warehouse)
  };
  d.stockReturns.unshift(r);
  return r;
}

const OWNERSHIP_FROM_JOB: Record<string, Ownership> = { 'IOL-owned (returnable)': 'IOL-owned', 'Sold to customer': 'Customer-owned', 'Customer-owned': 'Customer-owned' };

/** Checks job equipment serials against inventory before they are saved or installed. */
export function checkJobSerials(d: DemoDatabase, jobId: string, connectionId: string, lines: {serial: string;ownership: string;}[]) {
  for (const l of lines) {
    const u = unitBySerial(d, l.serial);
    if (!u) continue;
    if ((u.status === 'Installed' || u.status === 'Receivable') && u.connectionId !== connectionId) stop(`Serial ${u.serial} is already ${describeUnit(u)}. A serial can have only one active allocation.`);
    if (u.status === 'Issued' && u.jobId && u.jobId !== jobId) stop(`Serial ${u.serial} is ${describeUnit(u)}, not this job.`);
    if (u.status === 'In Stock' && OWNERSHIP_FROM_JOB[l.ownership] === 'IOL-owned') stop(`Serial ${u.serial} is still in stock at ${u.warehouse}. Inventory must issue it first.`);
    if (['Awaiting Inspection', 'Damaged', 'Lost'].includes(u.status)) stop(`Serial ${u.serial} is ${u.status.toLowerCase()} and cannot be installed.`);
  }
}

/** Installation identifies where issued equipment was deployed. */
export function installJobEquipment(
d: DemoDatabase,
p: {jobId: string;connectionId: string;siteId: string;customerId: string;deployedAt: string;equipment: {item: string;serial: string;ownership: string;}[];},
actor: Actor,
at: string)
{
  checkJobSerials(d, p.jobId, p.connectionId, p.equipment);
  for (const e of p.equipment) {
    const ownership = OWNERSHIP_FROM_JOB[e.ownership] ?? 'IOL-owned';
    const u = unitBySerial(d, e.serial);
    if (!u && ownership === 'IOL-owned') stop(`Serial ${normaliseSerial(e.serial)} was never issued from inventory. Ask Inventory to issue it, or correct the serial.`);
    if (u && u.status === 'Installed' && u.connectionId === p.connectionId) continue;
    const target: EquipmentUnit =
    u ??
    (() => {
      const sku = d.inventoryItems.find((i) => i.name === e.item)?.sku ?? NON_STOCK_SKU;
      const nu: EquipmentUnit = { id: nextId(d.equipmentUnits, 'EQ-', 5), sku, itemName: e.item, serial: normaliseSerial(e.serial), status: 'Installed', ownership, warehouse: '', branchId: d.installationJobs.find((j) => j.id === p.jobId)!.branchId, history: [] };
      d.equipmentUnits.push(nu);
      return nu;
    })();
    Object.assign(target, { status: 'Installed', ownership, jobId: p.jobId, connectionId: p.connectionId, siteId: p.siteId, customerId: p.customerId, deployedAt: p.deployedAt, technicianName: undefined });
    unitEvent(target, actor, at, 'Installed', `At ${p.connectionId} (${p.jobId}) on ${formatDhakaDate(p.deployedAt)} · ${ownership}`);
    if (u) {
      pushMovement(d, {
        branchId: target.branchId, itemName: itemOf(d, target.sku)?.name ?? e.item, sku: target.sku, quantity: 1, unit: 'pc', type: 'Installation', from: u.technicianName ? `${u.technicianName}` : 'Technician', to: p.connectionId,
        jobId: p.jobId, customerId: p.customerId, connectionId: p.connectionId, serial: target.serial, serials: [target.serial], at, byName: actor.name
      });
    }
  }
}

/** Consumables used on site move from "with technician" to "installed". */
export function consumeJobMaterials(d: DemoDatabase, warehouse: string, lines: {sku: string;quantity: number;serialised?: boolean;}[]) {
  lines.forEach((l) => {
    if (l.serialised || l.quantity <= 0) return;
    const s = stockOf(d, l.sku, warehouse);
    if (!s) return;
    s.withTechnician = Math.max(0, (s.withTechnician ?? 0) - l.quantity);
    s.installed = (s.installed ?? 0) + l.quantity;
  });
}

/** On discontinuation approval, returnable IOL equipment at the service becomes receivable. */
export function flagReceivable(d: DemoDatabase, connectionId: string, serviceChangeId: string, actor: Actor, at: string): EquipmentUnit[] {
  const units = d.equipmentUnits.filter((u) => u.connectionId === connectionId && u.status === 'Installed' && isReturnableToIol(d, u));
  units.forEach((u) => {
    u.status = 'Receivable';
    u.receivableSince = at;
    u.serviceChangeId = serviceChangeId;
    unitEvent(u, actor, at, 'Receivable', `Due back to IOL — discontinuation ${serviceChangeId}`);
  });
  return units;
}

/** Technical clearance: receivable units retrieved from site go to the warehouse inspection queue. */
export function returnReceivables(d: DemoDatabase, connectionId: string, serviceChangeId: string, warehouse: string, fromName: string, actor: Actor, at: string): StockReturn[] {
  const units = d.equipmentUnits.filter((u) => u.connectionId === connectionId && u.status === 'Receivable');
  const bySku = new Map<string, string[]>();
  units.forEach((u) => bySku.set(u.sku, [...(bySku.get(u.sku) ?? []), u.serial]));
  return Array.from(bySku.entries()).map(([sku, serials]) =>
  logReturn(d, { sku, warehouse, quantity: serials.length, serials, source: 'Discontinuation', fromName, links: { serviceChangeId, connectionId } }, actor, at)
  );
}