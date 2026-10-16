import React from 'react';
import { tdClass, thClass } from '../admin/AdminPanel';

export interface CustomerColumn<T> {
  label: string;
  cell: (row: T) => React.ReactNode;
  align?: 'right';
  className?: string;
}

interface CustomerTableProps<T> {
  columns: CustomerColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onOpen?: (row: T) => void;
  empty: string;
  minWidth?: number;
}

/** Compact table used inside customer tabs. Rows open the linked record when onOpen is set. */
export function CustomerTable<T>({ columns, rows, rowKey, onOpen, empty, minWidth = 640 }: CustomerTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c) =>
            <th key={c.label} className={`${thClass} ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 &&
          <tr>
              <td colSpan={columns.length} className={`${tdClass} py-8 text-center text-slate-500`}>
                {empty}
              </td>
            </tr>
          }
          {rows.map((r) =>
          <tr
            key={rowKey(r)}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen ? () => onOpen(r) : undefined}
            onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(r) : undefined}
            className={onOpen ? 'cursor-pointer outline-none hover:bg-slate-50 focus-visible:bg-slate-50' : ''}>
            
              {columns.map((c) =>
            <td key={c.label} className={`${tdClass} ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className ?? ''}`}>
                  {c.cell(r)}
                </td>
            )}
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}