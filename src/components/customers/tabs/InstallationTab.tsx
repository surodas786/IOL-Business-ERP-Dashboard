import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { formatDhaka } from '../../../utils/format';
import { recordName } from '../../../utils/relations';
import type { Customer, InstallationJob } from '../../../types/records';

export function InstallationTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { openRecord } = useRecordDrawer();
  const jobs = db.installationJobs.filter((j) => j.customerId === c.id);
  return (
    <AdminPanel title="Installation jobs">
      <CustomerTable<InstallationJob>
        rows={jobs}
        rowKey={(j) => j.id}
        onOpen={(j) => openRecord({ type: 'installationJob', id: j.id })}
        empty="No installation jobs."
        columns={[
        { label: 'Job', cell: (j) => <span><span className="block font-semibold text-slate-900">{j.id}</span><span className="block text-[11px] text-slate-500">{j.workOrderId}</span></span> },
        { label: 'Site', cell: (j) => recordName(db, { type: 'site', id: j.siteId }).split(',')[0] },
        { label: 'Connection', cell: (j) => `${j.connectionId} · ${recordName(db, { type: 'connection', id: j.connectionId })}` },
        { label: 'Technician', cell: (j) => j.technicianName },
        { label: 'Materials', cell: (j) => <span className="text-[11.5px]">{j.materials}</span> },
        { label: 'Scheduled / done', cell: (j) => <span className="text-[11.5px]">{formatDhaka(j.scheduledAt)}{j.completedAt && <span className="block text-slate-500">Done {formatDhaka(j.completedAt)}</span>}</span> },
        { label: 'Status', cell: (j) => <StatusBadge status={j.status} /> }]
        } />
      
    </AdminPanel>);

}