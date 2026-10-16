import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedAssociates } from '../../hooks/useScopedAssociates';
import { formatBDT } from '../../utils/format';
import { userName } from '../../utils/relations';
import { balances, canSeeAssociateMoney, dueState, tierOf } from '../../utils/associateRules';
import { inputClass } from '../admin/FormField';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { FilterPills } from '../billing/FilterPills';
import type { Associate } from '../../types/records';

type Filter = 'all' | Associate['collectionModel'] | 'attention';

export function AssociateDirectory() {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const { associates, settlements } = useScopedAssociates();
  const money = canSeeAssociateMoney(role);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const flags = (a: Associate) => {
    const states = settlements.filter((s) => s.associateId === a.id).map((s) => dueState(a, s));
    return { suspension: a.status === 'Suspension Review' || a.status === 'Suspended' || states.includes('suspension'), overdue: states.includes('overdue'), reminder: states.includes('reminder') };
  };
  const needsAttention = (a: Associate) => {
    const f = flags(a);
    return f.suspension || f.overdue || f.reminder;
  };
  const test = (a: Associate, f: Filter) => f === 'all' ? true : f === 'attention' ? needsAttention(a) : a.collectionModel === f;
  const s = q.trim().toLowerCase();
  const rows = associates.
  filter((a) => test(a, filter)).
  filter((a) => !s || `${a.id} ${a.name} ${a.nameBn} ${a.territory ?? ''} ${a.clientIdPrefix ?? ''}`.toLowerCase().includes(s)).
  sort((a, b) => a.name.localeCompare(b.name));
  const opts: {id: Filter;label: string;}[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'Centralised', label: 'Centralised' },
  { id: 'Decentralised', label: 'Decentralised' },
  { id: 'Fixed Monthly', label: 'Fixed monthly' }];


  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <FilterPills label="Filter associates" options={opts.map((o) => ({ ...o, count: associates.filter((a) => test(a, o.id)).length }))} value={filter} onChange={setFilter} />
        <div className="relative ml-auto min-w-[240px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search associates" placeholder="Name (English or বাংলা), territory, prefix…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <CustomerTable<Associate>
        minWidth={money ? 1040 : 820}
        rows={rows}
        rowKey={(a) => a.id}
        onOpen={(a) => navigate(`/associates/records/${a.id}`)}
        empty="No associates match."
        columns={[
        { label: 'Associate', cell: (a) => <span><span className="block font-semibold text-slate-900">{a.name}</span><span className="text-[11px] text-slate-500">{a.nameBn} · {a.id} · {a.clientIdPrefix}</span></span> },
        { label: 'Territory', cell: (a) => <span className="text-[11.5px]">{a.territory ?? '—'}<span className="block text-slate-500">{userName(a.responsibleExecutiveId)}</span></span> },
        { label: 'Tier', cell: (a) => <span className="text-[11.5px]">Tier {tierOf(db, a.id)}{a.parentId && <span className="block text-slate-500">under {db.associates.find((p) => p.id === a.parentId)?.name}</span>}</span> },
        { label: 'Model', cell: (a) => <span className="text-[11.5px]">{a.collectionModel}{money && <span className="block text-slate-500">{a.collectionModel === 'Fixed Monthly' ? `${formatBDT(a.fixedMonthly ?? 0)}/month` : `${a.revenueSharePct}% · ${a.sharingBasis?.toLowerCase()}`}</span>}</span> },
        ...(money ?
        [
        {
          label: 'Due to IOL',
          align: 'right' as const,
          cell: (a: Associate) => {
            const b = balances(db, a.id);
            return <span className={`tabular-nums ${b.Due > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{formatBDT(b.Due)}</span>;
          }
        }] :

        []),
        { label: 'Subscribers', align: 'right', cell: (a) => a.subscribers.toLocaleString('en-IN') },
        {
          label: 'Status',
          cell: (a) => {
            const f = flags(a);
            return (
              <span className="flex flex-col items-start gap-0.5">
                  <StatusBadge status={a.status ?? 'Active'} />
                  {f.suspension && a.status === 'Active' && <StatusBadge status="Past grace — suspension review" />}
                  {f.overdue && <StatusBadge status="Overdue" />}
                  {f.reminder && <StatusBadge status="Due soon" />}
                </span>);

          }
        }]
        } />
      
    </section>);

}