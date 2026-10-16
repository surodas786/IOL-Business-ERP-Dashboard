import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useScopedChanges } from '../../hooks/useScopedChanges';
import { formatDhakaDate } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { closureGaps } from '../../utils/serviceChangeRules';
import { AdminPanel } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import type { ServiceChange } from '../../types/records';

export function ClearancesView() {
  const { db } = useData();
  const navigate = useNavigate();
  const rows = useScopedChanges().filter((s) => s.type === 'Discontinuation' && s.clearances);

  return (
    <AdminPanel title="Discontinuation clearances" description="Technical and Accounts clear in parallel. Administrative closure is blocked until both are cleared or have an approved exception. The service stop date and closure date are kept separate.">
      <CustomerTable<ServiceChange>
        minWidth={980}
        rows={rows}
        rowKey={(s) => s.id}
        onOpen={(s) => navigate(`/service-changes/records/${s.id}`)}
        empty="No approved discontinuations."
        columns={[
        { label: 'Customer · service', cell: (s) => <span><span className="block font-semibold text-slate-900">{customerName(db, s.customerId)}</span><span className="text-[11px] text-slate-500">{s.id} · {s.connectionId}</span></span> },
        { label: 'Service stop', cell: (s) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(s.effectiveDate!)}<span className="block text-slate-500">{s.serviceStoppedAt ? `done ${formatDhakaDate(s.serviceStoppedAt)}` : 'not yet recorded'}</span></span> },
        { label: 'Technical', cell: (s) => <StatusBadge status={s.clearances!.technical.status} /> },
        { label: 'Accounts', cell: (s) => <StatusBadge status={s.clearances!.accounts.status} /> },
        { label: 'Closure', cell: (s) => s.closedAt ? <span className="text-[11.5px]">Closed {formatDhakaDate(s.closedAt)}</span> : <span className="text-[11px] text-slate-500">{closureGaps(s).length ? `Blocked: ${closureGaps(s).length} item(s)` : 'Ready to close'}</span> },
        { label: 'Status', cell: (s) => <StatusBadge status={s.status} /> }]
        } />
      
    </AdminPanel>);

}