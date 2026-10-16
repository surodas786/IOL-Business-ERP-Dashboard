import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedChanges } from '../../hooks/useScopedChanges';
import { hasPermission } from '../../utils/access';
import { demoNow, dhakaDayAt, formatDhakaDate } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { serviceChangeTasks } from '../../utils/serviceChangeTasks';
import { isOpen } from '../../utils/serviceChangeRules';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { SERVICE_CHANGE_TYPES } from '../../types/serviceChange';
import type { Severity } from '../../types/erp';

const DOT: Record<Severity, string> = { critical: 'bg-status-critical', warning: 'bg-status-warning', info: 'bg-status-info', neutral: 'bg-slate-300' };

export function ChangeOverview() {
  const { db } = useData();
  const { role } = useSession();
  const changes = useScopedChanges();
  const ids = useMemo(() => new Set(changes.map((c) => c.id)), [changes]);
  const tasks = useMemo(
    () =>
    serviceChangeTasks(db).
    filter((t) => ids.has(t.changeId) && t.requires.every((p) => hasPermission(role, p))).
    sort((a, b) => ['critical', 'warning', 'info', 'neutral'].indexOf(a.severity) - ['critical', 'warning', 'info', 'neutral'].indexOf(b.severity)),
    [db, ids, role]
  );
  const now = demoNow().toISOString();
  const horizon = dhakaDayAt(now, 30);
  const upcoming = changes.
  flatMap((s) => {
    const out: {at: string;label: string;id: string;customerId: string;}[] = [];
    if (s.effectiveDate && s.effectiveDate >= now && s.effectiveDate <= horizon && isOpen(s)) out.push({ at: s.effectiveDate, label: s.type === 'Discontinuation' ? 'Service stop' : `${s.type} effective`, id: s.id, customerId: s.customerId });
    if (s.status === 'Stopped' && s.expectedResumption && s.expectedResumption <= horizon) out.push({ at: s.expectedResumption, label: s.expectedResumption < now ? 'Resumption overdue (unverified)' : 'Expected resumption', id: s.id, customerId: s.customerId });
    return out;
  }).
  sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <AdminPanel title={`Needs your action · ${tasks.length}`} description={`Steps owned by your role (${role.label}). Each department only sees its own part.`}>
        {tasks.length === 0 ?
        <p className="px-4 py-6 text-[12.5px] text-slate-500">Nothing waiting on your role.</p> :

        <ul className="divide-y divide-slate-100">
            {tasks.map((t) => {
            const s = db.serviceChanges.find((x) => x.id === t.changeId)!;
            return (
              <li key={t.id}>
                  <Link to={`/service-changes/records/${s.id}`} className="group flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-slate-50">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[t.severity]}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-900">
                        {t.title} — {customerName(db, s.customerId)}
                      </span>
                      <span className="block text-[11.5px] text-slate-500">
                        {s.id} · {s.type} · {t.detail}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-[11px] text-slate-400">
                      {t.timeLabel} {formatDhakaDate(t.at)}
                    </span>
                    <ArrowRightIcon className="mt-0.5 h-3.5 w-3.5 text-slate-300 transition-colors duration-150 group-hover:text-slate-500" aria-hidden />
                  </Link>
                </li>);

          })}
          </ul>
        }
      </AdminPanel>

      <aside className="space-y-3">
        <AdminPanel title="Next 30 days" description="Approved effective dates and expected resumptions.">
          <ol className="px-4 py-2">
            {upcoming.map((u) =>
            <li key={`${u.id}-${u.label}`} className="grid grid-cols-[64px_1fr] gap-2 border-b border-slate-100 py-2 last:border-b-0">
                <span className={`text-[11.5px] font-semibold ${u.at < now ? 'text-status-critical' : 'text-slate-500'}`}>{formatDhakaDate(u.at).replace(/ \d{4}$/, '')}</span>
                <Link to={`/service-changes/records/${u.id}`} className="text-[12px] text-slate-800 hover:text-primary">
                  {u.label}
                  <span className="block text-[11px] text-slate-500">
                    {customerName(db, u.customerId)} · {u.id}
                  </span>
                </Link>
              </li>
            )}
            {upcoming.length === 0 && <li className="py-2 text-[12px] text-slate-500">Nothing scheduled.</li>}
          </ol>
        </AdminPanel>

        <AdminPanel title="By change type">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Type</th>
                <th className={`${thClass} text-right`}>Open</th>
                <th className={`${thClass} text-right`}>Approval</th>
                <th className={`${thClass} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_CHANGE_TYPES.map((t) => {
                const rows = changes.filter((s) => s.type === t);
                return (
                  <tr key={t}>
                    <td className={tdClass}>
                      <Link to={`/service-changes/requests?type=${encodeURIComponent(t)}`} className="font-semibold text-slate-800 hover:text-primary">
                        {t}
                      </Link>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{rows.filter(isOpen).length}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{rows.filter((s) => s.status === 'Pending Approval').length}</td>
                    <td className={`${tdClass} text-right tabular-nums text-slate-500`}>{rows.length}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </AdminPanel>
      </aside>
    </div>);

}