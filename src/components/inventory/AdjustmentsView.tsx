import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { hasPermission } from '../../utils/access';
import { canManageStock, canSeeCost, itemOf } from '../../utils/inventoryRules';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { AdjustmentDialog } from './AdjustmentDialog';
import type { StockAdjustment } from '../../types/inventory';

export function AdjustmentsView() {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const { inScope } = useWarehouseScope();
  const [open, setOpen] = useState(false);
  const cost = canSeeCost(role);
  const approver = hasPermission(role, 'approveFinancial');
  const rows = db.stockAdjustments.filter((a) => inScope(a.warehouse));
  const unitCost = (a: StockAdjustment) => db.stockItems.find((s) => s.sku === a.sku && s.warehouse === a.warehouse)?.unitCost ?? 0;

  return (
    <AdminPanel
      title="Adjustments"
      description="Damage, loss, found stock and count corrections. Every adjustment needs a reason and Finance Approver approval before stock changes."
      actions={
      canManageStock(role) &&
      <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Request adjustment
          </button>

      }>
      
      <CustomerTable<StockAdjustment>
        minWidth={960}
        rows={rows}
        rowKey={(a) => a.id}
        empty="No adjustments."
        columns={[
        { label: 'Adjustment', cell: (a) => <span><span className="block font-semibold text-slate-900">{a.id}</span><span className="text-[11px] text-slate-500">{a.kind}</span></span> },
        { label: 'Item', cell: (a) => <span>{itemOf(db, a.sku)?.name ?? a.sku}<span className="block text-[11px] text-slate-500">{a.warehouse.replace(' Warehouse', '')}{a.serials.length ? ` · ${a.serials.join(', ')}` : ''}</span></span> },
        { label: 'Change', align: 'right', cell: (a) => <span className={`font-semibold ${a.direction === 'Decrease' ? 'text-status-critical' : 'text-status-ok'}`}>{a.direction === 'Decrease' ? '−' : '+'}{a.quantity} {itemOf(db, a.sku)?.unit}</span> },
        ...(cost ? [{ label: 'Value', align: 'right' as const, cell: (a: StockAdjustment) => formatBDT(a.quantity * unitCost(a)) }] : []),
        { label: 'Reason', cell: (a) => <span className="block max-w-[320px] text-[11.5px] text-slate-600">{a.reason}</span> },
        { label: 'Requested', cell: (a) => <span className="whitespace-nowrap text-[11.5px]">{userName(a.requestedById)}<span className="block text-slate-500">{formatDhaka(a.requestedAt)}</span></span> },
        { label: 'Status', cell: (a) => <span><StatusBadge status={a.status} />{a.decidedById && <span className="block text-[11px] text-slate-500">{userName(a.decidedById)}</span>}</span> },
        ...(approver ?
        [{ label: '', cell: (a: StockAdjustment) => a.status === 'Pending Approval' && a.requestedById !== user.id ?
          <ApprovalButtons approvalId={a.approvalId} /> :
          null }] :
        [])]
        } />
      
      <AnimatePresence>{open && <AdjustmentDialog key="a" onClose={() => setOpen(false)} />}</AnimatePresence>
    </AdminPanel>);

}