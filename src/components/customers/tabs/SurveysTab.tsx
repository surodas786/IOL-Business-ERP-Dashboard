import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { useSession } from '../../../contexts/SessionContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { formatDhaka } from '../../../utils/format';
import { customerOpportunities } from '../../../utils/customerProfile';
import type { Customer, Survey } from '../../../types/records';

export function SurveysTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { openRecord } = useRecordDrawer();
  const { role } = useSession();
  const navigate = useNavigate();
  const opps = new Set(customerOpportunities(db, c).map((o) => o.id));
  const rows = db.surveys.filter((s) => opps.has(s.opportunityId));
  return (
    <AdminPanel title="Surveys and feasibility">
      <CustomerTable<Survey>
        rows={rows}
        rowKey={(s) => s.id}
        onOpen={(s) => role.modules.includes('surveys') ? navigate(`/surveys/records/${s.id}`) : openRecord({ type: 'survey', id: s.id })}
        empty="No surveys for this customer."
        columns={[
        { label: 'Survey', cell: (s) => <span className="font-semibold text-slate-900">{s.id}</span> },
        { label: 'Address', cell: (s) => s.address },
        { label: 'Technician', cell: (s) => s.technicianName },
        { label: 'Status', cell: (s) => <StatusBadge status={s.status === 'Approved' ? 'Approved — Feasible' : s.status} /> },
        { label: 'Fibre distance', align: 'right', cell: (s) => s.fibreDistanceM !== undefined ? `${s.fibreDistanceM.toLocaleString('en-IN')} m` : '—' },
        { label: 'Date', cell: (s) => formatDhaka(s.completedAt ?? s.scheduledAt ?? s.requestedAt) }]
        } />
      
    </AdminPanel>);

}