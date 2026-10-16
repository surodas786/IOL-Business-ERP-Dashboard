import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { canManageStock, canSeeCost } from '../../utils/inventoryRules';
import { formatBDT } from '../../utils/format';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { ItemDialog } from './ItemDialog';
import type { InventoryItem } from '../../types/inventory';

export function ItemMasterView() {
  const { db } = useData();
  const { role } = useSession();
  const manage = canManageStock(role);
  const cost = canSeeCost(role);
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const latest = (sku: string) => db.vendorPrices.filter((p) => p.sku === sku).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0];

  return (
    <AdminPanel
      title={`Item master · ${db.inventoryItems.length}`}
      description="Serial-tracked equipment and quantity-based consumables. Usable life drives expected replacement dates at customer sites."
      actions={
      manage &&
      <button type="button" className={primaryBtn} onClick={() => setEditing('new')}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New item
          </button>

      }>
      
      <CustomerTable<InventoryItem>
        minWidth={900}
        rows={[...db.inventoryItems].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))}
        rowKey={(i) => i.sku}
        empty="No items."
        columns={[
        { label: 'Item', cell: (i) => <span><span className="block font-semibold text-slate-900">{i.name}</span><span className="font-mono text-[10.5px] text-slate-400">{i.sku}</span></span> },
        { label: 'Category', cell: (i) => i.category },
        { label: 'Tracking', cell: (i) => i.tracking === 'Serial' ? 'Serial' : `Quantity (${i.unit})` },
        { label: 'Returnable', cell: (i) => i.returnable ? 'Yes' : 'No' },
        { label: 'Usable life', cell: (i) => i.usableLifeMonths ? `${i.usableLifeMonths} months` : '—' },
        { label: 'Reorder at', align: 'right', cell: (i) => i.reorderLevel.toLocaleString('en-IN') },
        ...(cost ? [{ label: 'Last price', align: 'right' as const, cell: (i: InventoryItem) => {const p = latest(i.sku);return p ? formatBDT(p.unitPrice) : '—';} }] : []),
        { label: 'Status', cell: (i) => <StatusBadge status={i.active ? 'Active' : 'Inactive'} /> },
        ...(manage ?
        [{ label: '', cell: (i: InventoryItem) =>
          <button type="button" className={linkBtn} onClick={(e) => {e.stopPropagation();setEditing(i);}}>
                    Edit
                  </button>
        }] :
        [])]
        } />
      
      <AnimatePresence>{editing && <ItemDialog key="d" item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}</AnimatePresence>
    </AdminPanel>);

}