import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { currentService } from '../../utils/serviceChangeRules';
import type { ServiceChange } from '../../types/records';

type Row = [string, React.ReactNode];

function Facts({ rows }: {rows: Row[];}) {
  return (
    <dl className="space-y-1.5 text-[12.5px]">
      {rows.map(([k, v]) =>
      <div key={k} className="grid grid-cols-[150px_1fr] gap-3">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-slate-900">{v}</dd>
        </div>
      )}
    </dl>);

}

/** Current service beside the requested change, with type-specific details. */
export function ChangeSummary({ change: s, showAmounts }: {change: ServiceChange;showAmounts: boolean;}) {
  const { db } = useData();
  const conn = db.connections.find((c) => c.id === s.connectionId);
  const fromSite = db.sites.find((x) => x.id === (s.fromSiteId ?? conn?.siteId));
  const money = (n?: number) => n === undefined ? '—' : formatBDT(n);
  const t = s.type;

  const current: Row[] = [
  ['Service', <Link key="c" to={`/customers/${s.customerId}/sites`} className="font-semibold text-primary hover:text-primary-hover">{s.connectionId}</Link>],
  ['As requested', s.fromValue],
  ['Status now', conn?.status ?? '—'],
  ['Site', fromSite ? `${fromSite.name}, ${fromSite.address}` : '—'],
  ...(showAmounts ? [['MRC at request', money(s.fromMrc)]] as Row[] : [])];


  const requested: Row[] = [['Change', <span key="t" className="font-semibold">{t}: {s.toValue}</span>]];
  if (t === 'Upgrade' || t === 'Downgrade') {
    requested.push(['Bandwidth', `${s.fromBandwidth ?? '—'} → ${s.toBandwidth ?? '—'} Mbps`]);
    if (showAmounts) requested.push(['Revised MRC', money(s.toMrc)]);
    requested.push(['Cost bearer', s.costBearer ?? 'Not set']);
    if (showAmounts && s.costBearer === 'IOL') requested.push(['IOL equipment cost', money(s.equipmentCost)]);
  }
  if (t === 'Shifting') {
    requested.push(['Destination', s.destination ? `${s.destination.name}, ${s.destination.address}${s.destination.siteId ? '' : ' (new site on the same customer)'}` : '—']);
    requested.push(['Destination contact', s.destination?.contactName ? `${s.destination.contactName} · ${s.destination.contactPhone}` : '—']);
    requested.push(['Equipment movement', s.equipmentMovement ?? '—']);
    requested.push(['Interruption', s.interruptionHours ? `About ${s.interruptionHours} hours` : '—']);
    requested.push(['Cost bearer', s.costBearer ?? 'Not set']);
    if (showAmounts) requested.push(['Relocation charge', money(s.relocationCharge)]);
  }
  if (t === 'Temporary Stop') {
    requested.push(['Stop period', `${formatDhakaDate(s.effectiveDate ?? s.requestedDate)} → expected ${s.expectedResumption ? formatDhakaDate(s.expectedResumption) : '—'}`]);
    if (showAmounts) requested.push(['Continuing charge', `${money(s.continuingCharge)} / month`]);
    requested.push(['Reminder', s.reminderAt ? formatDhakaDate(s.reminderAt) : 'Set on approval']);
    if (s.resumedAt) requested.push(['Verified resumption', formatDhaka(s.resumedAt, { year: true })]);
  }
  if (t === 'Resumption' && s.stopChangeId) requested.push(['Resumes', <Link key="r" to={`/service-changes/records/${s.stopChangeId}`} className="font-semibold text-primary hover:text-primary-hover">{s.stopChangeId}</Link>]);
  if (t === 'Discontinuation') {
    requested.push(['Service stop date', s.effectiveDate ? formatDhakaDate(s.effectiveDate) : `Requested ${formatDhakaDate(s.requestedDate)}`]);
    requested.push(['Service actually stopped', s.serviceStoppedAt ? formatDhaka(s.serviceStoppedAt, { year: true }) : 'Not yet recorded']);
    requested.push(['Administrative closure', s.closedAt ? `${formatDhaka(s.closedAt, { year: true })} · ${userName(s.closedById)}` : 'Not closed']);
  }
  requested.push(['Requested date', formatDhakaDate(s.requestedDate)]);
  requested.push(['Approved effective date', s.effectiveDate ? <span key="e" className="font-semibold">{formatDhakaDate(s.effectiveDate)}</span> : 'Set on approval']);
  requested.push(['Reason', s.reason]);

  return (
    <section aria-label="Current service and requested change" className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="bg-slate-50 px-4 py-3">
        <h2 className="mb-2 text-[12px] font-bold text-slate-500">Current service</h2>
        <Facts rows={current} />
      </div>
      <div className="relative bg-white px-4 py-3">
        <ArrowRightIcon className="absolute -left-2.5 top-3.5 hidden h-5 w-5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-400 lg:block" aria-hidden />
        <h2 className="mb-2 text-[12px] font-bold text-slate-500">Requested change</h2>
        <Facts rows={requested} />
      </div>
    </section>);

}