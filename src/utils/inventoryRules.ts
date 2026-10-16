import { branches } from '../data/branches';
import { hasPermission } from './access';
import { demoNow } from './format';
import type { BranchId, Role } from '../types/erp';
import type { DemoDatabase } from '../types/records';
import type { StockItem } from '../types/survey';
import type { EquipmentUnit, InventoryItem } from '../types/inventory';

/* ---------- permissions (demo only — production must enforce on the server) ---------- */
export const canManageStock = (r: Role) => hasPermission(r, 'manageStock');
/** Unit cost and vendor prices: Inventory, Finance and margin-holders only. */
export const canSeeCost = (r: Role) => hasPermission(r, 'manageStock') || hasPermission(r, 'viewFinancials') || hasPermission(r, 'viewMargins');

/* ---------- warehouses ---------- */
export const WAREHOUSES: string[] = Array.from(new Set(branches.map((b) => b.warehouse)));

export function warehouseBranch(warehouse: string): BranchId {
  return (branches.find((b) => b.warehouse === warehouse)?.id ?? branches[0].id) as BranchId;
}
export function warehouseForBranch(branchId: string): string {
  return branches.find((b) => b.id === branchId)?.warehouse ?? WAREHOUSES[0];
}
/** Top-bar branch filter applied to a warehouse. */
export function warehouseInFilter(warehouse: string, branchFilter: string): boolean {
  return branchFilter === 'all' || branches.some((b) => b.id === branchFilter && b.warehouse === warehouse);
}

export const normaliseSerial = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
/** Splits manual entry (one per line, or comma separated). */
export const parseSerials = (raw: string) =>
raw.
split(/[\n,;]+/).
map(normaliseSerial).
filter(Boolean);

export const itemOf = (db: DemoDatabase, sku: string): InventoryItem | undefined => db.inventoryItems.find((i) => i.sku === sku);
export const stockOf = (db: DemoDatabase, sku: string, warehouse: string): StockItem | undefined => db.stockItems.find((s) => s.sku === sku && s.warehouse === warehouse);
export const isSerial = (db: DemoDatabase, sku: string) => itemOf(db, sku)?.tracking === 'Serial';

export interface StockPosition {
  onHand: number;
  reserved: number;
  available: number;
  withTechnician: number;
  installed: number;
  returned: number;
  damaged: number;
  awaitingInspection: number;
}

/** The seven quantities for one SKU at one warehouse. Serial items count their units; quantity items use counters. */
export function stockPosition(db: DemoDatabase, s: StockItem): StockPosition {
  const awaitingInspection = db.stockReturns.filter((r) => r.sku === s.sku && r.warehouse === s.warehouse && r.status === 'Awaiting Inspection').reduce((n, r) => n + r.quantity, 0);
  const base = { onHand: s.onHand, reserved: s.reserved, available: s.onHand - s.reserved, returned: s.returnedTotal ?? 0, awaitingInspection };
  if (isSerial(db, s.sku)) {
    const units = db.equipmentUnits.filter((u) => u.sku === s.sku && u.warehouse === s.warehouse);
    const count = (...st: EquipmentUnit['status'][]) => units.filter((u) => st.includes(u.status)).length;
    return { ...base, withTechnician: count('Issued'), installed: count('Installed', 'Receivable'), damaged: count('Damaged', 'Lost') };
  }
  return { ...base, withTechnician: s.withTechnician ?? 0, installed: s.installed ?? 0, damaged: s.damaged ?? 0 };
}

/** Expected replacement date = deployment + estimated usable life. */
export function expectedReplacement(db: DemoDatabase, u: EquipmentUnit): string | undefined {
  const life = itemOf(db, u.sku)?.usableLifeMonths;
  if (!u.deployedAt || !life) return undefined;
  const d = new Date(u.deployedAt);
  d.setMonth(d.getMonth() + life);
  return d.toISOString();
}

export type ReplacementState = 'ok' | 'due' | 'overdue' | 'none';
export function replacementState(db: DemoDatabase, u: EquipmentUnit): ReplacementState {
  const r = expectedReplacement(db, u);
  if (!r || !['Installed', 'Receivable'].includes(u.status)) return 'none';
  const now = demoNow().getTime();
  const t = new Date(r).getTime();
  if (t < now) return 'overdue';
  if (t - now < 90 * 86400000) return 'due';
  return 'ok';
}

/** Returnable equipment IOL expects back when a service ends. */
export const isReturnableToIol = (db: DemoDatabase, u: EquipmentUnit) => (u.ownership === 'IOL-owned' || u.ownership === 'Rented') && itemOf(db, u.sku)?.returnable !== false;

export const unitWhere = (u: EquipmentUnit): string => {
  switch (u.status) {
    case 'In Stock':
      return u.warehouse;
    case 'Issued':
      return `With ${u.technicianName ?? 'technician'}${u.jobId ? ` (${u.jobId})` : ''}`;
    case 'Installed':
    case 'Receivable':
      return u.connectionId ? `At ${u.connectionId}` : 'At customer site';
    case 'Awaiting Inspection':
      return `${u.warehouse} — inspection`;
    default:
      return u.warehouse || '—';
  }
};