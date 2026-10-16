import { inUserScope } from '../access';
import { dhakaInputValue } from '../format';
import type { DemoUser, Role } from '../../types/erp';
import type { DemoDatabase } from '../../types/records';
import type { ReportFilters, ReportSection } from '../../types/reports';

export interface ReportCtx {
  db: DemoDatabase;
  f: ReportFilters;
  user: DemoUser;
  role: Role;
  now: Date;
  fromMs: number;
  toMs: number;
  /** Zones matching the division / district filter; null when no geography filter is set. */
  geoZones: Set<string> | null;
}

export function defaultFilters(now: Date, branchId: ReportFilters['branchId'] = 'all'): ReportFilters {
  const to = dhakaInputValue(now.toISOString());
  const from = dhakaInputValue(new Date(now.getTime() - 89 * 86400000).toISOString());
  return { from, to, division: '', district: '', branchId, zoneId: '', category: '', ownerId: '' };
}

/** Ancestors (inclusive) of an administrative area. */
function lineage(db: DemoDatabase, id: string): string[] {
  const out: string[] = [];
  let cur = db.adminAreas.find((a) => a.id === id);
  while (cur && out.length < 6) {
    out.push(cur.id);
    cur = cur.parentId ? db.adminAreas.find((a) => a.id === cur!.parentId) : undefined;
  }
  return out;
}

export function zonesForArea(db: DemoDatabase, areaId: string): Set<string> {
  return new Set(db.operationalZones.filter((z) => z.adminAreaIds.some((a) => lineage(db, a).includes(areaId))).map((z) => z.id));
}

export function makeCtx(db: DemoDatabase, f: ReportFilters, user: DemoUser, role: Role, now: Date): ReportCtx {
  const area = f.district || f.division;
  return {
    db, f, user, role, now,
    fromMs: Date.parse(`${f.from}T00:00:00+06:00`),
    toMs: Date.parse(`${f.to}T23:59:59+06:00`),
    geoZones: area ? zonesForArea(db, area) : null
  };
}

interface Rec {
  branchId?: string | null;
  zoneId?: string;
  at?: string;
  category?: string;
  ownerId?: string;
}

/** User scope first, then every selected filter. Period checks only when a date is supplied. */
export function pass(c: ReportCtx, r: Rec): boolean {
  if (!inUserScope(c.user, r.branchId as never)) return false;
  if (c.user.scopeType === 'zones' && r.zoneId && c.user.zoneIds.length && !c.user.zoneIds.includes(r.zoneId)) return false;
  if (c.f.branchId !== 'all' && r.branchId && r.branchId !== c.f.branchId) return false;
  if (c.f.zoneId && r.zoneId !== c.f.zoneId) return false;
  if (c.geoZones) {
    if (r.zoneId) {
      if (!c.geoZones.has(r.zoneId)) return false;
    } else if (!c.db.operationalZones.some((z) => z.branchId === r.branchId && c.geoZones!.has(z.id))) return false;
  }
  // Category and owner apply only to records that carry them.
  if (c.f.category && 'category' in r && r.category !== c.f.category) return false;
  if (c.f.ownerId && 'ownerId' in r && r.ownerId !== c.f.ownerId) return false;
  if (r.at !== undefined) {
    const t = Date.parse(r.at);
    if (!(t >= c.fromMs && t <= c.toMs)) return false;
  }
  return true;
}

export const inPeriod = (c: ReportCtx, iso?: string) => !!iso && Date.parse(iso) >= c.fromMs && Date.parse(iso) <= c.toMs;
export const periodInRange = (c: ReportCtx, ym: string) => ym >= c.f.from.slice(0, 7) && ym <= c.f.to.slice(0, 7);
export const customerCategory = (c: ReportCtx, customerId?: string) => customerId ? c.db.customers.find((x) => x.id === customerId)?.category : undefined;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const pct = (n: number, d: number) => d ? Math.round(n / d * 1000) / 10 : null;

/** Removes sections, columns and KPIs the role may not see — the same view is used for screen, print and export. */
export function visibleSection(s: ReportSection, role: Role): ReportSection | null {
  const has = (p?: string) => !p || role.permissions.includes(p as never);
  if (!has(s.requires)) return null;
  const columns = s.columns.filter((col) => has(col.requires));
  return { ...s, columns, kpis: s.kpis.filter((k) => has(k.requires)), rows: s.rows.map((r) => Object.fromEntries(columns.map((col) => [col.key, r[col.key] ?? null]))) };
}