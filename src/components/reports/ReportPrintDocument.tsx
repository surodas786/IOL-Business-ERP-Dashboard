import React from 'react';
import { IOL_LOGO_URL } from '../../data/brand';
import { formatCell } from '../../utils/reports/export';
import type { ReportSection } from '../../types/reports';

/** Print / PDF layout (use the browser's “Save as PDF”). Uses the same visible columns as the screen. */
export function ReportPrintDocument({ title, meta, sections }: {title: string;meta: string[];sections: ReportSection[];}) {
  return (
    <div>
      <header className="mb-5 border-b-2 border-slate-900 pb-3">
        <img src={IOL_LOGO_URL} alt="Innovative Online Limited" className="mb-2 h-10 w-auto" />
        <p className="text-[10px] font-semibold text-slate-500">IOL Business ERP · Demo data</p>
        <h1 className="text-[18px] font-bold text-slate-900">{title}</h1>
        <ul className="mt-1 text-[10.5px] text-slate-600">
          {meta.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </header>
      {sections.map((s) =>
      <section key={s.id} className="mb-6 break-inside-avoid">
          <h2 className="text-[13px] font-bold text-slate-900">{s.title}</h2>
          <p className="mb-2 text-[10.5px] text-slate-500">{s.description} · {s.basis === 'period' ? 'Selected period' : 'As of today'}</p>
          {s.kpis.length > 0 &&
        <p className="mb-2 text-[11px]">
              {s.kpis.map((k) => <span key={k.label} className="mr-4"><span className="text-slate-500">{k.label}:</span> <strong>{formatCell(k.value, k.kind)}</strong></span>)}
            </p>
        }
          {s.columns.length > 0 && (s.rows.length ?
        <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr>{s.columns.map((c) => <th key={c.key} className="border-b border-slate-400 py-1 pr-2 text-left font-semibold">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) =>
            <tr key={i}>{s.columns.map((c) => <td key={c.key} className="border-b border-slate-200 py-1 pr-2 tabular-nums">{formatCell(r[c.key], c.kind)}</td>)}</tr>
            )}
              </tbody>
            </table> :
        <p className="text-[10.5px] text-slate-500">{s.empty}</p>)}
          {s.tip && <p className="mt-1 text-[9.5px] text-slate-500">Definition: {s.tip}</p>}
        </section>
      )}
    </div>);

}