import React from 'react';
import { CheckIcon, CornerUpLeftIcon, XIcon } from 'lucide-react';
import { SURVEY_FLOW } from '../../types/survey';
import type { Survey } from '../../types/records';

const SHORT: Record<string, string> = {
  Submitted: 'Submitted',
  'Back Office Review': 'Back Office',
  Assigned: 'Assigned',
  Scheduled: 'Scheduled',
  'In Progress': 'In progress',
  'Submitted for Technical Review': 'Tech review'
};

/** Submitted → … → Technical review, followed by the review outcome. */
export function SurveyStatusTrack({ survey: s }: {survey: Survey;}) {
  const final = s.status === 'Approved' || s.status === 'Not Feasible' || s.status === 'Returned';
  // Returned surveys sit back with the technician (In Progress step).
  const idx = s.status === 'Returned' ? SURVEY_FLOW.indexOf('In Progress') : final ? SURVEY_FLOW.length : SURVEY_FLOW.indexOf(s.status as (typeof SURVEY_FLOW)[number]);
  const outcomeTone = s.status === 'Approved' ? 'bg-status-ok text-white' : s.status === 'Not Feasible' ? 'bg-status-critical text-white' : 'bg-amber-100 text-status-warning';

  return (
    <ol aria-label="Survey progress" className="grid grid-cols-7 gap-1">
      {SURVEY_FLOW.map((step, i) =>
      <li key={step} className="min-w-0" aria-current={i === idx ? 'step' : undefined}>
          <span className={`block h-1 rounded-full ${i < idx || final && s.status !== 'Returned' ? 'bg-primary' : i === idx ? 'bg-primary/60' : 'bg-slate-200'}`} aria-hidden />
          <span className={`mt-1 flex items-center gap-0.5 truncate text-[10.5px] font-semibold ${i === idx ? 'text-slate-900' : i < idx ? 'text-slate-600' : 'text-slate-400'}`} title={step}>
            {i < idx && <CheckIcon className="h-3 w-3 shrink-0 text-primary" aria-hidden />}
            {SHORT[step]}
          </span>
        </li>
      )}
      <li className="min-w-0">
        <span className={`block h-1 rounded-full ${final ? s.status === 'Approved' ? 'bg-status-ok' : s.status === 'Not Feasible' ? 'bg-status-critical' : 'bg-status-warning' : 'bg-slate-200'}`} aria-hidden />
        {final ?
        <span className={`mt-1 inline-flex items-center gap-0.5 rounded px-1 text-[10.5px] font-semibold ${outcomeTone}`}>
            {s.status === 'Approved' ? <CheckIcon className="h-3 w-3" aria-hidden /> : s.status === 'Returned' ? <CornerUpLeftIcon className="h-3 w-3" aria-hidden /> : <XIcon className="h-3 w-3" aria-hidden />}
            {s.status}
          </span> :

        <span className="mt-1 block truncate text-[10.5px] font-semibold text-slate-400">Outcome</span>
        }
      </li>
    </ol>);

}