import React, { useMemo, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useFieldData } from '../../hooks/useFieldData';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { dhakaInputValue, demoNow, formatDhaka } from '../../utils/format';
import { recordName, roleLabel } from '../../utils/relations';
import { followUpOverdue } from '../../utils/fieldRules';

/** Per-person visit summary for the current month, expandable to the person's visits. */
export function VisitsByPerson() {
  const { db, visits, people } = useFieldData();
  const { openRecord } = useRecordDrawer();
  const [open, setOpen] = useState<string | null>(null);
  const period = dhakaInputValue(demoNow().toISOString()).slice(0, 7);
  const today = dhakaInputValue(demoNow().toISOString());

  const rows = useMemo(
    () =>
    people.
    map((p) => {
      const mine = visits.filter((v) => v.userId === p.id);
      const month = mine.filter((v) => dhakaInputValue(v.at).startsWith(period));
      return {
        p,
        mine,
        month: month.length,
        today: mine.filter((v) => dhakaInputValue(v.at) === today).length,
        positive: month.filter((v) => v.outcome === 'Positive').length,
        leads: month.filter((v) => v.subject.type === 'lead').length,
        pending: mine.filter((v) => v.nextActionDue && !v.followUpDoneAt).length,
        overdue: mine.filter(followUpOverdue).length,
        last: mine[0]?.at
      };
    }).
    sort((a, b) => b.month - a.month),
    [people, visits, period, today]
  );

  return (
    <AdminPanel title="Visits by person" description="October 2026 · select a person to see their visits. Counts are activity, not proof of attendance.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className={thClass}>Person</th>
              <th className={`${thClass} text-right`}>Today</th>
              <th className={`${thClass} text-right`}>This month</th>
              <th className={`${thClass} text-right`}>Leads / customers</th>
              <th className={`${thClass} text-right`}>Positive</th>
              <th className={`${thClass} text-right`}>Pending follow-ups</th>
              <th className={thClass}>Last visit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 &&
            <tr>
                <td colSpan={7} className={`${tdClass} py-8 text-center text-slate-500`}>
                  No field staff in the current filters.
                </td>
              </tr>
            }
            {rows.map((r) =>
            <React.Fragment key={r.p.id}>
                <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === r.p.id ? null : r.p.id)}>
                  <td className={tdClass}>
                    <button type="button" aria-expanded={open === r.p.id} className="flex items-center gap-2 text-left">
                      <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${open === r.p.id ? '' : '-rotate-90'}`} aria-hidden />
                      <span>
                        <span className="block font-semibold text-slate-900">{r.p.name}</span>
                        <span className="block text-[11px] text-slate-500">{roleLabel(r.p.role)}</span>
                      </span>
                    </button>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{r.today}</td>
                  <td className={`${tdClass} text-right font-semibold tabular-nums text-slate-900`}>{r.month}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {r.leads} / {r.month - r.leads}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{r.positive}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {r.pending}
                    {r.overdue > 0 && <span className="ml-1.5 text-[11px] font-semibold text-status-critical">{r.overdue} overdue</span>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{r.last ? formatDhaka(r.last) : '—'}</td>
                </tr>
                {open === r.p.id &&
              <tr>
                    <td colSpan={7} className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                      {r.mine.length === 0 ?
                  <p className="px-6 py-2 text-[12px] text-slate-500">No visits logged.</p> :

                  <ul className="divide-y divide-slate-200">
                          {r.mine.map((v) =>
                    <li key={v.id}>
                              <button type="button" onClick={() => openRecord({ type: 'fieldVisit', id: v.id })} className="grid w-full grid-cols-[130px_1fr_auto] items-center gap-3 px-6 py-1.5 text-left text-[12px] hover:bg-white">
                                <span className="text-slate-500">{formatDhaka(v.at)}</span>
                                <span className="min-w-0 truncate">
                                  <span className="font-semibold text-slate-900">{recordName(db, v.subject)}</span>
                                  <span className="text-slate-500"> · {v.purpose}</span>
                                </span>
                                <StatusBadge status={v.outcome} />
                              </button>
                            </li>
                    )}
                        </ul>
                  }
                    </td>
                  </tr>
              }
              </React.Fragment>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>);

}