import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock, canSeeCost } from '../../utils/inventoryRules';
import { AdminPanel, primaryBtn } from '../admin/AdminPanel';
import { MovementTable } from './MovementTable';
import { ReceiveDialog } from './ReceiveDialog';

export function ReceiptsView() {
  const { db } = useData();
  const { role } = useSession();
  const { inScope } = useWarehouseScope();
  const [open, setOpen] = useState(false);
  const rows = db.inventoryMovements.filter((m) => m.type === 'Receipt' && inScope(m.to)).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <AdminPanel
      title="Receipts"
      description="Goods received from vendors. Each receipt adds to on-hand, creates serial records for equipment and adds a vendor price point."
      actions={
      canManageStock(role) &&
      <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Receive stock
          </button>

      }>
      
      <MovementTable rows={rows} empty="No receipts in this scope." showCost={canSeeCost(role)} showType={false} />
      <AnimatePresence>{open && <ReceiveDialog key="r" onClose={() => setOpen(false)} />}</AnimatePresence>
    </AdminPanel>);

}