import React from 'react';
import { DownloadIcon } from 'lucide-react';
import { formatCell } from '../../utils/reports/export';
import { tdClass, thClass } from '../admin/AdminPanel';
import { InfoTip } from './InfoTip';
import type { ReportSection } from '../../types/reports';

const TONE = { critical: 'text-status-critical', warning: 'text-status-warning', ok: 'text-status-ok' } as const;
const NUMERIC = new Set(['money', 'count', 'pct', 'hours', 'days']);

export function ReportSectionView({ section: s, onExport, exportBlocked }: {section: ReportSection;onExport?: () => void;exportBlocked?: string;}) {
  const headingId = `rs-${s.id}`;
  return (
    <section aria-labelledby={headingId} className="rounded-md border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-1 text-[14px] font-bold text-slate-900">
            {s.title}
            {s.tip && <InfoTip text={s.tip} label={`How ${s.title.toLowerCase()} is calculated`} />}
          </h2>
          <p className="text-[11.5px] text-slate-500">
            {s.description} <span className="font-semibold text-slate-600">· {s.basis === 'period' ? 'Selected period' : 'As of today'}</span>
          </p>
        </div>
        {onExport && s.columns.length > 0 &&
        <button type="button" onClick={onExport} disabled={!!exportBlocked} title={exportBlocked} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary transition-colors duration-150 hover:text-primary-hover disabled:text-slate-300">
            <DownloadIcon className="h-3.5 w-3.5" aria-hidden /> CSV
          </button>
        }
      </header>
      {s.kpis.length > 0 &&
      <dl className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
          {s.kpis.map((k) =>
        <div key={k.label} className="min-w-[120px]">
              <dt className="flex items-center gap-0.5 text-[11.5px] font-semibold text-slate-500">
                {k.label}
                {k.tip && <InfoTip text={k.tip} label={`Definition of ${k.label}`} />}
              </dt>
              <dd className={`text-[20px] font-bold tabular-nums ${k.tone && k.value ? TONE[k.tone] : 'text-slate-900'}`}>{formatCell(k.value, k.kind)}</dd>
              {k.note && <p className="text-[11px] text-slate-500">{k.note}</p>}
            </div>
        )}
        </dl>
      }
      {s.columns.length > 0 && (
      s.rows.length ?
      <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  {s.columns.map((c) =>
              <th key={c.key} scope="col" className={`${thClass} ${NUMERIC.has(c.kind ?? '') ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
              )}
                </tr>
              </thead>
              <tbody>
                {s.rows.slice(0, 50).map((r, i) =>
            <tr key={i}>
                    {s.columns.map((c) =>
              <td key={c.key} className={`${tdClass} ${NUMERIC.has(c.kind ?? '') ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>
                        {formatCell(r[c.key], c.kind)}
                      </td>
              )}
                  </tr>
            )}
              </tbody>
            </table>
            {s.rows.length > 50 && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Showing 50 of {s.rows.length} rows. The CSV and print view include all rows.</p>}
          </div> :

      <p className="border-t border-slate-100 px-4 py-6 text-center text-[12px] text-slate-500">{s.empty}</p>)
      }
      {s.note && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">{s.note}</p>}
    </section>);

}