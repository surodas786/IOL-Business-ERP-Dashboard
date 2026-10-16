import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { formatBDT, formatDhaka } from '../../utils/format';
import { customerName } from '../../utils/relations';
import type { InventoryMovement } from '../../types/records';

interface Props {
  rows: InventoryMovement[];
  empty: string;
  showCost?: boolean;
  showType?: boolean;
}

/** Ledger of stock movements with their links to jobs, work orders, customers and services. */
export function MovementTable({ rows, empty, showCost, showType = true }: Props) {
  const { db } = useData();
  const { openRecord } = useRecordDrawer();
  return (
    <CustomerTable<InventoryMovement>
      minWidth={900}
      rows={rows}
      rowKey={(m) => m.id}
      onOpen={(m) => openRecord({ type: 'inventoryMovement', id: m.id })}
      empty={empty}
      columns={[
      { label: 'Movement', cell: (m) => <span><span className="block font-semibold text-slate-900">{m.id}</span>{showType && <StatusBadge status={m.type} />}</span> },
      { label: 'Item', cell: (m) => <span><span className="block text-slate-800">{m.itemName}</span><span className="font-mono text-[10.5px] text-slate-400">{m.sku}</span></span> },
      { label: 'Qty', align: 'right', cell: (m) => <span>{m.quantity.toLocaleString('en-IN')} <span className="text-[10.5px] text-slate-400">{m.unit}</span></span> },
      { label: 'Serials', cell: (m) => {const s = m.serials ?? (m.serial ? [m.serial] : []);return s.length ? <span className="font-mono text-[10.5px]">{s.slice(0, 3).join(', ')}{s.length > 3 ? ` +${s.length - 3}` : ''}</span> : '—';} },
      { label: 'From → to', cell: (m) => <span className="text-[11.5px]">{m.from} → {m.to}</span> },
      { label: 'Linked to', cell: (m) => <span className="text-[11.5px]">{[m.jobId, m.workOrderId, m.serviceChangeId].filter(Boolean).join(' · ') || m.reference || '—'}{m.customerId && <span className="block text-slate-500">{customerName(db, m.customerId)}{m.connectionId ? ` · ${m.connectionId}` : ''}</span>}</span> },
      ...(showCost ? [{ label: 'Unit price', align: 'right' as const, cell: (m: InventoryMovement) => m.unitPrice ? formatBDT(m.unitPrice) : '—' }] : []),
      { label: 'When', cell: (m) => <span className="whitespace-nowrap text-[11.5px]">{formatDhaka(m.at)}<span className="block text-slate-500">{m.byName}</span></span> }]
      } />);


}