import React from 'react';
import { useFieldData } from '../../hooks/useFieldData';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { hasPermission } from '../../utils/access';
import { formatBDT, formatCount } from '../../utils/format';
import { roleLabel } from '../../utils/relations';
import { TARGET_MEASURES, achievement } from '../../utils/fieldRules';

const PERIOD = '2026-10';

/** Targets vs achievement — each measure tracked on its own, never combined into one score. */
export function TargetsView() {
  const { db, people, role } = useFieldData();
  const measures = TARGET_MEASURES.filter((m) => m.id !== 'collectedCash' || hasPermission(role, 'viewFinancials') || hasPermission(role, 'viewPipeline'));
  const rows = people.filter((p) => db.salesTargets.some((t) => t.userId === p.id && t.period === PERIOD));

  return (
    <AdminPanel
      title="Targets vs achievement · October 2026"
      description="Visits, won deals, new contracted MRC and collected cash are separate measures. Contracted MRC counts when a quotation becomes a work order; collected cash counts verified receipts only.">
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={thClass}>Person</th>
              {measures.map((m) =>
              <th key={m.id} className={thClass}>
                  {m.label}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 &&
            <tr>
                <td colSpan={measures.length + 1} className={`${tdClass} py-8 text-center text-slate-500`}>
                  No targets set for people in the current filters.
                </td>
              </tr>
            }
            {rows.map((p) =>
            <tr key={p.id}>
                <td className={tdClass}>
                  <span className="block font-semibold text-slate-900">{p.name}</span>
                  <span className="block text-[11px] text-slate-500">{roleLabel(p.role)}</span>
                </td>
                {measures.map((m) => {
                const t = db.salesTargets.find((x) => x.userId === p.id && x.period === PERIOD && x.measure === m.id);
                if (!t) return <td key={m.id} className={`${tdClass} text-slate-400`}>No target</td>;
                const got = achievement(db, p.id, PERIOD, m.id);
                const pct = t.target ? Math.round(got / t.target * 100) : 0;
                const fmt = m.money ? formatBDT : formatCount;
                return (
                  <td key={m.id} className={`${tdClass} min-w-[150px]`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold tabular-nums text-slate-900">{fmt(got)}</span>
                        <span className={`text-[11px] font-semibold tabular-nums ${pct >= 100 ? 'text-status-ok' : pct >= 50 ? 'text-slate-600' : 'text-status-warning'}`}>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.label} ${pct}% of target`}>
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-status-ok' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="mt-0.5 block text-[10.5px] text-slate-400">of {fmt(t.target)}</span>
                    </td>);

              })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>);

}