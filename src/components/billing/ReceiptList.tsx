import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT, formatDhaka } from '../../utils/format';
import { receiptUnallocated } from '../../utils/relations';
import { canViewPaymentDetails, maskReference } from '../../utils/customerProfile';
import { canRecordPayment } from '../../utils/billingCalc';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { primaryBtn } from '../admin/AdminPanel';
import { FilterPills } from './FilterPills';
import { RecordReceiptDialog } from './RecordReceiptDialog';
import type { Receipt } from '../../types/records';

type Filter = 'all' | 'pending' | 'verified' | 'advance' | 'deposit' | 'closed';
const FILTERS: {id: Filter;label: string;test: (r: Receipt) => boolean;}[] = [
{ id: 'all', label: 'All', test: () => true },
{ id: 'pending', label: 'Unverified', test: (r) => r.status === 'Pending Verification' },
{ id: 'verified', label: 'Verified', test: (r) => r.status === 'Verified' && r.purpose !== 'Security deposit' },
{ id: 'advance', label: 'With unallocated advance', test: (r) => r.status === 'Verified' && r.purpose !== 'Security deposit' && receiptUnallocated(r) > 0 },
{ id: 'deposit', label: 'Security deposits', test: (r) => r.purpose === 'Security deposit' },
{ id: 'closed', label: 'Rejected or reversed', test: (r) => r.status === 'Rejected' || r.status === 'Reversed' }];


export function ReceiptList() {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const { receipts } = useBillingScope();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const paymentOk = canViewPaymentDetails(role);
  const rows = receipts.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <FilterPills label="Filter receipts" options={FILTERS.map((f) => ({ id: f.id, label: f.label, count: receipts.filter(f.test).length }))} value={filter} onChange={setFilter} />
        {canRecordPayment(role) &&
        <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Record payment
          </button>
        }
      </div>
      {!paymentOk && <p className="border-b border-slate-100 px-4 py-1.5 text-[11px] text-slate-500">Transaction references are masked for your role.</p>}
      <CustomerTable<Receipt>
        minWidth={940}
        rows={rows}
        rowKey={(r) => r.id}
        onOpen={(r) => navigate(`/billing/receipt/${r.id}`)}
        empty="No receipts match."
        columns={[
        { label: 'Receipt', cell: (r) => <span><span className="block font-semibold text-slate-900">{r.id}</span><span className="text-[11px] text-slate-500">{db.billingAccounts.find((b) => b.id === r.billingAccountId)?.name}</span></span> },
        { label: 'Payer · collector', cell: (r) => <span className="text-[11.5px]">{r.payer ?? '—'}<span className="block text-slate-500">{r.collectorName ?? '—'}</span></span> },
        { label: 'Method · reference', cell: (r) => <span className="text-[11.5px]">{r.method}<span className="block font-mono text-[11px] text-slate-500">{paymentOk ? r.reference : maskReference(r.reference)}</span></span> },
        { label: 'Amount', align: 'right', cell: (r) => formatBDT(r.amount) },
        { label: 'Unallocated', align: 'right', cell: (r) => r.purpose === 'Security deposit' ? <span className="text-[11px] text-slate-500">Deposit</span> : r.status === 'Verified' ? formatBDT(receiptUnallocated(r)) : '—' },
        { label: 'Received', cell: (r) => <span className="whitespace-nowrap text-[11.5px]">{formatDhaka(r.receivedAt)}</span> },
        { label: 'Status', cell: (r) => <StatusBadge status={r.status} /> }]
        } />
      
      <AnimatePresence>{adding && <RecordReceiptDialog onClose={() => setAdding(false)} />}</AnimatePresence>
    </section>);

}