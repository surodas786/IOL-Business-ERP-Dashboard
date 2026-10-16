import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { hasPermission } from '../../utils/access';
import { formatBDT, formatDhaka, demoNow } from '../../utils/format';
import { userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { tdClass, thClass } from '../admin/AdminPanel';

function countdown(iso: string): {label: string;urgent: boolean;past: boolean;} {
  const ms = new Date(iso).getTime() - demoNow().getTime();
  const days = Math.floor(Math.abs(ms) / 86400000);
  const hours = Math.floor(Math.abs(ms) % 86400000 / 3600000);
  const span = days > 0 ? `${days} d ${hours} h` : `${hours} h`;
  return { label: ms < 0 ? `closed ${span} ago` : `${span} left`, urgent: ms >= 0 && ms < 3 * 86400000, past: ms < 0 };
}

export function TenderRegister({ filters }: {filters: CrmFilters;}) {
  const { tenders } = useCrmData(filters);
  const { role } = useSession();
  const pipe = hasPermission(role, 'viewPipeline');
  const navigate = useNavigate();
  const sorted = [...tenders].sort((a, b) => b.submissionDeadline.localeCompare(a.submissionDeadline));

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Tender register">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead>
            <tr>
              <th className={thClass}>Tender</th>
              <th className={thClass}>Issuing organisation</th>
              <th className={thClass}>Clarification</th>
              <th className={thClass}>Submission</th>
              <th className={`${thClass} text-right`}>Win prob.</th>
              {pipe && <th className={`${thClass} text-right`}>Est. MRC</th>}
              <th className={thClass}>Documents</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Owner</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const req = t.documents.filter((d) => d.required);
              const ready = req.filter((d) => d.done).length;
              const sub = countdown(t.submissionDeadline);
              const clar = countdown(t.clarificationDeadline);
              const live = t.submissionStatus === 'Preparing';
              return (
                <tr
                  key={t.id}
                  tabIndex={0}
                  onClick={() => navigate(`/sales-crm/tenders/${t.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/sales-crm/tenders/${t.id}`)}
                  className="cursor-pointer transition-colors duration-100 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                  
                  <td className={tdClass}>
                    <div className="font-mono text-[11.5px] font-semibold text-slate-900">{t.reference}</div>
                    <div className="text-[11px] text-slate-500">{t.title}</div>
                  </td>
                  <td className={tdClass}>
                    <div>{t.issuingOrganisation}</div>
                    <div lang="bn" className="text-[11px] text-slate-500">{t.issuingOrganisationBn}</div>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <div>{formatDhaka(t.clarificationDeadline)}</div>
                    {live && !clar.past && <div className={`text-[11px] ${clar.urgent ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>{clar.label}</div>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <div>{formatDhaka(t.submissionDeadline)}</div>
                    {live && <div className={`text-[11px] ${sub.past ? 'font-semibold text-status-critical' : sub.urgent ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>{sub.label}</div>}
                  </td>
                  <td className={`${tdClass} text-right font-semibold text-slate-900`}>{t.winProbability}%</td>
                  {pipe && <td className={`${tdClass} whitespace-nowrap text-right`}>{formatBDT(t.estimatedValue)}</td>}
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        <div className={`h-full rounded-full ${ready === req.length ? 'bg-status-ok' : 'bg-status-warning'}`} style={{ width: `${req.length ? ready / req.length * 100 : 0}%` }} />
                      </div>
                      <span className="whitespace-nowrap text-[11.5px]">{ready}/{req.length} required</span>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={t.outcome === 'Pending' ? t.submissionStatus : t.outcome === 'Won' ? 'Won' : t.outcome === 'Lost' ? 'Lost' : 'Cancelled'} />
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{userName(t.ownerId)}</td>
                </tr>);

            })}
            {sorted.length === 0 &&
            <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[12px] text-slate-500">
                  No tenders in this scope. Register one with “New lead” and tick “This is a tender”.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>);

}