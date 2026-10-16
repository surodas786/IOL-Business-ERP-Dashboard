import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { displayStatus } from '../../utils/crmRules';
import { formatDhakaDate } from '../../utils/format';
import { branchName, userName, zoneName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { tdClass, thClass } from '../admin/AdminPanel';

export function LeadList({ filters }: {filters: CrmFilters;}) {
  const { db, leads } = useCrmData(filters);
  const navigate = useNavigate();
  const { openRecord } = useRecordDrawer();
  const sorted = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Lead list">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead>
            <tr>
              <th className={thClass}>Organisation</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Source</th>
              <th className={thClass}>Branch · zone</th>
              <th className={thClass}>Sales owner</th>
              <th className={thClass}>Opportunity</th>
              <th className={thClass}>Created</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const opp = db.opportunities.find((o) => o.leadId === l.id);
              const review = opp && db.crmConflicts.some((c) => c.status === 'Open' && c.opportunityId === opp.id);
              const open = () => opp ? navigate(`/sales-crm/opportunities/${opp.id}`) : openRecord({ type: 'lead', id: l.id });
              return (
                <tr
                  key={l.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => e.key === 'Enter' && open()}
                  className="cursor-pointer transition-colors duration-100 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                  
                  <td className={tdClass}>
                    <div className="font-semibold text-slate-900">{l.company}</div>
                    <div className="text-[11px] text-slate-500">
                      <span lang="bn">{l.companyBn}</span> · <span className="font-mono">{l.id}</span>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div>{l.contactName}{l.contactDesignation && <span className="text-slate-500">, {l.contactDesignation}</span>}</div>
                    <div className="text-[11px] text-slate-500">{[l.contactPhone, l.contactEmail].filter(Boolean).join(' · ') || 'No contact details yet'}</div>
                  </td>
                  <td className={tdClass}>{l.category}</td>
                  <td className={tdClass}>
                    {l.source}
                    {l.agentId && <div className="text-[11px] text-slate-500">{db.salesAgents.find((a) => a.id === l.agentId)?.name}</div>}
                    {l.referral && <div className="text-[11px] text-slate-500">{l.referral}</div>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {branchName(l.branchId)} · {zoneName(l.zoneId)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{userName(l.ownerId)}</td>
                  <td className={tdClass}>
                    {opp ?
                    <div className="flex flex-wrap items-center gap-1">
                        <StatusBadge status={displayStatus(db, opp)} />
                        {review && <StatusBadge status="Duplicate review" />}
                      </div> :

                    <StatusBadge status={l.status} />
                    }
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDhakaDate(l.createdAt)}</td>
                </tr>);

            })}
            {sorted.length === 0 &&
            <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-500">
                  No leads match these filters.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>);

}