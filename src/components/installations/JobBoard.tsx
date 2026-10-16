import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useScopedJobs } from '../../hooks/useScopedJobs';
import { formatDhaka } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { JOB_FLOW } from '../../types/installation';

/** One column per status in workflow order. Cards open the job. */
export function JobBoard() {
  const { db } = useData();
  const jobs = useScopedJobs();

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1180px] grid-cols-8 gap-2">
        {JOB_FLOW.map((status) => {
          const col = jobs.filter((j) => j.status === status);
          return (
            <section key={status} aria-label={status} className={`flex min-h-[320px] flex-col rounded-md border ${status === 'On Hold' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
              <header className="flex items-center justify-between border-b border-slate-200 px-2.5 py-2">
                <h2 className="whitespace-nowrap text-[11.5px] font-bold text-slate-800">{status}</h2>
                <span className="text-[11px] font-semibold text-slate-400">{col.length}</span>
              </header>
              <ul className="flex-1 space-y-1.5 p-1.5">
                {col.map((j) =>
                <li key={j.id}>
                    <Link to={`/installations/jobs/${j.id}`} className="block rounded border border-slate-200 bg-white px-2.5 py-2 transition-colors duration-150 hover:border-slate-300">
                      <span className="block text-[12px] font-semibold leading-snug text-slate-900">{customerName(db, j.customerId)}</span>
                      <span className="block font-mono text-[10px] text-slate-400">{j.id}</span>
                      <span className="mt-1 block text-[11px] text-slate-600">{j.technicianName || 'Unassigned'}</span>
                      <span className="block text-[10.5px] text-slate-500">{j.status === 'On Hold' && j.hold ? `${j.hold.party} · review ${formatDhaka(j.hold.nextReviewAt)}` : formatDhaka(j.handoverAt ?? j.scheduledAt)}</span>
                    </Link>
                  </li>
                )}
                {col.length === 0 && <li className="px-1 py-2 text-[11px] text-slate-400">None</li>}
              </ul>
            </section>);

        })}
      </div>
    </div>);

}