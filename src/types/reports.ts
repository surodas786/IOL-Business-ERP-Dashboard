import type { BranchId, Permission } from './erp';

export type ReportGroup = 'sales' | 'technical' | 'finance' | 'management';

export interface ReportFilters {
  /** YYYY-MM-DD, inclusive. Applies to period measures only. */
  from: string;
  to: string;
  division: string;
  district: string;
  branchId: BranchId | 'all';
  zoneId: string;
  category: string;
  ownerId: string;
}

export type CellKind = 'text' | 'money' | 'count' | 'pct' | 'hours' | 'days' | 'date';
export type CellValue = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  kind?: CellKind;
  /** Hidden — and left out of exports — for roles without this permission. */
  requires?: Permission;
}

export interface ReportKpi {
  label: string;
  value: number | null;
  kind: CellKind;
  requires?: Permission;
  note?: string;
  /** Definition shown in a tooltip. */
  tip?: string;
  tone?: 'critical' | 'warning' | 'ok';
}

export interface ReportSection {
  id: string;
  title: string;
  description: string;
  /** Period measures follow the date filter; snapshots are "as of today". */
  basis: 'period' | 'snapshot';
  tip?: string;
  requires?: Permission;
  kpis: ReportKpi[];
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  empty: string;
  note?: string;
}