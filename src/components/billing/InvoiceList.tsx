import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { invoiceNet, invoiceOutstanding, invoiceStatus } from '../../utils/relations';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { inputClass } from '../admin/FormField';
import { FilterPills } from './FilterPills';
import type { Invoice } from '../../types/records';

type Filter = 'open' | 'overdue' | 'paid' | 'all';
const FILTERS: {id: Filter;label: string;test: (i: Invoice) => boolean;}[] = [
{ id: 'open', label: 'Open', test: (i) => invoiceOutstanding(i) > 0 },
{ id: 'overdue', label: 'Overdue', test: (i) => invoiceStatus(i) === 'Overdue' },
{ id: 'paid', label: 'Paid', test: (i) => invoiceOutstanding(i) === 0 },
{ id: 'all', label: 'All', test: () => true }];


export function InvoiceList() {
  const { db } = useData();
  const navigate = useNavigate();
  const { invoices } = useBillingScope();
  const [filter, setFilter] = useState<Filter>('open');
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const name = (i: Invoice) => db.billingAccounts.find((b) => b.id === i.billingAccountId)?.name ?? '';
  const bn = (i: Invoice) => db.customers.find((c) => c.id === i.customerId)?.nameBn ?? '';
  const rows = invoices.filter(FILTERS.find((f) => f.id === filter)!.test).filter((i) => !s || [i.id, i.billingAccountId, name(i), bn(i), i.period].join(' ').toLowerCase().includes(s));

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search invoices" placeholder="Invoice, account or customer (English or বাংলা)…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterPills label="Filter invoices" options={FILTERS.map((f) => ({ id: f.id, label: f.label, count: invoices.filter(f.test).length }))} value={filter} onChange={setFilter} />
      </div>
      <CustomerTable<Invoice>
        minWidth={900}
        rows={rows}
        rowKey={(i) => i.id}
        onOpen={(i) => navigate(`/billing/invoice/${i.id}`)}
        empty="No invoices match."
        columns={[
        { label: 'Invoice', cell: (i) => <span><span className="block font-semibold text-slate-900">{i.id}</span><span className="text-[11px] text-slate-500">{name(i)}</span></span> },
        { label: 'Period', cell: (i) => <span className="text-[11.5px]">{i.period}<span className="block text-slate-500">{i.kind ?? 'Recurring'} · {i.billingTerm ?? '—'}</span></span> },
        { label: 'Net', align: 'right', cell: (i) => formatBDT(invoiceNet(i)) },
        { label: 'Paid', align: 'right', cell: (i) => formatBDT(i.paidAmount) },
        { label: 'Outstanding', align: 'right', cell: (i) => <span className="font-semibold">{formatBDT(invoiceOutstanding(i))}</span> },
        { label: 'Due', cell: (i) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(i.dueDate)}</span> },
        { label: 'Status', cell: (i) => <StatusBadge status={invoiceStatus(i)} /> }]
        } />
      
    </section>);

}