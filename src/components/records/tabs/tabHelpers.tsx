import React from 'react';
import { StatusBadge } from '../StatusBadge';
import type { Role } from '../../../types/erp';
import type { BranchId } from '../../../types/erp';
import type { DemoDatabase, EntityType } from '../../../types/records';
import type { TableColumn, TableRow } from '../RecordTable';

export interface TabDef {
  id: string;
  label: string;
  columns: TableColumn[];
  rows: TableRow[];
}

export interface ViewCtx {
  db: DemoDatabase;
  role: Role;
  fin: boolean;
  pipe: boolean;
  margin: boolean;
  comm: boolean;
  tech: boolean;
}

export interface Col<T> {
  label: string;
  align?: 'right';
  show?: boolean;
  cell: (r: T) => React.ReactNode;
}

export function makeTab<T extends {id: string;branchId?: BranchId | null;zoneId?: string;}>(
id: string,
label: string,
type: EntityType | null,
records: T[],
cols: Col<T>[])
: TabDef {
  const visible = cols.filter((c) => c.show !== false);
  return {
    id,
    label,
    columns: visible.map((c) => ({ label: c.label, align: c.align })),
    rows: records.map((r) => ({
      key: r.id,
      ref: type ? { type, id: r.id } : undefined,
      branchId: r.branchId ?? null,
      zoneId: r.zoneId,
      cells: visible.map((c) => c.cell(r))
    }))
  };
}

export function IdCell({ id }: {id: string;}) {
  return <span className="whitespace-nowrap font-mono text-[11px] text-slate-500">{id}</span>;
}

export function NameCell({ name, sub }: {name: string;sub?: string;}) {
  return (
    <span className="block min-w-[140px]">
      <span className="block font-semibold text-slate-900">{name}</span>
      {sub && <span className="block text-[11px] text-slate-500">{sub}</span>}
    </span>);

}

export function Status({ value }: {value: string;}) {
  return <StatusBadge status={value} />;
}