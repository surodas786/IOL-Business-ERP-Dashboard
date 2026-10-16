import React from 'react';
import { formatBDT } from '../../utils/format';
import { tdClass, thClass } from '../admin/AdminPanel';
import type { InvoiceLine } from '../../types/billing';

interface Props {
  lines: InvoiceLine[];
  taxNote?: string;
  /** Compact print styling. */
  print?: boolean;
}

/** Charge lines with the proration calculation shown for every partial period. */
export function InvoiceLines({ lines, taxNote, print }: Props) {
  const th = print ? 'border-b border-slate-300 py-1 text-left text-[10px] font-bold uppercase text-slate-500' : thClass;
  const td = print ? 'border-b border-slate-100 py-1 align-top text-[11.5px]' : tdClass;
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr>
            <th className={th}>Charge</th>
            <th className={th}>Service dates</th>
            <th className={th}>Calculation</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) =>
          <tr key={l.id}>
              <td className={td}>
                <span className="block text-slate-900">{l.description}</span>
                <span className="text-[10.5px] text-slate-500">
                  {l.kind}
                  {l.connectionId ? ` · ${l.connectionId}` : ''}
                </span>
              </td>
              <td className={`${td} whitespace-nowrap`}>{l.from ? `${l.from.slice(8)}–${l.to?.slice(8)} ${l.from.slice(0, 7)} · ${l.days}/${l.daysInPeriod} days` : '—'}</td>
              <td className={`${td} text-[11px] text-slate-600`}>{l.calc}</td>
              <td className={`${td} text-right tabular-nums text-slate-900`}>{formatBDT(l.amount)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={3} className={`${td} text-right font-semibold text-slate-900`}>
              Total
            </td>
            <td className={`${td} text-right font-bold tabular-nums text-slate-900`}>{formatBDT(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1.5 px-1 text-[10.5px] text-slate-500">
        Proration: actual days in the calendar month (amount = monthly rate × billable days ÷ days in month, rounded to the nearest taka).
        {taxNote ? ` ${taxNote}.` : ''}
      </p>
    </div>);

}