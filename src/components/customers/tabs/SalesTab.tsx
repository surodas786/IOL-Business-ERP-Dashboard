import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { StatusBadge } from '../../records/StatusBadge';
import { CustomerTable } from '../CustomerTable';
import { displayStatus } from '../../../utils/crmRules';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../../utils/format';
import { userName } from '../../../utils/relations';
import { customerOpportunities } from '../../../utils/customerProfile';
import type { Customer, Opportunity } from '../../../types/records';

export function SalesTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const navigate = useNavigate();
  const opps = customerOpportunities(db, c).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visits = db.fieldVisits.filter((v) => v.subject.type === 'customer' && v.subject.id === c.id).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-3">
      <AdminPanel title="Opportunities" description="The original sale and any additional sites or services under this customer.">
        <CustomerTable<Opportunity>
          rows={opps}
          rowKey={(o) => o.id}
          onOpen={(o) => navigate(`/sales-crm/opportunities/${o.id}`)}
          empty="No opportunities recorded for this customer."
          columns={[
          { label: 'Opportunity', cell: (o) => <span><span className="block font-semibold text-slate-900">{o.title}</span><span className="block text-[11px] text-slate-500">{o.id} · {o.expansion}</span></span> },
          { label: 'Stage / outcome', cell: (o) => <StatusBadge status={displayStatus(db, o)} /> },
          { label: 'Expected MRC', align: 'right', cell: (o) => formatBDT(o.expectedMrc) },
          { label: 'Owner', cell: (o) => userName(o.ownerId) },
          { label: 'Created', cell: (o) => formatDhakaDate(o.createdAt) }]
          } />
        
      </AdminPanel>
      <AdminPanel title="Field visits" description="Visits logged against this customer in Field Activities.">
        <ul className="divide-y divide-slate-100">
          {visits.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-slate-500">No visits logged.</li>}
          {visits.map((v) =>
          <li key={v.id} className="px-4 py-2.5">
              <p className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-semibold text-slate-900">{v.purpose}</span>
                <StatusBadge status={v.outcome} />
                <span className="text-[11px] text-slate-500">
                  {userName(v.userId)} · {formatDhaka(v.at, { year: true })}
                </span>
              </p>
              <p className="mt-0.5 text-[12px] text-slate-700">{v.notes}</p>
            </li>
          )}
        </ul>
      </AdminPanel>
    </div>);

}