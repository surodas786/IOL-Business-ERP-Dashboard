import React, { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MailIcon, PhoneIncomingIcon, PlusIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { useScopedTickets } from '../hooks/useScopedTickets';
import { canAccessModule } from '../utils/access';
import { canCreateTicket, canSimulate, isOpen } from '../utils/ticketRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { TicketList } from '../components/tickets/TicketList';
import { TicketBoard } from '../components/tickets/TicketBoard';
import { WorkloadView } from '../components/tickets/WorkloadView';
import { RosterView } from '../components/tickets/RosterView';
import { SlaDashboard } from '../components/tickets/SlaDashboard';
import { NewTicketDialog } from '../components/tickets/NewTicketDialog';

const VIEWS = [
{ id: 'list', label: 'Ticket list' },
{ id: 'board', label: 'Board' },
{ id: 'sla', label: 'SLA dashboard' },
{ id: 'workload', label: 'Technician workload' },
{ id: 'roster', label: 'Duty roster' }] as
const;

export function SupportTickets() {
  const { view } = useParams();
  const { role } = useSession();
  const runAction = useRunAction();
  const tickets = useScopedTickets();
  const [creating, setCreating] = useState(false);
  if (!canAccessModule(role, 'tickets')) return <AccessDenied title="Support Tickets" module="tickets" />;
  const current = view ? VIEWS.find((v) => v.id === view) : VIEWS[0];
  if (!current) return <Navigate to="/support-tickets" replace />;
  const open = tickets.filter(isOpen);
  const unassigned = open.filter((t) => t.status === 'Open').length;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Support Tickets</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {open.length} open · {unassigned} awaiting assignment · internal desk only — network monitoring and a customer portal are outside this demo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSimulate(role) &&
          <div role="group" aria-label="Simulations" className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-2 py-1">
              <span className="text-[10.5px] font-semibold text-slate-500">Demo · no external system</span>
              <button type="button" className={secondaryBtn} onClick={() => runAction({ type: 'TKT_SIMULATE', channel: 'Call' })}>
                <PhoneIncomingIcon className="h-3.5 w-3.5" aria-hidden /> Simulate Incoming Call
              </button>
              <button type="button" className={secondaryBtn} onClick={() => runAction({ type: 'TKT_SIMULATE', channel: 'Email' })}>
                <MailIcon className="h-3.5 w-3.5" aria-hidden /> Simulate Incoming Email
              </button>
            </div>
          }
          {canCreateTicket(role) &&
          <button type="button" className={primaryBtn} onClick={() => setCreating(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New ticket
            </button>
          }
        </div>
      </div>

      <nav aria-label="Support ticket views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {VIEWS.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'list' ? '/support-tickets' : `/support-tickets/${v.id}`}
          end
          className={({ isActive }) => `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          
            {v.label}
          </NavLink>
        )}
      </nav>

      {current.id === 'list' && <TicketList tickets={tickets} />}
      {current.id === 'board' && <TicketBoard tickets={tickets} />}
      {current.id === 'sla' && <SlaDashboard tickets={tickets} />}
      {current.id === 'workload' && <WorkloadView />}
      {current.id === 'roster' && <RosterView />}

      <AnimatePresence>{creating && <NewTicketDialog key="n" onClose={() => setCreating(false)} />}</AnimatePresence>
    </div>);

}