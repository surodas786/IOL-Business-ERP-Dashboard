import React from 'react';
import type { BranchId } from '../../types/erp';
import type { EntityRef } from '../../types/records';

export interface TableColumn {
  label: string;
  align?: 'right';
}

export interface TableRow {
  key: string;
  ref?: EntityRef;
  branchId?: BranchId | null;
  zoneId?: string;
  cells: React.ReactNode[];
}

interface RecordTableProps {
  columns: TableColumn[];
  rows: TableRow[];
  onOpen: (ref: EntityRef) => void;
  emptyText: string;
}

export function RecordTable({ columns, rows, onOpen, emptyText }: RecordTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) =>
            <th
              key={c.label}
              scope="col"
              className={`whitespace-nowrap border-b border-slate-200 px-3 py-[7px] text-[10px] font-bold uppercase tracking-wide text-slate-400 ${
              c.align === 'right' ? 'text-right' : 'text-left'}`
              }>
              
                {c.label}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 &&
          <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-[12px] text-slate-500">
                {emptyText}
              </td>
            </tr>
          }
          {rows.map((r) =>
          <tr
            key={r.key}
            onClick={r.ref ? () => onOpen(r.ref!) : undefined}
            onKeyDown={r.ref ? (e) => e.key === 'Enter' && onOpen(r.ref!) : undefined}
            tabIndex={r.ref ? 0 : undefined}
            className={`${r.ref ? 'cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none' : ''} transition-colors duration-100`}>
            
              {r.cells.map((cell, i) =>
            <td
              key={columns[i]?.label ?? i}
              className={`border-b border-slate-100 px-3 py-2 align-top text-[12px] text-slate-700 ${
              columns[i]?.align === 'right' ? 'text-right tabular-nums' : ''}`
              }>
              
                  {cell}
                </td>
            )}
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}