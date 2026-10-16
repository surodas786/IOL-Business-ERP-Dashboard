import React from 'react';
import { Link } from 'react-router-dom';
import { FileTextIcon, ScanSearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { hasPermission } from '../../utils/access';
import { deliverySummary } from '../../utils/crmRules';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { OpportunityFlags } from './OpportunityFlags';
import type { Opportunity } from '../../types/records';

const tone = (label: string) =>
/feasible$|approved|accepted/.test(label) && !/not feasible/.test(label) ?
'text-status-ok' :
/not feasible|rejected/.test(label) ?
'text-status-critical' :
/pending|scheduled|requested/.test(label) ?
'text-status-warning' :
'text-slate-400';

export function OpportunityCard({ opportunity: o }: {opportunity: Opportunity;}) {
  const { db } = useData();
  const { role } = useSession();
  const lead = db.leads.find((l) => l.id === o.leadId);
  const pipe = hasPermission(role, 'viewPipeline');
  const { surveyLabel, quotationLabel } = deliverySummary(db, o.id);
  const tender = db.tenders.find((t) => t.opportunityId === o.id);

  return (
    <Link
      to={`/sales-crm/opportunities/${o.id}`}
      className="block rounded-md border border-slate-200 bg-white px-3 py-2.5 transition-[border-color,box-shadow] duration-150 hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[12.5px] font-semibold leading-snug text-slate-900">{lead?.company}</p>
        {pipe && <p className="whitespace-nowrap text-[12px] font-semibold text-slate-900">{formatBDT(o.expectedMrc)}</p>}
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {o.bandwidthMbps} Mbps {o.serviceType}
        {o.expansion !== 'New customer' && <span className="text-status-info"> · {o.expansion}</span>}
        {tender && <span className="text-status-info"> · Tender</span>}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px]">
        <span className={`flex items-center gap-1 ${tone(surveyLabel.toLowerCase())}`}>
          <ScanSearchIcon className="h-3 w-3" aria-hidden />
          {surveyLabel}
        </span>
        <span className={`flex items-center gap-1 ${tone(quotationLabel.toLowerCase())}`}>
          <FileTextIcon className="h-3 w-3" aria-hidden />
          {quotationLabel}
        </span>
      </div>
      {o.status === 'Open' && o.nextAction &&
      <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-600">
          {o.nextAction}
          <span className="block text-[10px] text-slate-400">Due {formatDhaka(o.nextActionDue)}</span>
        </p>
      }
      {o.status === 'Stalled' && o.stalledReason && <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-600">{o.stalledReason}</p>}
      {o.status === 'Lost' && o.lossReason && <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-600">{o.lossReason}</p>}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <OpportunityFlags opportunity={o} compact />
        <span className="ml-auto whitespace-nowrap text-[10.5px] text-slate-500">{userName(o.ownerId)}</span>
      </div>
    </Link>);

}