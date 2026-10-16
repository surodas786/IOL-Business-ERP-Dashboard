import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedJobs } from '../../hooks/useScopedJobs';
import { dhakaDayAt, dhakaInputValue, demoNow, formatDhakaDate } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { TECHNICIANS } from '../../utils/installationRules';
import { secondaryBtn } from '../admin/AdminPanel';

const SCHEDULED = ['Scheduled', 'In Progress', 'On Hold', 'Work Completed', 'Verified', 'Closed'];

/** Week grid: technicians down, Saturday–Friday across. Unassigned and unscheduled jobs listed above. */
export function JobSchedule() {
  const { db } = useData();
  const { branchFilter } = useSession();
  const jobs = useScopedJobs();
  const [offset, setOffset] = useState(0);

  const days = useMemo(() => {
    const now = demoNow();
    const dow = new Date(dhakaDayAt(now, 0, '12:00')).getUTCDay(); // 6 = Saturday
    const back = (dow + 1) % 7;
    return Array.from({ length: 7 }, (_, i) => dhakaInputValue(dhakaDayAt(now, i - back + offset * 7, '12:00')));
  }, [offset]);
  const today = dhakaInputValue(demoNow().toISOString());
  const techs = TECHNICIANS.filter((t) => (branchFilter === 'all' || t.branchId === branchFilter) && (jobs.some((j) => j.technicianName === t.name) || branchFilter !== 'all'));
  const waiting = jobs.filter((j) => j.status === 'Pending Assignment' || j.status === 'Assigned');

  return (
    <div className="space-y-3">
      {waiting.length > 0 &&
      <section aria-label="Not yet scheduled" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
          <h2 className="text-[12.5px] font-bold text-slate-900">Not yet scheduled ({waiting.length})</h2>
          <ul className="mt-1 flex flex-wrap gap-2">
            {waiting.map((j) =>
          <li key={j.id}>
                <Link to={`/installations/jobs/${j.id}`} className="inline-block rounded border border-amber-200 bg-white px-2 py-1 text-[11.5px] hover:border-amber-300">
                  <span className="font-semibold text-slate-900">{customerName(db, j.customerId)}</span> · {j.status === 'Pending Assignment' ? 'unassigned' : j.technicianName} · target {formatDhakaDate(j.scheduledAt)}
                </Link>
              </li>
          )}
          </ul>
        </section>
      }
      <section className="rounded-md border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
          <h2 className="text-[13px] font-bold text-slate-900">
            Week of {formatDhakaDate(`${days[0]}T12:00:00+06:00`)} <span className="font-normal text-slate-500">· Asia/Dhaka</span>
          </h2>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous week" className={secondaryBtn} onClick={() => setOffset((o) => o - 1)}>
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setOffset(0)} disabled={offset === 0}>
              This week
            </button>
            <button type="button" aria-label="Next week" className={secondaryBtn} onClick={() => setOffset((o) => o + 1)}>
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-collapse">
            <thead>
              <tr>
                <th className="w-40 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-[10.5px] font-bold uppercase text-slate-500">Technician</th>
                {days.map((d) =>
                <th key={d} className={`border-b border-l border-slate-200 px-2 py-1.5 text-left text-[11px] font-semibold ${d === today ? 'bg-primary-soft text-slate-900' : 'bg-slate-50 text-slate-600'}`}>
                    {new Date(`${d}T12:00:00+06:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' })}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {techs.map((t) =>
              <tr key={t.name}>
                  <th scope="row" className="border-b border-slate-100 px-3 py-2 text-left align-top text-[12px] font-semibold text-slate-800">
                    {t.name}
                    <span className="block text-[10.5px] font-normal text-slate-500">{t.userId ? 'Demo login' : 'Supervisor updates'}</span>
                  </th>
                  {days.map((d) => {
                  const cell = jobs.filter((j) => j.technicianName === t.name && SCHEDULED.includes(j.status) && dhakaInputValue(j.scheduledAt) === d);
                  return (
                    <td key={d} className={`border-b border-l border-slate-100 p-1 align-top ${d === today ? 'bg-primary-soft/40' : ''}`}>
                        {cell.map((j) =>
                      <Link key={j.id} to={`/installations/jobs/${j.id}`} className={`mb-1 block rounded border px-1.5 py-1 text-[11px] leading-snug hover:border-slate-400 ${j.status === 'On Hold' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                            <span className="block font-semibold text-slate-900">{new Date(j.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })}</span>
                            <span className="block truncate text-slate-700">{customerName(db, j.customerId)}</span>
                            <span className="block text-[10px] text-slate-500">{j.status}</span>
                          </Link>
                      )}
                      </td>);

                })}
                </tr>
              )}
              {techs.length === 0 &&
              <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[12px] text-slate-500">
                    No technicians with jobs in this scope.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>);

}