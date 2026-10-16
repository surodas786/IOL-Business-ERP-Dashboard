import React from 'react';
import { formatBDT } from '../../utils/format';
import { BUCKET_HINT, totals, type AmountBucket } from '../../utils/agentRules';
import type { CommissionAccrual } from '../../types/agent';

const ORDER: AmountBucket[] = ['Accrued', 'Pending', 'Approved', 'Paid', 'Reversed'];

/** Accrued, pending, approved, paid and reversed amounts. Optionally acts as a filter. */
export function CommissionTotals({ accruals, value, onChange }: {accruals: CommissionAccrual[];value?: AmountBucket | 'all';onChange?: (b: AmountBucket | 'all') => void;}) {
  const t = totals(accruals);
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white sm:grid-cols-3 lg:grid-cols-5">
      {ORDER.map((k) => {
        const active = value === k;
        const body =
        <>
            <span className="block text-[11px] font-semibold text-slate-500">{k}</span>
            <span className={`block text-[17px] font-bold tabular-nums ${k === 'Reversed' ? 'text-slate-500' : 'text-slate-900'}`}>{formatBDT(Math.abs(t[k]))}</span>
            <span className="block text-[10.5px] leading-snug text-slate-500">{BUCKET_HINT[k]}</span>
          </>;

        return onChange ?
        <button
          key={k}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(active ? 'all' : k)}
          className={`border-b border-r border-slate-100 px-4 py-3 text-left transition-colors duration-150 ${active ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
          
            {body}
          </button> :

        <div key={k} className="border-b border-r border-slate-100 px-4 py-3">
            {body}
          </div>;

      })}
    </div>);

}