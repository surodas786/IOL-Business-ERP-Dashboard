import { roles } from '../data/roles';
import { branches } from '../data/branches';
import { hasPermission } from './access';
import { formatBDT, formatDhakaDate } from './format';
import { nextId } from './relations';
import { WAREHOUSES, isSerial, itemOf, normaliseSerial, stockOf, warehouseBranch } from './inventoryRules';
import { StockError, checkQuantity, ensureStock, issueStock, logReturn, pushMovement, releaseReservation, reserveStock, unitBySerial, type StockLinks } from './stockOps';
import type { ModuleId, Permission } from '../types/erp';
import type { Approval, DemoDatabase, EntityRef } from '../types/records';
import type { AdjustmentKind, EquipmentUnit, InventoryItem, PriceBreak, ReturnSource, StockAdjustment } from '../types/inventory';
import type { Actor, WorkflowResult } from './workflow';

export type InventoryAction =
{type: 'INV_SAVE_ITEM';item: InventoryItem;isNew: boolean;} |
{type: 'INV_RECEIVE';sku: string;warehouse: string;quantity: number;serials: string[];vendorId: string;unitPrice: number;reference: string;receivedAt: string;breaks: PriceBreak[];} |
{type: 'INV_RESERVE';sku: string;warehouse: string;quantity: number;links: StockLinks;note?: string;} |
{type: 'INV_RELEASE';reservationId: string;reason: string;} |
{type: 'INV_ISSUE';sku: string;warehouse: string;quantity: number;serials: string[];technicianName: string;links: StockLinks;reservationId?: string;note?: string;} |
{type: 'INV_INSTALL';serial: string;connectionId: string;deployedAt: string;} |
{type: 'INV_TRANSFER';sku: string;from: string;to: string;quantity: number;serials: string[];reference: string;note?: string;} |
{type: 'INV_LOG_RETURN';sku: string;warehouse: string;quantity: number;serials: string[];source: ReturnSource;fromName: string;links: StockLinks;} |
{type: 'INV_INSPECT';returnId: string;outcomes: Record<string, 'Good' | 'Damaged'>;good: number;damaged: number;notes: string;} |
{type: 'INV_REQUEST_ADJUSTMENT';sku: string;warehouse: string;kind: AdjustmentKind;direction: 'Increase' | 'Decrease';quantity: number;serials: string[];reason: string;};

export function isInventoryAction(a: {type: string;}): a is InventoryAction {
  return a.type.startsWith('INV_');
}

const MIN_REASON = 20;

