import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { STALE_DAYS, daysSince, displayStatus, extensionCount, lastActivity, opportunityFlags } from '../../utils/crmRules';
import { formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { tdClass, thClass } from '../admin/AdminPanel';
import { OpportunityFlags } from './OpportunityFlags';

type Filter = 'all' | 'stale' | 'overdue' | 'extended';

const FILTERS: {id: Filter;label: string;}[] = [
{ id: 'all', label: 'All flagged' },
{ id: 'overdue', label: 'Overdue follow-ups' },
{ id: 'stale', label: `No activity ${STALE_DAYS}+ days` },
{ id: 'extended', label: 'Repeated date extensions' }];


export function StaleOpportunities({ filters }: {filters: CrmFilters;}) {
  const { db, opportunities, leadOf } = useCrmData(filters);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = opportunities.
  map((o) => ({ o, f: opportunityFlags(db, o) })).
  filter(({ f }) =>
  filter === 'all' ? f.overdueFollowUp || f.stale || f.repeatedExtensions : filter === 'stale' ? f.stale : filter === 'overdue' ? f.overdueFollowUp : f.repeatedExtensions
  ).
  sort((a, b) => lastActivity(a.o).localeCompare(lastActivity(b.o)));

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Stale opportunities">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2.5" role="group" aria-label="Flag filter">
        {FILTERS.map((x) =>
        <button
          key={x.id}
          type="button"
          aria-pressed={filter === x.id}
          onClick={() => setFilter(x.id)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${
          filter === x.id ? 'bg-navy text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`
          }>
          
            {x.label}
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{rows.length} opportunities</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr>
              <th className={thClass}>Opportunity</th>
              <th className={thClass}>Stage</th>
              <th className={thClass}>Last activity</th>
              <th className={thClass}>Next action</th>
              <th className={thClass}>Decision date</th>
              <th className={thClass}>Flags</th>
              <th className={thClass}>Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, f }) =>
            <tr
              key={o.id}
              tabIndex={0}
              onClick={() => navigate(`/sales-crm/opportunities/${o.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/sales-crm/opportunities/${o.id}`)}
              className="cursor-pointer transition-colors duration-100 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
              
                <td className={tdClass}>
                  <div className="font-semibold text-slate-900">{leadOf(o).company}</div>
                  <div className="text-[11px] text-slate-500">{o.title}</div>
                </td>
                <td className={tdClass}><StatusBadge status={displayStatus(db, o)} /></td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <div className={f.stale ? 'font-semibold text-slate-900' : ''}>{daysSince(lastActivity(o))} days ago</div>
                  <div className="text-[11px] text-slate-500">{formatDhakaDate(lastActivity(o))}</div>
                </td>
                <td className={tdClass}>
                  <div>{o.nextAction || '—'}</div>
                  {o.nextActionDue && <div className={`text-[11px] ${f.overdueFollowUp ? 'font-semibold text-status-critical' : 'text-slate-500'}`}>Due {formatDhaka(o.nextActionDue)}</div>}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <div>{formatDhakaDate(o.expectedDecisionDate)}</div>
                  {extensionCount(o) > 0 && <div className={`text-[11px] ${f.repeatedExtensions ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>Extended {extensionCount(o)}×</div>}
                </td>
                <td className={tdClass}><OpportunityFlags opportunity={o} /></td>
                <td className={`${tdClass} whitespace-nowrap`}>{userName(o.ownerId)}</td>
              </tr>
            )}
            {rows.length === 0 &&
            <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-slate-500">
                  Nothing flagged. Every open opportunity has recent activity and a follow-up that isn’t overdue.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>);

}