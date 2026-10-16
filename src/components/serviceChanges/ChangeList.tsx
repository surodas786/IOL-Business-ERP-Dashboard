import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedChanges } from '../../hooks/useScopedChanges';
import { formatDhakaDate } from '../../utils/format';
import { customerName, userName } from '../../utils/relations';
import { canRequestChange, isOpen } from '../../utils/serviceChangeRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { FilterPills } from '../billing/FilterPills';
import { inputClass } from '../admin/FormField';
import { primaryBtn } from '../admin/AdminPanel';
import { NewChangeDialog } from './NewChangeDialog';
import { SERVICE_CHANGE_TYPES, type ServiceChangeType } from '../../types/serviceChange';
import type { ServiceChange } from '../../types/records';

type Filter = 'open' | 'approval' | 'implement' | 'done' | 'all';
const FILTERS: {id: Filter;label: string;test: (s: ServiceChange) => boolean;}[] = [
{ id: 'open', label: 'Open', test: isOpen },
{ id: 'approval', label: 'Awaiting approval', test: (s) => s.status === 'Pending Approval' },
{ id: 'implement', label: 'Approved, not implemented', test: (s) => s.status === 'Approved' },
{ id: 'done', label: 'Completed or closed', test: (s) => ['Implemented', 'Resumed', 'Closed'].includes(s.status) },
{ id: 'all', label: 'All', test: () => true }];


export function ChangeList() {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const all = useScopedChanges();
  const [filter, setFilter] = useState<Filter>('open');
  const [q, setQ] = useState('');
  const typeParam = params.get('type') as ServiceChangeType | null;
  const type = typeParam && SERVICE_CHANGE_TYPES.includes(typeParam) ? typeParam : 'all';
  const presetCustomer = params.get('new') ?? undefined;
  const [adding, setAdding] = useState(!!presetCustomer);
  const s = q.trim().toLowerCase();
  const byType = all.filter((x) => type === 'all' || x.type === type);
  const rows = byType.
  filter(FILTERS.find((f) => f.id === filter)!.test).
  filter((x) => !s || [x.id, x.connectionId, customerName(db, x.customerId), db.customers.find((c) => c.id === x.customerId)?.nameBn ?? '', x.fromValue, x.toValue].join(' ').toLowerCase().includes(s));

  const setType = (t: string) => {
    const next = new URLSearchParams(params);
    if (t === 'all') next.delete('type');else
    next.set('type', t);
    setParams(next, { replace: true });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-md flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input aria-label="Search service changes" placeholder="Customer (English or বাংলা), service or request ID…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Change type" className={`${inputClass} w-auto`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {SERVICE_CHANGE_TYPES.map((t) =>
            <option key={t}>{t}</option>
            )}
          </select>
          {canRequestChange(role) &&
          <button type="button" className={`${primaryBtn} ml-auto`} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Request change
            </button>
          }
        </div>
        <FilterPills label="Filter by status" options={FILTERS.map((f) => ({ id: f.id, label: f.label, count: byType.filter(f.test).length }))} value={filter} onChange={setFilter} />
      </div>
      <CustomerTable<ServiceChange>
        minWidth={940}
        rows={rows}
        rowKey={(x) => x.id}
        onOpen={(x) => navigate(`/service-changes/records/${x.id}`)}
        empty="No service changes match."
        columns={[
        { label: 'Customer · service', cell: (x) => <span><span className="block font-semibold text-slate-900">{customerName(db, x.customerId)}</span><span className="text-[11px] text-slate-500">{x.id} · {x.connectionId}</span></span> },
        { label: 'Change', cell: (x) => <span className="text-[11.5px]"><span className="block font-semibold text-slate-800">{x.type}</span><span className="text-slate-500">{x.fromValue} → {x.toValue}</span></span> },
        { label: 'Requested', cell: (x) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(x.requestedDate)}<span className="block text-slate-500">{userName(x.requestedById)}</span></span> },
        { label: 'Approved effective', cell: (x) => <span className="whitespace-nowrap text-[11.5px]">{x.effectiveDate ? formatDhakaDate(x.effectiveDate) : '—'}</span> },
        { label: 'Status', cell: (x) => <StatusBadge status={x.status} /> }]
        } />
      
      <AnimatePresence>
        {adding &&
        <NewChangeDialog
          presetCustomerId={presetCustomer}
          onClose={() => {
            setAdding(false);
            if (presetCustomer) {
              const next = new URLSearchParams(params);
              next.delete('new');
              setParams(next, { replace: true });
            }
          }} />

        }
      </AnimatePresence>
    </section>);

}