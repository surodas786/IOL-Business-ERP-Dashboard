import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useScopedJobs } from '../../hooks/useScopedJobs';
import { formatDhaka } from '../../utils/format';
import { branchName, customerName, recordName } from '../../utils/relations';
import { jobNextStep } from '../../utils/installationRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { inputClass } from '../admin/FormField';
import type { InstallationJob } from '../../types/records';

type Filter = 'open' | 'hold' | 'verify' | 'billing' | 'closed' | 'all';

const FILTERS: {id: Filter;label: string;test: (j: InstallationJob) => boolean;}[] = [
{ id: 'open', label: 'Open', test: (j) => ['Pending Assignment', 'Assigned', 'Scheduled', 'In Progress'].includes(j.status) },
{ id: 'hold', label: 'On hold', test: (j) => j.status === 'On Hold' },
{ id: 'verify', label: 'Awaiting verification', test: (j) => j.status === 'Work Completed' },
{ id: 'billing', label: 'Awaiting billing review', test: (j) => j.status === 'Verified' },
{ id: 'closed', label: 'Closed', test: (j) => j.status === 'Closed' },
{ id: 'all', label: 'All', test: () => true }];


export function JobList() {
  const { db } = useData();
  const navigate = useNavigate();
  const jobs = useScopedJobs(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const f = FILTERS.find((x) => x.id === filter)!;
  const s = query.trim().toLowerCase();
  const rows = jobs.filter(f.test).filter((j) => !s || [j.id, j.workOrderId, customerName(db, j.customerId), db.customers.find((c) => c.id === j.customerId)?.nameBn ?? '', j.technicianName].join(' ').toLowerCase().includes(s));

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search jobs" placeholder="Job, work order, customer or technician…" className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div role="group" aria-label="Filter jobs" className="flex flex-wrap gap-1">
          {FILTERS.map((x) =>
          <button
            key={x.id}
            type="button"
            aria-pressed={filter === x.id}
            onClick={() => setFilter(x.id)}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${filter === x.id ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            
              {x.label} <span className={filter === x.id ? 'text-white/70' : 'text-slate-400'}>{jobs.filter(x.test).length}</span>
            </button>
          )}
        </div>
      </div>
      <CustomerTable<InstallationJob>
        minWidth={900}
        rows={rows}
        rowKey={(j) => j.id}
        onOpen={(j) => navigate(`/installations/jobs/${j.id}`)}
        empty="No installation jobs match these filters."
        columns={[
        {
          label: 'Job',
          cell: (j) =>
          <span>
                <span className="block font-semibold text-slate-900">{customerName(db, j.customerId)}</span>
                <span className="block text-[11px] text-slate-500">
                  {j.id} · {j.workOrderId} · {recordName(db, { type: 'site', id: j.siteId })}
                </span>
              </span>

        },
        {
          label: 'Service',
          cell: (j) => {
            const c = db.connections.find((x) => x.id === j.connectionId);
            return <span className="text-[11.5px]">{c ? `${c.serviceType} · ${c.bandwidthMbps} Mbps` : j.connectionId}</span>;
          }
        },
        { label: 'Technician', cell: (j) => <span className="text-[11.5px]">{j.technicianName || <span className="text-status-warning">Not assigned</span>}</span> },
        { label: 'Date', cell: (j) => <span className="whitespace-nowrap text-[11.5px]">{j.status === 'Pending Assignment' || j.status === 'Assigned' ? `Target ${formatDhaka(j.scheduledAt)}` : formatDhaka(j.scheduledAt)}</span> },
        { label: 'Status', cell: (j) => <StatusBadge status={j.status} /> },
        { label: 'Next step', cell: (j) => <span className="text-[11.5px]">{jobNextStep(j)}</span> },
        { label: 'Branch', cell: (j) => <span className="text-[11.5px]">{branchName(j.branchId)}</span> }]
        } />
      
    </section>);

}