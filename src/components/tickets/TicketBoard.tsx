import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { demoNow } from '../../utils/format';
import { escalationLevel, isOpen } from '../../utils/ticketRules';
import { StatusBadge } from '../records/StatusBadge';
import { SlaChip } from './SlaChip';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../types/ticket';
import type { Ticket } from '../../types/records';

const RECENT_MS = 7 * 86400000;

/** Kanban by status. Moving a ticket happens on its detail page, where each step has its required inputs. */
export function TicketBoard({ tickets }: {tickets: Ticket[];}) {
  const { db } = useData();
  const now = demoNow().getTime();
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1180px] grid-cols-6 gap-2.5">
        {TICKET_STATUSES.map((s) => {
          const col = tickets.
          filter((t) => t.status === s && (s !== 'Closed' || now - new Date(t.closedAt ?? t.openedAt).getTime() < RECENT_MS)).
          sort((a, b) => TICKET_PRIORITIES.indexOf(a.priority) - TICKET_PRIORITIES.indexOf(b.priority) || a.slaDueAt.localeCompare(b.slaDueAt));
          return (
            <section key={s} aria-label={s} className="flex min-h-[320px] flex-col rounded-md bg-slate-100/70">
              <header className="flex items-center justify-between px-3 py-2">
                <h2 className="text-[12px] font-bold text-slate-800">{s}</h2>
                <span className="text-[11px] tabular-nums text-slate-500">{col.length}</span>
              </header>
              <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {col.map((t) => {
                  const lvl = isOpen(t) ? escalationLevel(t) : 0;
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/support-tickets/records/${t.id}`}
                        className="block rounded-md border border-slate-200 bg-white p-2.5 transition-colors duration-150 hover:border-slate-300 focus-visible:border-primary focus-visible:outline-none">
                        
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10.5px] text-slate-400">{t.id}</span>
                          <StatusBadge status={t.priority} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-slate-900">{t.subject}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{db.customers.find((c) => c.id === t.customerId)?.name}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                          <span className="truncate text-[11px] text-slate-600">{t.assigneeName ?? 'Unassigned'}</span>
                          <SlaChip ticket={t} kind="resolution" />
                        </div>
                        {lvl > 0 && <p className="mt-1 text-[10.5px] font-semibold text-status-critical">Escalated to level {lvl}</p>}
                      </Link>
                    </li>);

                })}
                {!col.length && <li className="px-1 py-4 text-center text-[11px] text-slate-400">None</li>}
              </ul>
            </section>);

        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Closed shows the last 7 days. Open a card to move it — each step asks for what it needs (reason for hold, resolution details).</p>
    </div>);

}