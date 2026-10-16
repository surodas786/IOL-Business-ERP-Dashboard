import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { formatBDT, formatCount } from '../../utils/format';
import type { ComparisonRow, MetricColumn } from '../../utils/metrics';

interface BranchComparisonTableProps {
  title: string;
  subtitle: string;
  columns: MetricColumn[];
  rows: ComparisonRow[];
  total: ComparisonRow;
  firstColumnLabel: string;
  onDrillIn?: (rowId: string) => void;
  onBack?: () => void;
  footnote?: string;
}

export function BranchComparisonTable({
  title,
  subtitle,
  columns,
  rows,
  total,
  firstColumnLabel,
  onDrillIn,
  onBack,
  footnote
}: BranchComparisonTableProps) {
  const maxByKey = Object.fromEntries(columns.map((c) => [c.key, Math.max(1, ...rows.map((r) => r.values[c.key]))]));
  const fmt = (c: MetricColumn, v: number) => c.format === 'bdt' ? formatBDT(v) : formatCount(v);

  return (
    <section aria-labelledby="comparison-title" className="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
        <div className="min-w-0">
          <h2 id="comparison-title" className="text-[13px] font-bold text-slate-900">
            {title}
          </h2>
          <p className="mt-px text-[10.5px] text-slate-400">{subtitle}</p>
        </div>
        {onBack &&
        <button
          type="button"
          onClick={onBack}
          className="flex flex-shrink-0 items-center gap-1 text-[11.5px] font-semibold text-primary hover:text-primary-hover">
          
            <ArrowLeftIcon className="h-3 w-3" aria-hidden />
            All branches
          </button>
        }
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th scope="col" className="border-b border-slate-200 px-3 py-[7px] text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {firstColumnLabel}
              </th>
              {columns.map((c) =>
              <th key={c.key} scope="col" className="whitespace-nowrap border-b border-slate-200 px-3 py-[7px] text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {c.label}
                </th>
              )}
              <th scope="col" className="whitespace-nowrap border-b border-slate-200 px-3 py-[7px] text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Open Tasks
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
            <tr key={r.id} className="transition-colors duration-100 hover:bg-slate-50">
                <th scope="row" className="border-b border-slate-100 px-3 py-2 text-left">
                  {onDrillIn ?
                <button
                  type="button"
                  onClick={() => onDrillIn(r.id)}
                  title={`Show zones in ${r.label}`}
                  className="flex items-center gap-[7px] text-[12px] font-semibold text-slate-900 hover:text-primary">
                  
                      <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                      {r.label}
                    </button> :

                <span className="flex items-center gap-[7px] text-[12px] font-semibold text-slate-900">
                      <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                      {r.label}
                    </span>
                }
                </th>
                {columns.map((c) =>
              <td key={c.key} className="min-w-[108px] border-b border-slate-100 px-3 py-2 text-right align-middle">
                    <div className="text-[12px] font-semibold tabular-nums text-slate-900">{fmt(c, r.values[c.key])}</div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                    className={`h-full rounded-full ${c.barClass}`}
                    style={{ width: `${r.values[c.key] / maxByKey[c.key] * 100}%` }} />
                  
                    </div>
                  </td>
              )}
                <td className="border-b border-slate-100 px-3 py-2 text-right">
                  <span
                  className={`text-[12.5px] font-bold tabular-nums ${
                  r.openTasks >= 10 ? 'text-status-critical' : r.openTasks >= 5 ? 'text-status-warning' : 'text-slate-700'}`
                  }>
                  
                    {r.openTasks}
                  </span>
                </td>
              </tr>
            )}
            <tr className="bg-slate-50">
              <th scope="row" className="border-t-2 border-slate-200 px-3 py-2 text-left text-[12px] font-bold text-slate-900">
                {total.label}
              </th>
              {columns.map((c) =>
              <td key={c.key} className="border-t-2 border-slate-200 px-3 py-2 text-right text-[12px] font-bold tabular-nums text-slate-900">
                  {fmt(c, total.values[c.key])}
                </td>
              )}
              <td className="border-t-2 border-slate-200 px-3 py-2 text-right text-[12.5px] font-bold tabular-nums text-slate-900">
                {total.openTasks}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-slate-100 px-3.5 py-[7px] text-[10px] text-slate-400">
        {columns.map((c) =>
        <span key={c.key} className="flex items-center">
            <span className={`mr-1 inline-block h-[7px] w-[7px] rounded-sm ${c.swatchClass}`} aria-hidden />
            {c.label}
          </span>
        )}
        {footnote && <span className="ml-auto">{footnote}</span>}
      </div>
    </section>);

}