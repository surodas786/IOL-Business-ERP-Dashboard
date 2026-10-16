import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { AdminPanel, linkBtn } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { formatDhaka, formatDhakaDate } from '../../../utils/format';
import { userName } from '../../../utils/relations';
import { canRequestChange } from '../../../utils/serviceChangeRules';
import type { Customer, ServiceChange } from '../../../types/records';

export function ServiceChangesTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const rows = db.serviceChanges.filter((s) => s.customerId === c.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return (
    <AdminPanel
      title="Service changes"
      description="Every change is raised against this existing profile and one of its services — no new customer profile is created."
      actions={
      canRequestChange(role) ?
      <Link to={`/service-changes/requests?new=${c.id}`} className={linkBtn}>
            Request a change
          </Link> :
      undefined
      }>
      
      <CustomerTable<ServiceChange>
        minWidth={820}
        rows={rows}
        rowKey={(s) => s.id}
        onOpen={(s) => navigate(`/service-changes/records/${s.id}`)}
        empty="No service changes requested."
        columns={[
        { label: 'Change', cell: (s) => <span><span className="block font-semibold text-slate-900">{s.id} · {s.type}</span><span className="block text-[11px] text-slate-500">{s.connectionId}</span></span> },
        { label: 'From → to', cell: (s) => <span className="text-[11.5px]">{s.fromValue} → {s.toValue}</span> },
        { label: 'Effective', cell: (s) => s.effectiveDate ? formatDhakaDate(s.effectiveDate) : <span className="text-[11.5px] text-slate-500">Requested {formatDhakaDate(s.requestedDate)}</span> },
        { label: 'Requested', cell: (s) => <span className="text-[11.5px]">{userName(s.requestedById)}<span className="block text-slate-500">{formatDhaka(s.requestedAt)}</span></span> },
        { label: 'Status', cell: (s) => <StatusBadge status={s.status} /> }]
        } />
      
    </AdminPanel>);

}