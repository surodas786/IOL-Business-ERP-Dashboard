import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatDhaka } from '../../utils/format';
import { escalationLevel, isOpen } from '../../utils/ticketRules';
import { CustomerTable } from '../customers/CustomerTable';
import { FilterPills } from '../billing/FilterPills';
import { StatusBadge } from '../records/StatusBadge';
import { inputClass } from '../admin/FormField';
import { SlaChip } from './SlaChip';
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketStatus } from '../../types/ticket';
import type { Ticket } from '../../types/records';

type Filter = 'active' | 'all' | TicketStatus;

export function TicketList({ tickets }: {tickets: Ticket[];}) {
  const { db } = useData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('active');
  const [priority, setPriority] = useState('all');
  const [q, setQ] = useState('');
  const customer = (id: string) => db.customers.find((c) => c.id === id);
  const term = q.trim().toLowerCase();
  const rows = tickets.
  filter((t) => filter === 'all' ? true : filter === 'active' ? isOpen(t) : t.status === filter).
  filter((t) => priority === 'all' || t.priority === priority).
  filter((t) => {
    if (!term) return true;
    const c = customer(t.customerId);
    return [t.id, t.subject, t.connectionId, t.assigneeName, c?.name, c?.nameBn, t.category].some((v) => v?.toLowerCase().includes(term));
  }).
  sort((a, b) => Number(!isOpen(a)) - Number(!isOpen(b)) || TICKET_PRIORITIES.indexOf(a.priority) - TICKET_PRIORITIES.indexOf(b.priority) || a.slaDueAt.localeCompare(b.slaDueAt));
  const options: {id: Filter;label: string;count: number;}[] = [
  { id: 'active', label: 'Active', count: tickets.filter(isOpen).length },
  ...TICKET_STATUSES.map((s) => ({ id: s as Filter, label: s, count: tickets.filter((t) => t.status === s).length })),
  { id: 'all', label: 'All', count: tickets.length }];


  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <FilterPills label="Filter by status" options={options} value={filter} onChange={setFilter} />
        <div className="flex gap-2">
          <select aria-label="Priority" className={`${inputClass} w-32`} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All priorities</option>
            {TICKET_PRIORITIES.map((p) =>
            <option key={p}>{p}</option>
            )}
          </select>
          <label className="relative block w-56">
            <span className="sr-only">Search tickets</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
            <input className={`${inputClass} pl-8`} placeholder="Ticket, customer, service…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
      </div>
      <CustomerTable<Ticket>
        minWidth={1080}
        rows={rows}
        rowKey={(t) => t.id}
        onOpen={(t) => navigate(`/support-tickets/records/${t.id}`)}
        empty="No tickets match these filters."
        columns={[
        {
          label: 'Ticket',
          cell: (t) =>
          <span className="block max-w-[280px]">
                <span className="font-mono text-[10.5px] text-slate-400">{t.id}</span>
                {t.simulated && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">Simulated {t.simulated.toLowerCase()}</span>}
                <span className="block truncate font-semibold text-slate-900">{t.subject}</span>
                <span className="block text-[11px] text-slate-500">{t.category ?? '—'} · {t.source ?? '—'}</span>
              </span>

        },
        { label: 'Customer · service', cell: (t) => <span className="text-[11.5px]"><span className="block text-slate-800">{customer(t.customerId)?.name}</span><span className="text-slate-500">{t.connectionId ?? 'No service linked'} · {db.sites.find((s) => s.id === t.siteId)?.name}</span></span> },
        { label: 'Priority', cell: (t) => <StatusBadge status={t.priority} /> },
        { label: 'Assigned', cell: (t) => <span className="text-[11.5px]">{t.assigneeName ?? <span className="text-status-warning">Unassigned</span>}{t.team && <span className="block text-slate-500">{t.team}</span>}</span> },
        { label: 'Created', cell: (t) => <span className="whitespace-nowrap text-[11.5px]">{formatDhaka(t.openedAt)}</span> },
        { label: 'Response', cell: (t) => <SlaChip ticket={t} kind="response" /> },
        { label: 'Resolution', cell: (t) => <SlaChip ticket={t} kind="resolution" /> },
        {
          label: 'Status',
          cell: (t) => {
            const lvl = isOpen(t) ? escalationLevel(t) : 0;
            return (
              <span className="flex flex-col items-start gap-0.5">
                  <StatusBadge status={t.status} />
                  {lvl > 0 && <span className="text-[10.5px] font-semibold text-status-critical">Escalated L{lvl}</span>}
                </span>);

          }
        }]
        } />
      
    </section>);

}