/** Applies an approved adjustment to the draft. Throws StockError if it would break a stock rule. */
function applyAdjustment(d: DemoDatabase, a: StockAdjustment, actor: Actor, at: string) {
  const item = itemOf(d, a.sku);
  if (!item) throw new StockError(`Unknown item ${a.sku}.`);
  const stock = ensureStock(d, a.sku, a.warehouse);
  const serial = item.tracking === 'Serial';
  if (serial && a.serials.length !== a.quantity) throw new StockError(`Enter exactly ${a.quantity} serial number(s).`);
  let onHandDelta = 0;
  if (a.direction === 'Decrease') {
    if (serial) {
      for (const s of a.serials) {
        const u = unitBySerial(d, s);
        if (!u || u.sku !== a.sku) throw new StockError(`Serial ${s} is not a recorded ${item.name}.`);
        if (u.status === 'In Stock') {
          if (u.warehouse !== a.warehouse) throw new StockError(`Serial ${s} is held at ${u.warehouse}.`);
          onHandDelta -= 1;
        } else if (a.kind === 'Lost' && ['Issued', 'Installed', 'Receivable'].includes(u.status)) {

          // Lost with a technician or at a customer site — warehouse on-hand is unaffected.
        } else throw new StockError(`Serial ${s} is ${u.status.toLowerCase()} and cannot be adjusted as ${a.kind.toLowerCase()}.`);}
    } else onHandDelta = -a.quantity;
    if (stock.onHand + onHandDelta < 0) throw new StockError(`Only ${stock.onHand} ${stock.unit} on hand at ${a.warehouse}. Stock cannot go negative.`);
    if (stock.onHand + onHandDelta < stock.reserved) throw new StockError(`${stock.reserved} ${stock.unit} is reserved at ${a.warehouse}. Release reservations before reducing stock below that.`);
  } else {
    if (a.kind === 'Damaged' || a.kind === 'Lost') throw new StockError('Damage and loss can only reduce stock.');
    if (serial) {
      for (const s of a.serials) {
        const u = unitBySerial(d, s);
        if (u && u.status !== 'Lost') throw new StockError(`Serial ${s} already exists (${u.status.toLowerCase()}). Duplicate serials are blocked.`);
      }
    }
    onHandDelta = a.quantity;
  }

  stock.onHand += onHandDelta;
  if (!serial && (a.kind === 'Damaged' || a.kind === 'Lost')) stock.damaged = (stock.damaged ?? 0) + a.quantity;
  if (serial) {
    a.serials.forEach((s) => {
      const existing = unitBySerial(d, s);
      if (a.direction === 'Increase') {
        const u: EquipmentUnit = existing ?? { id: nextId(d.equipmentUnits, 'EQ-', 5), sku: a.sku, serial: normaliseSerial(s), status: 'In Stock', ownership: 'IOL-owned', warehouse: a.warehouse, branchId: warehouseBranch(a.warehouse), history: [] };
        if (!existing) d.equipmentUnits.push(u);
        Object.assign(u, { status: 'In Stock', warehouse: a.warehouse, technicianName: undefined, customerId: undefined, connectionId: undefined, siteId: undefined, jobId: undefined });
        u.history = [...u.history, { at, byName: actor.name, event: a.kind, detail: `${a.id} approved — added to ${a.warehouse}` }];
      } else {
        const u = existing!;
        u.status = a.kind === 'Damaged' ? 'Damaged' : 'Lost';
        u.history = [...u.history, { at, byName: actor.name, event: u.status, detail: `${a.id} approved — ${a.reason}` }];
      }
    });
  }
  pushMovement(d, {
    branchId: a.branchId, itemName: stock.name, sku: a.sku, quantity: a.quantity, unit: stock.unit, type: 'Adjustment',
    from: a.direction === 'Decrease' ? a.warehouse : a.kind, to: a.direction === 'Decrease' ? a.kind : a.warehouse,
    serial: a.serials[0], serials: a.serials.length ? a.serials : undefined, adjustmentId: a.id, note: `${a.direction === 'Decrease' ? '−' : '+'}${a.quantity} · approved by ${actor.name}`, at, byName: actor.name
  });
}

/** Called from DECIDE_APPROVAL for stock adjustments. Returns an error to block the decision. */
export function afterInventoryApproval(d: DemoDatabase, ap: Approval, approved: boolean, actor: Actor, at: string): string | undefined {
  const a = d.stockAdjustments.find((x) => x.id === ap.stockAdjustmentId);
  if (!a || a.status !== 'Pending Approval') return 'This adjustment is no longer pending.';
  if (approved) {
    try {
      applyAdjustment(d, a, actor, at);
    } catch (e) {
      if (e instanceof StockError) return `Cannot approve — ${e.message}`;
      throw e;
    }
  }
  a.status = approved ? 'Approved' : 'Rejected';
  a.decidedById = actor.id;
  a.decidedAt = at;
  return undefined;
}

