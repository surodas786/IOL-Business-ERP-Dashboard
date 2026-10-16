import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedChanges } from '../../hooks/useScopedChanges';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { canSeeCommercial, resumptionState } from '../../utils/serviceChangeRules';
import { AdminPanel } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import type { ServiceChange } from '../../types/records';

const STATE_TEXT = { 'not-due': '', reminder: 'Reminder due', overdue: 'Expected date passed' } as const;

export function StopsView() {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const all = useScopedChanges();
  const fin = canSeeCommercial(role);
  const stops = all.filter((s) => s.type === 'Temporary Stop' && ['Approved', 'Stopped', 'Resumed', 'Pending Approval', 'Requested'].includes(s.status));

  return (
    <AdminPanel title="Temporary stops" description="A service never reactivates on its expected date. A resumption request must be verified by Technical; billing returns to the full rate from the verified date.">
      <CustomerTable<ServiceChange>
        minWidth={920}
        rows={stops}
        rowKey={(s) => s.id}
        onOpen={(s) => navigate(`/service-changes/records/${s.id}`)}
        empty="No temporary stops."
        columns={[
        { label: 'Customer · service', cell: (s) => <span><span className="block font-semibold text-slate-900">{customerName(db, s.customerId)}</span><span className="text-[11px] text-slate-500">{s.id} · {s.connectionId}</span></span> },
        { label: 'Stop period', cell: (s) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(s.effectiveDate ?? s.requestedDate)} → {s.expectedResumption ? formatDhakaDate(s.expectedResumption) : '—'}<span className="block text-slate-500">expected</span></span> },
        ...(fin ? [{ label: 'Continuing charge', align: 'right' as const, cell: (s: ServiceChange) => `${formatBDT(s.continuingCharge ?? 0)}/mo` }] : []),
        {
          label: 'Resumption',
          cell: (s) => {
            const st = resumptionState(s);
            const res = db.serviceChanges.find((x) => x.id === s.resumptionId);
            if (s.resumedAt) return <span className="text-[11.5px] text-status-ok">Verified {formatDhakaDate(s.resumedAt)}</span>;
            if (res) return <span className="text-[11.5px]">{res.id} awaiting verification</span>;
            return <span className={`text-[11.5px] ${st === 'overdue' ? 'font-semibold text-status-critical' : st === 'reminder' ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>{STATE_TEXT[st] || (s.reminderAt ? `Reminder ${formatDhakaDate(s.reminderAt)}` : '—')}</span>;
          }
        },
        { label: 'Status', cell: (s) => <StatusBadge status={s.status} /> }]
        } />
      
    </AdminPanel>);

}