import React from 'react';
import { CheckIcon } from 'lucide-react';
import { STEP_LABEL, stepsFor } from '../../utils/serviceChangeRules';
import type { ServiceChange } from '../../types/records';

export function ChangeStatusTrack({ change: s }: {change: ServiceChange;}) {
  if (s.status === 'Rejected' || s.status === 'Cancelled') {
    return (
      <p className="rounded-md border border-rose-100 bg-rose-50 px-4 py-2.5 text-[12.5px] text-slate-800">
        <span className="font-semibold text-status-critical">{s.status}.</span> {s.status === 'Rejected' ? s.decisionNote ?? '' : s.cancelReason ?? ''} The service and its billing were not changed.
      </p>);

  }
  const steps = stepsFor(s.type);
  const idx = steps.indexOf(s.status);
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
      {steps.map((st, i) => {
        const done = i < idx || i === idx && i === steps.length - 1;
        const current = i === idx && !done;
        return (
          <li key={st} className="flex items-center gap-1" aria-current={current ? 'step' : undefined}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-primary text-white' : current ? 'border-2 border-primary bg-white text-primary' : 'border border-slate-300 bg-white text-slate-400'}`}>
              
              {done ? <CheckIcon className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            <span className={`whitespace-nowrap text-[12px] ${current ? 'font-bold text-slate-900' : done ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>{STEP_LABEL[st] ?? st}</span>
            {i < steps.length - 1 && <span className={`mx-1.5 h-px w-6 ${i < idx ? 'bg-primary' : 'bg-slate-200'}`} aria-hidden />}
          </li>);

      })}
    </ol>);

}