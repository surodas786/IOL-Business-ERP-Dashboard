import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { formatDhaka } from '../../../utils/format';
import { recordName } from '../../../utils/relations';
import { isOpen } from '../../../utils/ticketRules';
import { SlaChip } from '../../tickets/SlaChip';
import type { Customer, Ticket } from '../../../types/records';

export function TicketsTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const navigate = useNavigate();
  const rows = db.tickets.filter((t) => t.customerId === c.id).sort((a, b) => Number(!isOpen(a)) - Number(!isOpen(b)) || b.openedAt.localeCompare(a.openedAt));
  return (
    <AdminPanel title="Support tickets">
      <CustomerTable<Ticket>
        rows={rows}
        rowKey={(t) => t.id}
        onOpen={(t) => navigate(`/support-tickets/records/${t.id}`)}
        empty="No tickets for this customer."
        columns={[
        { label: 'Ticket', cell: (t) => <span><span className="block font-semibold text-slate-900">{t.id}</span><span className="block text-[11px] text-slate-500">{t.subject}</span></span> },
        { label: 'Site', cell: (t) => recordName(db, { type: 'site', id: t.siteId }).split(',')[0] },
        { label: 'Priority', cell: (t) => <StatusBadge status={t.priority} /> },
        { label: 'Technician', cell: (t) => t.assigneeName ?? 'Unassigned' },
        { label: 'Created', cell: (t) => <span className="whitespace-nowrap">{formatDhaka(t.openedAt)}</span> },
        { label: 'Resolution SLA', cell: (t) => <SlaChip ticket={t} kind="resolution" /> },
        { label: 'Status', cell: (t) => <StatusBadge status={t.status} /> }]
        } />
      
    </AdminPanel>);

}