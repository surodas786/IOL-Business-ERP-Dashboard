import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { SnapshotCell } from '../SnapshotCell';
import { hasPermission } from '../../../utils/access';
import { formatBDT, formatDhaka } from '../../../utils/format';
import { recordName, userName } from '../../../utils/relations';
import { customerQuotations } from '../../../utils/customerProfile';
import type { Customer, Quotation, WorkOrder } from '../../../types/records';

export function QuotationsTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const pipe = hasPermission(role, 'viewPipeline');
  const margin = hasPermission(role, 'viewMargins');
  const quotes = customerQuotations(db, c);
  const orders = db.workOrders.filter((w) => w.customerId === c.id);

  return (
    <div className="space-y-3">
      <AdminPanel title="Quotations" description="“Issued to” is the customer identity captured when the quotation was issued; later profile corrections don’t change it.">
        <CustomerTable<Quotation>
          rows={quotes}
          rowKey={(q) => q.id}
          onOpen={(q) => openRecord({ type: 'quotation', id: q.id })}
          empty="No quotations."
          columns={[
          { label: 'Quotation', cell: (q) => <span><span className="block font-semibold text-slate-900">{q.id}</span><span className="block text-[11px] text-slate-500">{q.description}</span></span> },
          { label: 'Issued to', cell: (q) => <SnapshotCell snapshot={q.customerSnapshot} customer={c} /> },
          ...(pipe ? [{ label: 'MRC · OTC', align: 'right' as const, cell: (q: Quotation) => <span>{formatBDT(q.mrc)}<span className="block text-[11px] text-slate-500">{formatBDT(q.otc)}</span></span> }] : []),
          ...(margin ? [{ label: 'Margin', align: 'right' as const, cell: (q: Quotation) => `${q.marginPct}%` }] : []),
          { label: 'Status', cell: (q) => <StatusBadge status={q.status} /> },
          { label: 'Prepared', cell: (q) => <span className="text-[11.5px]">{userName(q.preparedById)}<span className="block text-slate-500">{formatDhaka(q.createdAt)}</span></span> }]
          } />
        
      </AdminPanel>
      <AdminPanel title="Work orders">
        <CustomerTable<WorkOrder>
          rows={orders}
          rowKey={(w) => w.id}
          onOpen={(w) => openRecord({ type: 'workOrder', id: w.id })}
          empty="No work orders yet."
          columns={[
          { label: 'Work order', cell: (w) => <span className="font-semibold text-slate-900">{w.id}</span> },
          { label: 'Type', cell: (w) => w.type },
          { label: 'Site', cell: (w) => recordName(db, { type: 'site', id: w.siteId }).split(',')[0] },
          { label: 'Issued to', cell: (w) => <SnapshotCell snapshot={w.customerSnapshot} customer={c} /> },
          { label: 'Source', cell: (w) => w.quotationId ?? w.serviceChangeId ?? '—' },
          { label: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
          { label: 'Raised', cell: (w) => <span className="text-[11.5px]">{userName(w.createdById)}<span className="block text-slate-500">{formatDhaka(w.createdAt)}</span></span> }]
          } />
        
      </AdminPanel>
    </div>);

}