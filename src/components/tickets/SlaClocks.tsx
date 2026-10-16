import React from 'react';
import { PauseIcon } from 'lucide-react';
import { useDemoNow } from '../../hooks/useDemoNow';
import { formatDhaka } from '../../utils/format';
import { currentHold, formatSpan, pausedMs, policyFor, resolutionClock, responseClock, type Clock } from '../../utils/ticketRules';
import type { Ticket } from '../../types/records';

function ClockBlock({ title, clock, target, footnote }: {title: string;clock: Clock;target: string;footnote?: React.ReactNode;}) {
  const big =
  clock.state === 'met' ?
  ['text-status-ok', 'Met'] :
  clock.state === 'missed' ?
  ['text-status-critical', 'Missed'] :
  clock.state === 'breached' ?
  ['text-status-critical', `−${formatSpan(clock.remainingMs)}`] :
  clock.state === 'paused' ?
  ['text-status-info', formatSpan(clock.remainingMs)] :
  [clock.usedPct >= 75 ? 'text-status-warning' : 'text-slate-900', formatSpan(clock.remainingMs)];
  const sub =
  clock.state === 'met' ?
  `${formatSpan(clock.remainingMs)} inside the target · ${formatDhaka(clock.doneAt!)}` :
  clock.state === 'missed' ?
  `${formatSpan(clock.remainingMs)} late · ${formatDhaka(clock.doneAt!)}` :
  clock.state === 'breached' ?
  'Overdue' :
  clock.state === 'paused' ?
  'Left · paused under policy' :
  'Left';
  const bar = Math.min(100, Math.max(0, clock.usedPct));
  const barTone = clock.state === 'met' ? 'bg-status-ok' : clock.state === 'missed' || clock.state === 'breached' ? 'bg-status-critical' : clock.state === 'paused' ? 'bg-status-info' : clock.usedPct >= 75 ? 'bg-status-warning' : 'bg-slate-700';
  return (
    <div className="px-4 py-3">
      <p className="text-[11.5px] font-semibold text-slate-500">{title}</p>
      <p className={`mt-0.5 flex items-center gap-1.5 text-[24px] font-bold tabular-nums ${big[0]}`}>
        {clock.state === 'paused' && <PauseIcon className="h-5 w-5" aria-hidden />}
        {big[1]}
      </p>
      <p className="text-[11.5px] text-slate-600">{sub}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${Math.round(clock.usedPct)}% of the window used`}>
        <div className={`h-full ${barTone}`} style={{ width: `${bar}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Target {target}</p>
      {footnote && <p className="mt-0.5 text-[11px] text-slate-500">{footnote}</p>}
    </div>);

}

/** First response and resolution are tracked separately. */
export function SlaClocks({ ticket: t }: {ticket: Ticket;}) {
  const now = useDemoNow(15000);
  const r = responseClock(t, now);
  const s = resolutionClock(t, now);
  const hold = currentHold(t);
  const paused = pausedMs(t, now);
  const p = policyFor(t.priority);
  return (
    <section aria-label="SLA" className="rounded-md border border-slate-200 bg-white">
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <ClockBlock title="First response" clock={r} target={formatDhaka(new Date(r.dueMs))} />
        <ClockBlock
          title="Resolution"
          clock={s}
          target={formatDhaka(new Date(s.dueMs))}
          footnote={paused > 0 ? `Includes ${formatSpan(paused)} paused under the ${t.priority} policy.` : p.pauseReasons.length ? undefined : `${t.priority} tickets never pause.`} />
        
      </div>
      {hold &&
      <p role="status" className={`border-t px-4 py-2 text-[12px] ${hold.pausesSla ? 'border-blue-100 bg-blue-50 text-slate-800' : 'border-amber-100 bg-amber-50 text-slate-800'}`}>
          <span className="font-semibold">On hold since {formatDhaka(hold.from)}</span> — {hold.reason}: {hold.note}{' '}
          {hold.pausesSla ? 'The resolution timer is paused (allowed by policy).' : 'The resolution timer is still running — the policy does not pause for this reason.'}
        </p>
      }
    </section>);

}