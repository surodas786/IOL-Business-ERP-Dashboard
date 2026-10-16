import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock } from '../../utils/inventoryRules';
import { AdminPanel, primaryBtn } from '../admin/AdminPanel';
import { MovementTable } from './MovementTable';
import { TransferDialog } from './TransferDialog';

export function TransfersView() {
  const { db } = useData();
  const { role } = useSession();
  const { inScope } = useWarehouseScope();
  const [open, setOpen] = useState(false);
  const rows = db.inventoryMovements.filter((m) => m.type === 'Transfer' && (inScope(m.from) || inScope(m.to))).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <AdminPanel
      title="Transfers"
      description="Stock moved between warehouses. On-hand moves with it; serial records follow the unit."
      actions={
      canManageStock(role) &&
      <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New transfer
          </button>

      }>
      
      <MovementTable rows={rows} empty="No transfers in this scope." showType={false} />
      <AnimatePresence>{open && <TransferDialog key="t" onClose={() => setOpen(false)} />}</AnimatePresence>
    </AdminPanel>);

}