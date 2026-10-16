import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon, PhoneIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { AdminPanel } from '../admin/AdminPanel';
import { formatDhaka } from '../../utils/format';
import { branchName, userName, zoneName } from '../../utils/relations';
import { surveyContext } from '../../utils/surveyRules';
import type { Survey } from '../../types/records';

/** What was requested, by whom, and how to get on site. */
export function SurveyRequestInfo({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const { opp, customer, site, lead } = surveyContext(db, s);
  const crm = role.modules.includes('crm');

  const rows: [string, React.ReactNode][] = [
  ['Requested service', `${s.requestedService ?? opp?.serviceType ?? '—'}${s.requestedBandwidthMbps ? ` · ${s.requestedBandwidthMbps} Mbps` : ''}`],
  ['Site', s.siteLabel ?? '—'],
  [
  'Address',
  <span key="a" className="inline-flex items-start gap-1">
        <MapPinIcon className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        {s.address}
      </span>],

  ['Branch · zone', `${branchName(s.branchId)} · ${zoneName(s.zoneId)}`],
  ['Requested', `${s.requestedById ? userName(s.requestedById) : '—'} · ${formatDhaka(s.requestedAt, { year: true })}`],
  ['Notes', s.notes || '—']];


  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <AdminPanel title="Request">
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) =>
          <div key={k} className="grid grid-cols-[150px_1fr] gap-3 px-4 py-2 text-[12.5px]">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-900">{v}</dd>
            </div>
          )}
        </dl>
      </AdminPanel>
      <div className="space-y-3">
        <AdminPanel title="Site contact and access">
          <div className="space-y-2 px-4 py-3 text-[12.5px]">
            <p className="font-semibold text-slate-900">{s.siteContactName ?? '—'}</p>
            {s.siteContactPhone &&
            <a href={`tel:${s.siteContactPhone.replace(/[\s-]/g, '')}`} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 px-3 font-semibold text-primary hover:bg-slate-50 sm:h-8">
                <PhoneIcon className="h-3.5 w-3.5" aria-hidden /> {s.siteContactPhone}
              </a>
            }
            <p className="whitespace-pre-line text-slate-700">{s.accessInstructions || 'No access instructions recorded.'}</p>
          </div>
        </AdminPanel>
        <AdminPanel title="Linked records">
          <ul className="divide-y divide-slate-100 text-[12.5px]">
            {opp &&
            <li className="px-4 py-2">
                <span className="block text-[11px] text-slate-500">Opportunity</span>
                {crm ?
              <Link to={`/sales-crm/opportunities/${opp.id}`} className="font-semibold text-primary hover:text-primary-hover">
                    {opp.title}
                  </Link> :

              <span className="text-slate-900">{lead?.company ?? opp.id}</span>
              }
              </li>
            }
            {customer &&
            <li className="px-4 py-2">
                <span className="block text-[11px] text-slate-500">Customer</span>
                {role.modules.includes('customers') ?
              <Link to={`/customers/${customer.id}`} className="font-semibold text-primary hover:text-primary-hover">
                    {customer.name}
                  </Link> :

              <span className="text-slate-900">{customer.name}</span>
              }
              </li>
            }
            {site &&
            <li className="px-4 py-2">
                <span className="block text-[11px] text-slate-500">Existing site</span>
                <button type="button" className="font-semibold text-primary hover:text-primary-hover" onClick={() => openRecord({ type: 'site', id: site.id })}>
                  {site.name} · {site.id}
                </button>
              </li>
            }
            {!customer && <li className="px-4 py-2 text-[11.5px] text-slate-500">Prospect — customer and site records are created when the quotation becomes a work order.</li>}
          </ul>
        </AdminPanel>
      </div>
    </div>);

}