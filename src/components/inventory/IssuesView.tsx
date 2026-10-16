import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock, itemOf } from '../../utils/inventoryRules';
import { customerName } from '../../utils/relations';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { JobRequestsPanel } from './JobRequestsPanel';
import { MovementTable } from './MovementTable';
import { IssueDialog } from './IssueDialog';
import { InstallDialog } from './InstallDialog';
import type { EquipmentUnit } from '../../types/inventory';
import type { StockItem } from '../../types/survey';

export function IssuesView() {
  const { db } = useData();
  const { role } = useSession();
  const { inScope } = useWarehouseScope();
  const manage = canManageStock(role);
  const [issuing, setIssuing] = useState(false);
  const [installing, setInstalling] = useState<EquipmentUnit | null>(null);
  const units = db.equipmentUnits.filter((u) => u.status === 'Issued' && inScope(u.warehouse));
  const qtyHeld = db.stockItems.filter((s) => inScope(s.warehouse) && (s.withTechnician ?? 0) > 0 && itemOf(db, s.sku)?.tracking !== 'Serial');
  const history = db.inventoryMovements.filter((m) => m.type === 'Issue' && inScope(m.from) || m.type === 'Installation').sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-3">
      <JobRequestsPanel kind="Issue" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminPanel title={`Equipment with technicians · ${units.length}`} description="Issued serials not yet installed or returned. A serial can be allocated to only one technician or site at a time.">
          <CustomerTable<EquipmentUnit>
            minWidth={620}
            rows={units}
            rowKey={(u) => u.id}
            empty="No serial-tracked equipment is out with technicians."
            columns={[
            { label: 'Serial', cell: (u) => <span><span className="block font-mono text-[11.5px] font-semibold text-slate-900">{u.serial}</span><span className="text-[11px] text-slate-500">{itemOf(db, u.sku)?.name}</span></span> },
            { label: 'Technician', cell: (u) => u.technicianName ?? '—' },
            { label: 'For', cell: (u) => <span className="text-[11.5px]">{u.jobId ?? u.workOrderId ?? u.serviceChangeId ?? '—'}{u.customerId && <span className="block text-slate-500">{customerName(db, u.customerId)}</span>}</span> },
            ...(manage ? [{ label: '', cell: (u: EquipmentUnit) => <button type="button" className={linkBtn} onClick={() => setInstalling(u)}>Record installation</button> }] : [])]
            } />
          
        </AdminPanel>
        <AdminPanel title="Consumables with technicians" description="Issued quantity not yet consumed on site or returned.">
          <CustomerTable<StockItem>
            minWidth={360}
            rows={qtyHeld}
            rowKey={(s) => s.id}
            empty="No consumables out with technicians."
            columns={[
            { label: 'Item', cell: (s) => s.name },
            { label: 'From', cell: (s) => s.warehouse.replace(' Warehouse', '') },
            { label: 'Held', align: 'right', cell: (s) => `${(s.withTechnician ?? 0).toLocaleString('en-IN')} ${s.unit}` }]
            } />
          
        </AdminPanel>
      </div>
      <AdminPanel
        title="Issue and installation history"
        actions={
        manage &&
        <button type="button" className={primaryBtn} onClick={() => setIssuing(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Issue stock
            </button>

        }>
        
        <MovementTable rows={history} empty="No issues recorded." />
      </AdminPanel>
      <AnimatePresence>
        {issuing && <IssueDialog key="i" onClose={() => setIssuing(false)} />}
        {installing && <InstallDialog key={installing.id} unit={installing} onClose={() => setInstalling(null)} />}
      </AnimatePresence>
    </div>);

}