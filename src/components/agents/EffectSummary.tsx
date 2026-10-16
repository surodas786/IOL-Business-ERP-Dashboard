import React from 'react';
import { formatBDT } from '../../utils/format';
import type { Effect } from '../../utils/agentRules';

/** Financial effect of a commission at the given rates. */
export function EffectSummary({ effect: e, compact = false }: {effect: Effect;compact?: boolean;}) {
  const rows = [
  ...(e.mrcMonths ? [{ label: e.mrcMonths > 1 ? `MRC commission × ${e.mrcMonths} months` : 'MRC commission (first month)', value: e.mrcTotal, note: e.mrcMonths > 1 ? `${formatBDT(e.mrcPerMonth)} per month` : undefined }] : []),
  ...(e.otcOnce ? [{ label: 'OTC commission (once)', value: e.otcOnce }] : [])];

  return (
    <dl className={`rounded-md bg-slate-50 px-3 py-2.5 text-[12px] ${compact ? '' : 'sm:text-[12.5px]'}`}>
      {rows.map((r) =>
      <div key={r.label} className="flex items-baseline justify-between gap-4 py-0.5">
          <dt className="text-slate-600">
            {r.label}
            {r.note && <span className="ml-1 text-[11px] text-slate-500">({r.note})</span>}
          </dt>
          <dd className="tabular-nums text-slate-900">{formatBDT(r.value)}</dd>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-1.5">
        <dt className="font-semibold text-slate-900">Total commission cost</dt>
        <dd className="text-[14px] font-bold tabular-nums text-slate-900">{formatBDT(e.total)}</dd>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {e.pctOfRevenue}% of {formatBDT(e.revenue)} revenue over the same {e.mrcMonths > 1 ? `${e.mrcMonths} months` : 'first month'}
        {e.revenue && e.mrcMonths ? ' (MRC × months + OTC)' : ''}
      </p>
    </dl>);

}