import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { CustomerTable } from '../CustomerTable';
import { hasPermission } from '../../../utils/access';
import { formatDhaka } from '../../../utils/format';
import { recordName } from '../../../utils/relations';
import { connectionMedium, connectionProduct } from '../../../utils/customerProfile';
import type { Customer, InventoryMovement, ServiceConnection } from '../../../types/records';

export function EquipmentTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const tech = hasPermission(role, 'technicalConfig');
  const conns = db.connections.filter((x) => x.customerId === c.id);
  const jobIds = new Set(db.installationJobs.filter((j) => j.customerId === c.id).map((j) => j.id));
  const scIds = new Set(db.serviceChanges.filter((s) => s.customerId === c.id).map((s) => s.id));
  const moves = db.inventoryMovements.filter((m) => m.jobId && jobIds.has(m.jobId) || m.serviceChangeId && scIds.has(m.serviceChangeId)).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-3">
      <AdminPanel title="Equipment at customer premises" description="Equipment installed per service connection.">
        <CustomerTable<ServiceConnection>
          rows={conns}
          rowKey={(x) => x.id}
          onOpen={(x) => openRecord({ type: 'connection', id: x.id })}
          empty="No equipment recorded."
          columns={[
          { label: 'Connection', cell: (x) => <span><span className="block font-semibold text-slate-900">{x.id}</span><span className="block text-[11px] text-slate-500">{connectionProduct(x)} · {connectionMedium(x)}</span></span> },
          { label: 'Site', cell: (x) => recordName(db, { type: 'site', id: x.siteId }).split(',')[0] },
          { label: 'Equipment', cell: (x) => x.cpe ?? '—' },
          ...(tech ? [{ label: 'ONU serial', cell: (x: ServiceConnection) => x.onuSerial ?? '—' }] : [])]
          } />
        
      </AdminPanel>
      <AdminPanel title="Inventory movements" description="Stock issued to or returned from this customer’s jobs and service changes.">
        <CustomerTable<InventoryMovement>
          rows={moves}
          rowKey={(m) => m.id}
          onOpen={(m) => openRecord({ type: 'inventoryMovement', id: m.id })}
          empty="No inventory movements linked to this customer."
          columns={[
          { label: 'Movement', cell: (m) => <span><span className="block font-semibold text-slate-900">{m.id}</span><span className="block text-[11px] text-slate-500">{m.type}</span></span> },
          { label: 'Item', cell: (m) => `${m.itemName} × ${m.quantity} ${m.unit}` },
          { label: 'Serial', cell: (m) => m.serial ?? '—' },
          { label: 'From → to', cell: (m) => <span className="text-[11.5px]">{m.from} → {m.to}</span> },
          { label: 'Linked to', cell: (m) => m.jobId ?? m.serviceChangeId ?? '—' },
          { label: 'When', cell: (m) => <span className="text-[11.5px]">{formatDhaka(m.at)}<span className="block text-slate-500">{m.byName}</span></span> }]
          } />
        
      </AdminPanel>
    </div>);

}