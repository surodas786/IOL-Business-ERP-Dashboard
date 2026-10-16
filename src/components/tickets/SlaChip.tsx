import React from 'react';
import { PauseIcon } from 'lucide-react';
import { useDemoNow } from '../../hooks/useDemoNow';
import { formatSpan, resolutionClock, responseClock } from '../../utils/ticketRules';
import type { Ticket } from '../../types/records';

/** Compact live countdown for the response or resolution target. */
export function SlaChip({ ticket, kind }: {ticket: Ticket;kind: 'response' | 'resolution';}) {
  const now = useDemoNow();
  const c = kind === 'response' ? responseClock(ticket, now) : resolutionClock(ticket, now);
  const map = {
    met: ['text-status-ok', `Met · ${formatSpan(c.remainingMs)} spare`],
    missed: ['text-status-critical', `Missed by ${formatSpan(c.remainingMs)}`],
    breached: ['font-semibold text-status-critical', `Overdue ${formatSpan(c.remainingMs)}`],
    paused: ['text-status-info', `Paused · ${formatSpan(c.remainingMs)} left`],
    running: [c.usedPct >= 75 ? 'font-semibold text-status-warning' : 'text-slate-700', `${formatSpan(c.remainingMs)} left`]
  } as const;
  const [cls, label] = map[c.state];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] tabular-nums ${cls}`}>
      {c.state === 'paused' && <PauseIcon className="h-3 w-3" aria-hidden />}
      {label}
    </span>);

}