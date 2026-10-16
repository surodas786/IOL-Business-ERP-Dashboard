import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock, itemOf } from '../../utils/inventoryRules';
import { formatDhaka } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { FilterPills } from '../billing/FilterPills';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import { JobRequestsPanel } from './JobRequestsPanel';
import { ReserveDialog } from './ReserveDialog';
import type { StockReservation } from '../../types/inventory';

type Filter = 'Active' | 'Fulfilled' | 'Released' | 'all';

export function ReservationsView() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const { inScope } = useWarehouseScope();
  const manage = canManageStock(role);
  const [filter, setFilter] = useState<Filter>('Active');
  const [adding, setAdding] = useState(false);
  const [releasing, setReleasing] = useState<StockReservation | null>(null);
  const all = db.stockReservations.filter((r) => inScope(r.warehouse));
  const rows = all.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-3">
      <JobRequestsPanel kind="Reservation" />
      <AdminPanel
        title="Reservations"
        description="Held for jobs, work orders and service changes. Available = on hand − reserved; on-hand is not reduced."
        actions={
        manage &&
        <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Reserve stock
            </button>

        }>
        
        <div className="border-b border-slate-100 px-4 py-2">
          <FilterPills label="Status" options={(['Active', 'Fulfilled', 'Released', 'all'] as Filter[]).map((f) => ({ id: f, label: f === 'all' ? 'All' : f, count: f === 'all' ? all.length : all.filter((r) => r.status === f).length }))} value={filter} onChange={setFilter} />
        </div>
        <CustomerTable<StockReservation>
          minWidth={900}
          rows={rows}
          rowKey={(r) => r.id}
          empty="No reservations."
          columns={[
          { label: 'Reservation', cell: (r) => <span><span className="block font-semibold text-slate-900">{r.id}</span><span className="text-[11px] text-slate-500">{r.warehouse.replace(' Warehouse', '')}</span></span> },
          { label: 'Item', cell: (r) => itemOf(db, r.sku)?.name ?? r.sku },
          { label: 'Reserved', align: 'right', cell: (r) => `${r.quantity.toLocaleString('en-IN')} ${itemOf(db, r.sku)?.unit ?? ''}` },
          { label: 'Issued', align: 'right', cell: (r) => r.issued.toLocaleString('en-IN') },
          { label: 'For', cell: (r) => <span className="text-[11.5px]">{[r.jobId, r.workOrderId, r.serviceChangeId].filter(Boolean).join(' · ')}{r.customerId && <span className="block text-slate-500">{customerName(db, r.customerId)}</span>}</span> },
          { label: 'Held', cell: (r) => <span className="text-[11.5px]">{formatDhaka(r.at)}<span className="block text-slate-500">{r.status === 'Released' ? `Released — ${r.releasedReason}` : r.note ?? r.byName}</span></span> },
          { label: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          ...(manage ? [{ label: '', cell: (r: StockReservation) => r.status === 'Active' ? <button type="button" className={linkBtn} onClick={() => setReleasing(r)}>Release</button> : null }] : [])]
          } />
        
      </AdminPanel>
      <AnimatePresence>
        {adding && <ReserveDialog key="a" onClose={() => setAdding(false)} />}
        {releasing &&
        <BillingReasonDialog
          key="r"
          title={`Release ${releasing.id}`}
          description={`${releasing.quantity - releasing.issued} ${itemOf(db, releasing.sku)?.unit ?? ''} returns to available stock.`}
          submitLabel="Release reservation"
          onSubmit={(reason) => runAction({ type: 'INV_RELEASE', reservationId: releasing.id, reason })}
          onClose={() => setReleasing(null)} />

        }
      </AnimatePresence>
    </div>);

}