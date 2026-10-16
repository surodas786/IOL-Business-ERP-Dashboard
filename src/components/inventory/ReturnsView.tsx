import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock, itemOf } from '../../utils/inventoryRules';
import { formatDhaka } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { JobRequestsPanel } from './JobRequestsPanel';
import { LogReturnDialog } from './LogReturnDialog';
import { InspectDialog } from './InspectDialog';
import type { StockReturn } from '../../types/inventory';

export function ReturnsView() {
  const { db } = useData();
  const { role } = useSession();
  const { inScope } = useWarehouseScope();
  const manage = canManageStock(role);
  const [logging, setLogging] = useState(false);
  const [inspecting, setInspecting] = useState<StockReturn | null>(null);
  const rows = db.stockReturns.filter((r) => inScope(r.warehouse)).sort((a, b) => a.status === b.status ? b.receivedAt.localeCompare(a.receivedAt) : a.status === 'Awaiting Inspection' ? -1 : 1);
  const receivable = db.equipmentUnits.filter((u) => u.status === 'Receivable' && inScope(u.warehouse)).length;

  return (
    <div className="space-y-3">
      <JobRequestsPanel kind="Return" />
      <AdminPanel
        title="Returns"
        description={`Returned stock is restored only after receipt and inspection.${receivable ? ` ${receivable} IOL item(s) are still receivable from discontinued services — see Customer equipment.` : ''}`}
        actions={
        manage &&
        <button type="button" className={primaryBtn} onClick={() => setLogging(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Log return
            </button>

        }>
        
        <CustomerTable<StockReturn>
          minWidth={940}
          rows={rows}
          rowKey={(r) => r.id}
          empty="No returns."
          columns={[
          { label: 'Return', cell: (r) => <span><span className="block font-semibold text-slate-900">{r.id}</span><span className="text-[11px] text-slate-500">{r.source}</span></span> },
          { label: 'Item', cell: (r) => <span>{itemOf(db, r.sku)?.name ?? r.sku}{r.serials.length > 0 && <span className="block font-mono text-[10.5px] text-slate-500">{r.serials.join(', ')}</span>}</span> },
          { label: 'Qty', align: 'right', cell: (r) => `${r.quantity.toLocaleString('en-IN')} ${itemOf(db, r.sku)?.unit ?? ''}` },
          { label: 'From', cell: (r) => <span className="text-[11.5px]">{r.fromName}{(r.jobId || r.serviceChangeId || r.customerId) && <span className="block text-slate-500">{[r.jobId, r.serviceChangeId].filter(Boolean).join(' · ')}{r.customerId ? ` ${customerName(db, r.customerId)}` : ''}</span>}</span> },
          { label: 'Received', cell: (r) => <span className="whitespace-nowrap text-[11.5px]">{formatDhaka(r.receivedAt)}<span className="block text-slate-500">{r.warehouse.replace(' Warehouse', '')}</span></span> },
          { label: 'Inspection', cell: (r) => r.inspection ? <span className="text-[11.5px]">{r.inspection.good} good{r.inspection.damaged ? `, ${r.inspection.damaged} damaged` : ''}<span className="block text-slate-500">{r.inspection.byName} · {formatDhaka(r.inspection.at)}</span></span> : <StatusBadge status="Awaiting Inspection" /> },
          ...(manage ? [{ label: '', cell: (r: StockReturn) => r.status === 'Awaiting Inspection' ? <button type="button" className={linkBtn} onClick={() => setInspecting(r)}>Inspect</button> : null }] : [])]
          } />
        
      </AdminPanel>
      <AnimatePresence>
        {logging && <LogReturnDialog key="l" onClose={() => setLogging(false)} />}
        {inspecting && <InspectDialog key={inspecting.id} ret={inspecting} onClose={() => setInspecting(null)} />}
      </AnimatePresence>
    </div>);

}