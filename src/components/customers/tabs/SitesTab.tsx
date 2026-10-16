import React from 'react';
import { MapPinIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { hasPermission } from '../../../utils/access';
import { formatBDT } from '../../../utils/format';
import { zoneName } from '../../../utils/relations';
import { connectionLabel, connectionMedium, connectionProduct } from '../../../utils/customerProfile';
import type { Customer, ServiceConnection } from '../../../types/records';

/** Sites, the service connections at each, and the billing accounts they roll up to. */
export function SitesTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const fin = hasPermission(role, 'viewFinancials');
  const tech = hasPermission(role, 'technicalConfig');
  const sites = db.sites.filter((s) => s.customerId === c.id);
  const conns = db.connections.filter((x) => x.customerId === c.id);
  const bas = db.billingAccounts.filter((b) => b.customerId === c.id);

  return (
    <div className="space-y-3">
      {sites.length === 0 &&
      <AdminPanel title="Sites and services">
          <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">No physical sites yet. Sites are created when a work order is raised.</p>
        </AdminPanel>
      }
      {sites.map((s) => {
        const list = conns.filter((x) => x.siteId === s.id);
        return (
          <AdminPanel
            key={s.id}
            title={s.name}
            description={
            <span className="flex flex-wrap items-center gap-x-2">
                <MapPinIcon className="h-3 w-3" aria-hidden />
                {s.address} · {zoneName(s.zoneId)} · site contact {s.contactName}, {s.contactPhone}
              </span>
            }
            actions={
            <button type="button" className="text-[11.5px] font-semibold text-primary hover:text-primary-hover" onClick={() => openRecord({ type: 'site', id: s.id })}>
                {s.id}
              </button>
            }>
            
            <CustomerTable<ServiceConnection>
              rows={list}
              rowKey={(x) => x.id}
              onOpen={(x) => openRecord({ type: 'connection', id: x.id })}
              empty="No service connections at this site."
              columns={[
              { label: 'Connection', cell: (x) => <span className="font-semibold text-slate-900">{x.id}</span> },
              { label: 'Service product', cell: (x) => <span>{connectionProduct(x)}<span className="block text-[11px] text-slate-500">{connectionLabel(x)}</span></span> },
              { label: 'Delivery medium', cell: (x) => connectionMedium(x) },
              { label: 'Equipment', cell: (x) => <span className="text-[11.5px]">{x.cpe ?? '—'}</span> },
              ...(tech ? [{ label: 'VLAN · ONU', cell: (x: ServiceConnection) => <span className="text-[11.5px]">{x.vlan ?? '—'} · {x.onuSerial ?? '—'}</span> }] : []),
              { label: 'Billing account', cell: (x) => fin || hasPermission(role, 'manageWorkOrders') ? x.billingAccountId : '—' },
              ...(fin ? [{ label: 'MRC', align: 'right' as const, cell: (x: ServiceConnection) => formatBDT(x.mrc) }] : []),
              { label: 'Status', cell: (x) => <StatusBadge status={x.status} /> }]
              } />
            
          </AdminPanel>);

      })}

      {(fin || hasPermission(role, 'manageWorkOrders')) && bas.length > 0 &&
      <AdminPanel title="Billing accounts" description={bas.length > 1 ? 'Connections are billed on separate accounts.' : 'All connections are billed on one consolidated account.'}>
          <ul className="divide-y divide-slate-100">
            {bas.map((b) => {
            const covered = conns.filter((x) => x.billingAccountId === b.id);
            return (
              <li key={b.id}>
                  <button type="button" onClick={() => openRecord({ type: 'billingAccount', id: b.id })} className="flex w-full flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-50">
                    <span>
                      <span className="block text-[12.5px] font-semibold text-slate-900">
                        {b.name} <span className="font-normal text-slate-400">· {b.id}</span>
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {b.collectionMode} · covers {covered.map((x) => `${x.id} (${connectionProduct(x)})`).join(', ') || 'no connections'}
                      </span>
                    </span>
                    {fin && <span className="text-[12.5px] font-semibold tabular-nums text-slate-900">{formatBDT(covered.filter((x) => x.status === 'Active').reduce((s2, x) => s2 + x.mrc, 0))} / month</span>}
                  </button>
                </li>);

          })}
          </ul>
        </AdminPanel>
      }
    </div>);

}