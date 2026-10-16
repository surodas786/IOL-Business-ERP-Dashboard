import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { SnapshotCell } from '../SnapshotCell';
import { DEMO_NOW, formatBDT, formatDhaka, formatDhakaDate } from '../../../utils/format';
import { accountOutstanding, invoiceOutstanding, receiptUnallocated } from '../../../utils/relations';
import { canViewPaymentDetails, customerInvoices, maskReference } from '../../../utils/customerProfile';
import type { Customer, Invoice, Receipt } from '../../../types/records';

export function BillingTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const paymentOk = canViewPaymentDetails(role);
  const bas = db.billingAccounts.filter((b) => b.customerId === c.id);
  const baIds = new Set(bas.map((b) => b.id));
  const invoices = customerInvoices(db, c).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const receipts = db.receipts.filter((r) => baIds.has(r.billingAccountId)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const outstanding = bas.reduce((s, b) => s + accountOutstanding(db, b.id), 0);
  const unallocated = receipts.filter((r) => r.status === 'Verified' && r.purpose !== 'Security deposit').reduce((s, r) => s + receiptUnallocated(r), 0);
  const deposit = receipts.filter((r) => r.status === 'Verified' && r.purpose === 'Security deposit').reduce((s, r) => s + r.amount, 0);

  const invoiceStatus = (i: Invoice) => {
    const due = invoiceOutstanding(i);
    if (due <= 0) return 'Paid';
    if (new Date(i.dueDate) < DEMO_NOW) return 'Overdue';
    return i.paidAmount > 0 ? 'Part Paid' : 'Unpaid';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
        <Figure label="Outstanding" value={formatBDT(outstanding)} tone={outstanding > 0 ? 'text-status-critical' : 'text-slate-900'} />
        <Figure label="Unallocated advance" value={formatBDT(unallocated)} tone={unallocated > 0 ? 'text-status-warning' : 'text-slate-900'} />
        <Figure label="Security deposit (held)" value={formatBDT(deposit)} />
        <Figure label="Billing accounts" value={bas.length === 1 ? '1 · consolidated' : `${bas.length} · separate`} />
      </div>

      <AdminPanel title="Invoices" description="“Issued to” shows the customer identity captured on the invoice. Approved profile corrections never rewrite it.">
        <CustomerTable<Invoice>
          minWidth={820}
          rows={invoices}
          rowKey={(i) => i.id}
          onOpen={(i) => openRecord({ type: 'invoice', id: i.id })}
          empty="No invoices yet."
          columns={[
          { label: 'Invoice', cell: (i) => <span><span className="block font-semibold text-slate-900">{i.id}</span><span className="block text-[11px] text-slate-500">{i.billingAccountId} · {i.period}</span></span> },
          { label: 'Issued to', cell: (i) => <SnapshotCell snapshot={i.customerSnapshot} customer={c} /> },
          { label: 'Amount', align: 'right', cell: (i) => formatBDT(i.amount - i.credits) },
          { label: 'Outstanding', align: 'right', cell: (i) => formatBDT(invoiceOutstanding(i)) },
          { label: 'Due', cell: (i) => formatDhakaDate(i.dueDate) },
          { label: 'Status', cell: (i) => <StatusBadge status={invoiceStatus(i)} /> }]
          } />
        
      </AdminPanel>

      <AdminPanel title="Receipts" description={paymentOk ? undefined : 'Payment references are masked for your role.'}>
        <CustomerTable<Receipt>
          rows={receipts}
          rowKey={(r) => r.id}
          onOpen={(r) => openRecord({ type: 'receipt', id: r.id })}
          empty="No receipts recorded."
          columns={[
          { label: 'Receipt', cell: (r) => <span className="font-semibold text-slate-900">{r.id}</span> },
          { label: 'Method · reference', cell: (r) => <span className="text-[11.5px]">{r.method}<span className="block text-slate-500">{paymentOk ? r.reference : maskReference(r.reference)}</span></span> },
          { label: 'Amount', align: 'right', cell: (r) => formatBDT(r.amount) },
          { label: 'Unallocated', align: 'right', cell: (r) => formatBDT(receiptUnallocated(r)) },
          { label: 'Received', cell: (r) => formatDhaka(r.receivedAt) },
          { label: 'Status', cell: (r) => <StatusBadge status={r.status} /> }]
          } />
        
      </AdminPanel>
    </div>);

}

function Figure({ label, value, tone = 'text-slate-900' }: {label: string;value: string;tone?: string;}) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-[16px] font-bold tabular-nums ${tone}`}>{value}</p>
    </div>);

}