import React from 'react';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { jobDates } from '../../utils/installationRules';
import type { InstallationJob } from '../../types/records';

/** The five milestone dates, always shown separately. */
export function JobDates({ job }: {job: InstallationJob;}) {
  return (
    <section aria-label="Milestone dates" className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">Milestone dates</h2>
        <p className="text-[11px] text-slate-500">Kept separate — marking a job done never starts billing · Asia/Dhaka</p>
      </header>
      <ol className="divide-y divide-slate-100">
        {jobDates(job).map((d) =>
        <li key={d.label} className="flex items-start gap-2.5 px-4 py-2">
            {d.at ? <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-status-ok" aria-hidden /> : <CircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-slate-900">{d.label}</p>
              <p className="text-[11px] text-slate-500">{d.note}</p>
            </div>
            <p className={`shrink-0 text-right text-[12px] ${d.at ? 'text-slate-900' : 'text-slate-400'}`}>
              {d.at ? formatDhaka(d.at, { year: true }) : 'Not yet'}
              {d.at && d.by && <span className="block text-[10.5px] text-slate-500">{userName(d.by)}</span>}
            </p>
          </li>
        )}
      </ol>
      {job.handoverAt &&
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
          Handed over by {userName(job.handoverById)} at {formatDhaka(job.handoverAt, { year: true })}
        </p>
      }
    </section>);

}