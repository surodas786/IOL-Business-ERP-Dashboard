import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT } from '../../utils/format';
import { accountBalances, termsOf } from '../../utils/billingCalc';
import { CustomerTable } from '../customers/CustomerTable';
import { inputClass } from '../admin/FormField';
import type { BillingAccount } from '../../types/records';

export function StatementsList() {
  const { db } = useData();
  const navigate = useNavigate();
  const { accounts } = useBillingScope();
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const holder = (b: BillingAccount) => b.customerId ? db.customers.find((c) => c.id === b.customerId) : undefined;
  const rows = accounts.filter((b) => !s || [b.id, b.name, holder(b)?.nameBn ?? '', b.billingContact].join(' ').toLowerCase().includes(s));

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search billing accounts" placeholder="Billing account, customer or contact…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <CustomerTable<BillingAccount>
        minWidth={900}
        rows={rows}
        rowKey={(b) => b.id}
        onOpen={(b) => navigate(`/billing/statement/${b.id}`)}
        empty="No billing accounts in your scope."
        columns={[
        { label: 'Billing account', cell: (b) => <span><span className="block font-semibold text-slate-900">{b.name}</span><span className="text-[11px] text-slate-500">{b.id} · {b.collectionMode}</span></span> },
        { label: 'Terms', cell: (b) => {const t = termsOf(b);return <span className="text-[11.5px]">{t.term}{t.term === 'Postpaid' ? ` · ${t.creditDays} days` : ''}</span>;} },
        { label: 'Due', align: 'right', cell: (b) => {const v = accountBalances(db, b.id).due;return <span className={v > 0 ? 'font-semibold text-status-critical' : ''}>{formatBDT(v)}</span>;} },
        { label: 'Advance', align: 'right', cell: (b) => {const v = accountBalances(db, b.id).advance;return <span className={v > 0 ? 'font-semibold text-status-warning' : ''}>{formatBDT(v)}</span>;} },
        { label: 'Deposit', align: 'right', cell: (b) => formatBDT(accountBalances(db, b.id).deposit) },
        { label: 'Note', cell: (b) => {const x = accountBalances(db, b.id);return <span className="text-[11px] text-slate-500">{x.due > 0 && x.advance > 0 ? 'Advance and due coexist — see statement' : x.pendingClaims > 0 ? `${formatBDT(x.pendingClaims)} unverified` : ''}</span>;} }]
        } />
      
    </section>);

}