import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { formatDhakaDate } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { expectedReplacement, itemOf, replacementState } from '../../utils/inventoryRules';
import { inputClass } from '../admin/FormField';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { FilterPills } from '../billing/FilterPills';
import { OWNERSHIPS, type EquipmentUnit, type Ownership } from '../../types/inventory';

type Filter = 'all' | 'receivable' | 'replacement' | Ownership;

export function CustomerEquipmentView() {
  const { db } = useData();
  const { branchFilter } = useSession();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const atSites = db.equipmentUnits.filter((u) => ['Installed', 'Receivable'].includes(u.status) && u.customerId && (branchFilter === 'all' || u.branchId === branchFilter));
  const test = (u: EquipmentUnit, f: Filter) =>
  f === 'all' ? true : f === 'receivable' ? u.status === 'Receivable' : f === 'replacement' ? ['due', 'overdue'].includes(replacementState(db, u)) : u.ownership === f;
  const s = q.trim().toLowerCase();
  const rows = atSites.
  filter((u) => test(u, filter)).
  filter((u) => !s || [u.serial, u.connectionId, customerName(db, u.customerId!), db.customers.find((c) => c.id === u.customerId)?.nameBn ?? '', itemOf(db, u.sku)?.name ?? u.itemName ?? ''].join(' ').toLowerCase().includes(s)).
  sort((a, b) => (a.status === 'Receivable' ? -1 : 0) - (b.status === 'Receivable' ? -1 : 0) || customerName(db, a.customerId!).localeCompare(customerName(db, b.customerId!)));
  const filters: {id: Filter;label: string;}[] = [
  { id: 'all', label: 'All at customer sites' },
  { id: 'receivable', label: 'Receivable' },
  { id: 'replacement', label: 'Replacement due' },
  ...OWNERSHIPS.map((o) => ({ id: o as Filter, label: o }))];


  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search equipment" placeholder="Serial, customer (English or বাংলা) or service…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterPills label="Filter equipment" options={filters.map((f) => ({ ...f, count: atSites.filter((u) => test(u, f.id)).length }))} value={filter} onChange={setFilter} />
      </div>
      <CustomerTable<EquipmentUnit>
        minWidth={1040}
        rows={rows}
        rowKey={(u) => u.id}
        empty="No equipment matches."
        columns={[
        { label: 'Equipment', cell: (u) => <span><span className="block font-mono text-[11.5px] font-semibold text-slate-900">{u.serial}</span><span className="text-[11px] text-slate-500">{itemOf(db, u.sku)?.name ?? u.itemName}</span></span> },
        { label: 'Customer · service', cell: (u) => <span><Link to={`/customers/${u.customerId}/equipment`} className="block font-semibold text-slate-800 hover:text-primary">{customerName(db, u.customerId!)}</Link><span className="text-[11px] text-slate-500">{u.connectionId}{u.jobId ? ` · ${u.jobId}` : ''}</span></span> },
        { label: 'Ownership', cell: (u) => <span className="text-[11.5px]">{u.ownership}{u.ownerName && <span className="block text-slate-500">{u.ownerName}</span>}</span> },
        { label: 'Deployed', cell: (u) => <span className="whitespace-nowrap text-[11.5px]">{u.deployedAt ? formatDhakaDate(u.deployedAt) : '—'}</span> },
        { label: 'Usable life', cell: (u) => <span className="text-[11.5px]">{itemOf(db, u.sku)?.usableLifeMonths ? `${itemOf(db, u.sku)!.usableLifeMonths} months` : '—'}</span> },
        {
          label: 'Expected replacement',
          cell: (u) => {
            const r = expectedReplacement(db, u);
            const st = replacementState(db, u);
            return <span className={`whitespace-nowrap text-[11.5px] ${st === 'overdue' ? 'font-semibold text-status-critical' : st === 'due' ? 'font-semibold text-status-warning' : ''}`}>{r ? formatDhakaDate(r) : '—'}{st === 'overdue' && <span className="block font-normal">Past usable life</span>}{st === 'due' && <span className="block font-normal">Within 90 days</span>}</span>;
          }
        },
        { label: 'Status', cell: (u) => <span><StatusBadge status={u.status} />{u.status === 'Receivable' && <span className="block text-[11px] text-slate-500">{u.serviceChangeId} · since {formatDhakaDate(u.receivableSince!)}</span>}</span> }]
        } />
      
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">When a discontinuation is approved, returnable IOL-owned and rented equipment at that service is flagged receivable. It returns to stock only after retrieval and inspection.</p>
    </section>);

}