export function applyInventoryAction(db: DemoDatabase, action: InventoryAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const role = roles.find((r) => r.id === d.users.find((u) => u.id === actor.id)?.role);
  if (!role || !role.modules.includes('inventory') || !hasPermission(role, 'manageStock')) return fail('Only Inventory can record stock transactions.');

  const audit = (act: string, summary: string, related: EntityRef[] = []) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity: related[0] ?? { type: 'user', id: actor.id }, related });
  const notify = (n: {title: string;detail: string;module: ModuleId;requires?: Permission[];entity: EntityRef;}) =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], branchId: null, ...n });
  const refsFor = (l: StockLinks): EntityRef[] => [
  ...(l.jobId ? [{ type: 'installationJob' as const, id: l.jobId }] : []),
  ...(l.workOrderId ? [{ type: 'workOrder' as const, id: l.workOrderId }] : []),
  ...(l.serviceChangeId ? [{ type: 'serviceChange' as const, id: l.serviceChangeId }] : []),
  ...(l.customerId ? [{ type: 'customer' as const, id: l.customerId }] : []),
  ...(l.connectionId ? [{ type: 'connection' as const, id: l.connectionId }] : [])];

  const checkWarehouse = (w: string) => {
    if (!WAREHOUSES.includes(w)) throw new StockError('Choose a warehouse.');
  };

  try {
    switch (action.type) {
      case 'INV_SAVE_ITEM':{
          const it = { ...action.item, sku: action.item.sku.trim().toUpperCase(), name: action.item.name.trim(), unit: action.item.unit.trim() };
          if (!/^[A-Z0-9-]{3,24}$/.test(it.sku)) return fail('SKU must be 3–24 letters, numbers or hyphens.');
          if (it.name.length < 3) return fail('Enter the item name.');
          if (!it.unit) return fail('Enter the unit of measure.');
          if (it.reorderLevel < 0) return fail('Reorder level cannot be negative.');
          if (it.tracking === 'Serial' && it.unit !== 'pc') return fail('Serial-tracked equipment is counted in pieces (pc).');
          if (it.tracking === 'Serial' && !(it.usableLifeMonths && it.usableLifeMonths > 0)) return fail('Enter the estimated usable life in months for serial-tracked equipment.');
          const existing = d.inventoryItems.find((x) => x.sku === it.sku);
          if (action.isNew) {
            if (existing) return fail(`SKU ${it.sku} already exists.`);
            if (d.inventoryItems.some((x) => x.name.toLowerCase() === it.name.toLowerCase())) return fail(`An item named “${it.name}” already exists.`);
            d.inventoryItems.push(it);
            audit('Item created', `${it.sku} — ${it.name} (${it.tracking === 'Serial' ? 'serial-tracked' : 'quantity-based'})`);
            return ok(`${it.sku} added to the item master.`);
          }
          if (!existing) return fail('Item not found.');
          const hasStock = d.stockItems.some((s) => s.sku === it.sku && (s.onHand > 0 || s.reserved > 0)) || d.equipmentUnits.some((u) => u.sku === it.sku);
          if (existing.tracking !== it.tracking && hasStock) return fail('Tracking mode cannot change once stock or serials exist for this item.');
          if (existing.unit !== it.unit && hasStock) return fail('Unit cannot change once stock exists.');
          Object.assign(existing, it);
          d.stockItems.filter((s) => s.sku === it.sku).forEach((s) => s.name = it.name);
          audit('Item updated', `${it.sku} — ${it.name}${it.active ? '' : ' (inactive)'}`);
          return ok(`${it.sku} updated.`);
        }

      case 'INV_RECEIVE':{
          checkWarehouse(action.warehouse);
          const item = itemOf(d, action.sku);
          if (!item || !item.active) return fail('Choose an active item.');
          const serials = checkQuantity(d, action.sku, action.quantity, action.serials);
          if (!d.vendors.some((v) => v.id === action.vendorId)) return fail('Choose the vendor.');
          if (!(action.unitPrice > 0)) return fail('Enter the unit purchase price.');
          if (action.reference.trim().length < 4) return fail('Enter the delivery challan or GRN number.');
          if (!action.receivedAt || action.receivedAt > at) return fail('Enter when the goods were received (not in the future).');
          for (const s of serials) {
            const u = unitBySerial(d, s);
            if (u) return fail(`Serial ${s} already exists (${u.status.toLowerCase()}${u.connectionId ? ` at ${u.connectionId}` : u.warehouse ? ` at ${u.warehouse}` : ''}). Duplicate serials are blocked.`);
          }
          const stock = ensureStock(d, action.sku, action.warehouse);
          stock.onHand += action.quantity;
          stock.unitCost = action.unitPrice;
          stock.pricedAt = action.receivedAt;
          serials.forEach((s) =>
          d.equipmentUnits.push({
            id: nextId(d.equipmentUnits, 'EQ-', 5), sku: action.sku, serial: s, status: 'In Stock', ownership: 'IOL-owned', warehouse: action.warehouse, branchId: warehouseBranch(action.warehouse),
            receivedAt: action.receivedAt, vendorId: action.vendorId, unitCost: action.unitPrice, history: [{ at, byName: actor.name, event: 'Received', detail: `Into ${action.warehouse} · ${action.reference.trim()}` }]
          })
          );
          const vendor = d.vendors.find((v) => v.id === action.vendorId)!;
          d.vendorPrices.unshift({
            id: nextId(d.vendorPrices, 'VP-', 4), vendorId: vendor.id, sku: action.sku, purchasedAt: action.receivedAt, quantity: action.quantity, unitPrice: action.unitPrice,
            reference: action.reference.trim(), breaks: action.breaks.filter((b) => b.minQty > 0 && b.unitPrice > 0).sort((a, b) => a.minQty - b.minQty)
          });
          const mv = pushMovement(d, {
            branchId: warehouseBranch(action.warehouse), itemName: item.name, sku: item.sku, quantity: action.quantity, unit: item.unit, type: 'Receipt', from: vendor.name, to: action.warehouse,
            vendorId: vendor.id, reference: action.reference.trim(), unitPrice: action.unitPrice, serial: serials[0], serials: serials.length ? serials : undefined, at: action.receivedAt, byName: actor.name
          });
          audit('Stock received', `${mv.id}: ${action.quantity} ${item.unit} ${item.name} into ${action.warehouse} from ${vendor.name} (${action.reference.trim()}) at ${formatBDT(action.unitPrice)}/${item.unit}`, [{ type: 'inventoryMovement', id: mv.id }]);
          return ok(`${action.quantity} ${item.unit} of ${item.name} received into ${action.warehouse}.`);
        }

      case 'INV_RESERVE':{
          checkWarehouse(action.warehouse);
          const r = reserveStock(d, action, actor, at);
          const item = itemOf(d, r.sku)!;
          audit('Stock reserved', `${r.id}: ${r.quantity} ${item.unit} ${item.name} at ${r.warehouse} — on-hand unchanged`, refsFor(r));
          return ok(`${r.id} holds ${r.quantity} ${item.unit}. Available stock is reduced; on-hand is unchanged.`);
        }

      case 'INV_RELEASE':{
          const r = d.stockReservations.find((x) => x.id === action.reservationId);
          if (!r || r.status !== 'Active') return fail('Only active reservations can be released.');
          if (action.reason.trim().length < 10) return fail('Give a reason of at least 10 characters.');
          const left = r.quantity - r.issued;
          releaseReservation(d, r, action.reason.trim(), at);
          audit('Reservation released', `${r.id}: ${left} ${itemOf(d, r.sku)?.unit ?? ''} returned to available — ${action.reason.trim()}`, refsFor(r));
          return ok(`${r.id} released. ${left} back to available.`);
        }

      case 'INV_ISSUE':{
          checkWarehouse(action.warehouse);
          const mv = issueStock(d, action, actor, at);
          const job = mv.jobId ? d.installationJobs.find((j) => j.id === mv.jobId) : undefined;
          if (job) {
            const line = job.materialLines?.find((m) => m.sku === mv.sku);
            if (line) {
              line.reserved = Math.max(0, line.reserved - Math.min(line.reserved, mv.quantity));
              line.issued += mv.quantity;
            } else {
              job.materialLines = [...(job.materialLines ?? []), { id: `${job.id}-m${(job.materialLines?.length ?? 0) + 1}`, item: mv.itemName, sku: mv.sku, unit: mv.unit, planned: 0, reserved: 0, issued: mv.quantity, consumed: 0, returned: 0, serialised: isSerial(d, mv.sku) }];
            }
            job.history = [...(job.history ?? []), { at, byId: actor.id, kind: 'Material', detail: `Issued from Inventory: ${mv.itemName} ×${mv.quantity}${mv.serials ? ` (${mv.serials.join(', ')})` : ''} to ${mv.technicianName}` }];
          }
          audit('Stock issued', `${mv.id}: ${mv.quantity} ${mv.unit} ${mv.itemName} from ${mv.from} to ${mv.technicianName}${mv.serials ? ` · ${mv.serials.join(', ')}` : ''}`, [{ type: 'inventoryMovement', id: mv.id }, ...refsFor(mv)]);
          return ok(`${mv.id}: ${mv.quantity} ${mv.unit} issued to ${mv.technicianName}. Warehouse on-hand reduced.`);
        }

      case 'INV_INSTALL':{
          const u = unitBySerial(d, action.serial);
          if (!u) return fail('Serial not found.');
          if (u.status !== 'Issued') return fail(`Serial ${u.serial} is ${u.status.toLowerCase()} — only issued equipment can be recorded as installed.`);
          const conn = d.connections.find((c) => c.id === action.connectionId);
          if (!conn) return fail('Choose the service where it was installed.');
          if (u.customerId && u.customerId !== conn.customerId) return fail(`${u.serial} was issued for another customer.`);
          if (!action.deployedAt || action.deployedAt > at) return fail('Enter the deployment date (not in the future).');
          const tech = u.technicianName;
          Object.assign(u, { status: 'Installed', connectionId: conn.id, customerId: conn.customerId, siteId: conn.siteId, deployedAt: action.deployedAt, technicianName: undefined });
          u.history = [...u.history, { at, byName: actor.name, event: 'Installed', detail: `At ${conn.id} on ${formatDhakaDate(action.deployedAt)} · ${u.ownership}` }];
          const mv = pushMovement(d, {
            branchId: conn.branchId, itemName: itemOf(d, u.sku)?.name ?? u.sku, sku: u.sku, quantity: 1, unit: 'pc', type: 'Installation', from: tech ?? 'Technician', to: conn.id,
            jobId: u.jobId, workOrderId: u.workOrderId, serviceChangeId: u.serviceChangeId, customerId: conn.customerId, connectionId: conn.id, serial: u.serial, serials: [u.serial], at, byName: actor.name
          });
          audit('Equipment deployed', `${mv.id}: ${u.serial} installed at ${conn.id}`, [{ type: 'inventoryMovement', id: mv.id }, { type: 'customer', id: conn.customerId }, { type: 'connection', id: conn.id }]);
          return ok(`${u.serial} recorded at ${conn.id}.`);
        }

      case 'INV_TRANSFER':{
          checkWarehouse(action.from);
          checkWarehouse(action.to);
          if (action.from === action.to) return fail('Choose two different warehouses.');
          if (action.reference.trim().length < 4) return fail('Enter the transfer note number.');
          const serials = checkQuantity(d, action.sku, action.quantity, action.serials);
          const src = stockOf(d, action.sku, action.from);
          if (!src) return fail(`No ${itemOf(d, action.sku)?.name ?? action.sku} at ${action.from}.`);
          const free = src.onHand - src.reserved;
          if (action.quantity > free) return fail(`Only ${Math.max(0, free)} ${src.unit} available to transfer from ${action.from} (on hand ${src.onHand}, reserved ${src.reserved}). Stock cannot go negative.`);
          for (const s of serials) {
            const u = unitBySerial(d, s);
            if (!u || u.sku !== action.sku) return fail(`Serial ${s} is not a recorded ${src.name}.`);
            if (u.status !== 'In Stock' || u.warehouse !== action.from) return fail(`Serial ${s} is not in stock at ${action.from}.`);
          }
          const dst = ensureStock(d, action.sku, action.to);
          src.onHand -= action.quantity;
          dst.onHand += action.quantity;
          if (!dst.unitCost) dst.unitCost = src.unitCost;
          serials.forEach((s) => {
            const u = unitBySerial(d, s)!;
            u.warehouse = action.to;
            u.branchId = warehouseBranch(action.to);
            u.history = [...u.history, { at, byName: actor.name, event: 'Transferred', detail: `${action.from} → ${action.to} · ${action.reference.trim()}` }];
          });
          const mv = pushMovement(d, {
            branchId: warehouseBranch(action.to), itemName: src.name, sku: action.sku, quantity: action.quantity, unit: src.unit, type: 'Transfer', from: action.from, to: action.to,
            reference: action.reference.trim(), serial: serials[0], serials: serials.length ? serials : undefined, note: action.note?.trim() || undefined, at, byName: actor.name
          });
          audit('Stock transferred', `${mv.id}: ${action.quantity} ${src.unit} ${src.name} ${action.from} → ${action.to}`, [{ type: 'inventoryMovement', id: mv.id }]);
          return ok(`${action.quantity} ${src.unit} moved to ${action.to}.`);
        }

      case 'INV_LOG_RETURN':{
          checkWarehouse(action.warehouse);
          const r = logReturn(d, action, actor, at);
          const item = itemOf(d, r.sku)!;
          audit('Return received', `${r.id}: ${r.quantity} ${item.unit} ${item.name} from ${r.fromName} (${r.source}) — awaiting inspection; stock not yet restored`, refsFor(r));
          return ok(`${r.id} logged. Stock is restored only after inspection.`);
        }

      case 'INV_INSPECT':{
          const r = d.stockReturns.find((x) => x.id === action.returnId);
          if (!r || r.status !== 'Awaiting Inspection') return fail('This return is already inspected.');
          const stock = ensureStock(d, r.sku, r.warehouse);
          let good = action.good;
          let damaged = action.damaged;
          if (r.serials.length) {
            const missing = r.serials.filter((s) => !action.outcomes[s]);
            if (missing.length) return fail(`Record an outcome for ${missing.join(', ')}.`);
            good = r.serials.filter((s) => action.outcomes[s] === 'Good').length;
            damaged = r.serials.length - good;
          }
          if (good < 0 || damaged < 0 || good + damaged !== r.quantity) return fail(`Good and damaged must add up to ${r.quantity} ${stock.unit}.`);
          if (damaged > 0 && action.notes.trim().length < 10) return fail('Describe the damage (at least 10 characters).');
          stock.onHand += good;
          stock.returnedTotal = (stock.returnedTotal ?? 0) + r.quantity;
          if (!r.serials.length) stock.damaged = (stock.damaged ?? 0) + damaged;
          r.serials.forEach((s) => {
            const u = unitBySerial(d, s);
            if (!u) return;
            const isGood = action.outcomes[s] === 'Good';
            Object.assign(u, {
              status: isGood ? 'In Stock' : 'Damaged', technicianName: undefined, jobId: undefined, workOrderId: undefined, customerId: undefined, siteId: undefined, connectionId: undefined,
              deployedAt: undefined, receivableSince: undefined, ownership: 'IOL-owned', warehouse: r.warehouse
            });
            if (u.history.length && r.serviceChangeId) u.serviceChangeId = undefined;
            u.history = [...u.history, { at, byName: actor.name, event: isGood ? 'Inspected — good' : 'Inspected — damaged', detail: `${r.id}${action.notes.trim() ? ` · ${action.notes.trim()}` : ''}` }];
          });
          r.status = 'Inspected';
          r.inspection = { at, byName: actor.name, good, damaged, serialOutcomes: r.serials.length ? action.outcomes : undefined, notes: action.notes.trim() };
          const mv = pushMovement(d, {
            branchId: r.branchId, itemName: stock.name, sku: r.sku, quantity: good, unit: stock.unit, type: 'Return', from: r.fromName, to: r.warehouse,
            jobId: r.jobId, serviceChangeId: r.serviceChangeId, customerId: r.customerId, connectionId: r.connectionId, returnId: r.id,
            serial: r.serials.find((s) => action.outcomes[s] === 'Good'), serials: r.serials.length ? r.serials.filter((s) => action.outcomes[s] === 'Good') : undefined,
            note: damaged ? `${damaged} ${stock.unit} damaged — not restocked` : undefined, at, byName: actor.name
          });
          audit('Return inspected', `${r.id}: ${good} good restocked at ${r.warehouse}${damaged ? `, ${damaged} damaged` : ''}`, [{ type: 'inventoryMovement', id: mv.id }, ...refsFor(r)]);
          return ok(`${r.id} inspected — ${good} ${stock.unit} back in stock${damaged ? `, ${damaged} recorded as damaged` : ''}.`);
        }

      case 'INV_REQUEST_ADJUSTMENT':{
          checkWarehouse(action.warehouse);
          const item = itemOf(d, action.sku);
          if (!item) return fail('Choose an item.');
          if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason of at least ${MIN_REASON} characters.`);
          const serials = checkQuantity(d, action.sku, action.quantity, action.serials);
          const direction = action.kind === 'Damaged' || action.kind === 'Lost' ? 'Decrease' : action.kind === 'Found' ? 'Increase' : action.direction;
          const clash = d.stockAdjustments.find((a) => a.status === 'Pending Approval' && a.sku === action.sku && (serials.some((s) => a.serials.includes(s)) || !serials.length && a.warehouse === action.warehouse));
          if (clash) return fail(`${clash.id} is already pending for ${serials.length ? 'one of these serials' : 'this item at this warehouse'}. Wait for its decision first.`);
          const adj: StockAdjustment = {
            id: nextId(d.stockAdjustments, 'SA-2026-', 4), sku: action.sku, warehouse: action.warehouse, kind: action.kind, direction, quantity: action.quantity, serials, reason: action.reason.trim(),
            requestedById: actor.id, requestedAt: at, status: 'Pending Approval', approvalId: '', branchId: warehouseBranch(action.warehouse)
          };
          // Dry run so impossible adjustments are rejected now, not at approval.
          applyAdjustment(structuredClone(d), adj, actor, at);
          const stock = stockOf(d, action.sku, action.warehouse);
          const apId = nextId(d.approvals, 'AP-2026-', 4);
          const zone = branches.find((b) => b.id === adj.branchId)?.zones[0]?.id ?? '';
          d.approvals.unshift({
            id: apId, type: 'Stock Adjustment', title: `Stock adjustment ${adj.id} — ${action.warehouse}`,
            detail: `${action.kind} · ${direction === 'Decrease' ? '−' : '+'}${action.quantity} ${item.name}${serials.length ? ` (${serials.join(', ')})` : ''} · ${action.reason.trim()}`,
            amount: Math.round(action.quantity * (stock?.unitCost ?? 0)), entity: { type: 'approval', id: apId }, related: [], requestedById: actor.id, requestedAt: at,
            requiredPermission: 'approveFinancial', status: 'Pending', stockAdjustmentId: adj.id, branchId: adj.branchId, zoneId: zone
          });
          adj.approvalId = apId;
          d.stockAdjustments.unshift(adj);
          audit('Adjustment requested', `${adj.id}: ${action.kind} ${direction === 'Decrease' ? '−' : '+'}${action.quantity} ${item.name} at ${action.warehouse} — ${action.reason.trim()}`, [{ type: 'approval', id: apId }]);
          notify({ title: 'Stock adjustment awaiting approval', detail: `${adj.id} · ${item.name} · ${action.warehouse}`, module: 'approvals', requires: ['approveFinancial'], entity: { type: 'approval', id: apId } });
          return ok(`${adj.id} sent to the Finance Approver. Stock changes only after approval.`);
        }
    }
  } catch (e) {
    if (e instanceof StockError) return fail(e.message);
    throw e;
  }
  return fail('Unknown action.');
}