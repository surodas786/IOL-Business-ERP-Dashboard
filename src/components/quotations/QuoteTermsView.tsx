import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { illustrativeTax, seesCommission, seesMargin, seesQuoteMoney, taxLabel, taxTreatment } from '../../utils/quoteRules';
import type { QuotationTerms } from '../../types/quotation';

interface Props {
  terms: QuotationTerms;
  /** Compare against an earlier version: changed rows are marked. */
  previous?: QuotationTerms;
}

/** Read-only terms of one version. Money, margin and commission rows follow the active role. */
export function QuoteTermsView({ terms: t, previous }: Props) {
  const { db } = useData();
  const { role } = useSession();
  const money = seesQuoteMoney(role);
  const tax = taxTreatment(db, t.taxTreatmentId);
  const taxMrc = illustrativeTax(tax, t.mrc);
  const agent = t.agentId ? db.salesAgents.find((a) => a.id === t.agentId) : undefined;
  const hidden = '৳ •••';

  const groups: {title: string;rows: {label: string;value: React.ReactNode;key?: keyof QuotationTerms;}[];}[] = [
  {
    title: 'Customer, site and service',
    rows: [
    { label: 'Site', value: `${t.siteName}${t.siteId ? ` (${t.siteId})` : ' (new site)'}`, key: 'siteName' },
    { label: 'Address', value: t.siteAddress, key: 'siteAddress' },
    { label: 'Service', value: `${t.serviceType} · ${t.bandwidthMbps} Mbps`, key: 'bandwidthMbps' },
    { label: 'Description', value: t.description, key: 'description' }]

  },
  {
    title: 'Prices (excl. tax)',
    rows: [
    { label: 'MRC', value: money ? <>{formatBDT(t.mrc)}{t.mrc < t.listMrc && <span className="ml-1.5 text-[11px] text-status-warning">rate card {formatBDT(t.listMrc)}</span>}</> : hidden, key: 'mrc' },
    { label: 'OTC', value: money ? <>{formatBDT(t.otc)}{t.otc < t.listOtc && <span className="ml-1.5 text-[11px] text-status-warning">standard {formatBDT(t.listOtc)}</span>}</> : hidden, key: 'otc' },
    { label: 'Advance requirement', value: money ? formatBDT(t.advanceRequired) : t.advanceRequired > 0 ? 'Required' : 'None', key: 'advanceRequired' },
    { label: 'Security deposit', value: money ? `${formatBDT(t.securityDeposit)} · refundable` : 'Refundable deposit', key: 'securityDeposit' },
    { label: 'Payment terms', value: t.billingTerm === 'Prepaid' ? 'Prepaid' : `Postpaid · ${t.creditDays} days credit`, key: 'billingTerm' },
    {
      label: 'Tax treatment',
      value:
      <span>
              {taxLabel(tax)}
              {money && t.mrc > 0 && <span className="block text-[11px] text-slate-500">{taxMrc === null ? 'Tax amount not shown until Finance configures a rate' : `Illustrative tax on MRC ${formatBDT(taxMrc)}`}</span>}
            </span>,

      key: 'taxTreatmentId'
    },
    ...(seesMargin(role) ? [{ label: 'Estimated margin', value: `${t.marginPct}%`, key: 'marginPct' as const }] : []),
    ...(agent ? [{ label: 'Agent', value: seesCommission(role) ? `${agent.name} · commission ${formatBDT(t.agentCommission)}` : `${agent.name} · commission hidden for your role`, key: 'agentCommission' as const }] : [])]

  },
  {
    title: 'Contract and delivery',
    rows: [
    { label: 'Contract duration', value: `${t.contractMonths} months`, key: 'contractMonths' },
    { label: 'Installation lead time', value: `${t.leadTimeDays} days from release`, key: 'leadTimeDays' },
    { label: 'Valid until', value: formatDhakaDate(t.validUntil), key: 'validUntil' }]

  }];


  const changed = (k?: keyof QuotationTerms) => !!previous && !!k && JSON.stringify(previous[k]) !== JSON.stringify(t[k]);

  return (
    <div className="divide-y divide-slate-100">
      {groups.map((g) =>
      <section key={g.title} className="px-4 py-3">
          <h3 className="mb-1.5 text-[11.5px] font-bold text-slate-500">{g.title}</h3>
          <dl className="space-y-1">
            {g.rows.map((r) =>
          <div key={r.label} className={`grid grid-cols-[150px_1fr] gap-3 rounded px-1 py-0.5 text-[12.5px] ${changed(r.key) ? 'bg-amber-50' : ''}`}>
                <dt className="text-slate-500">
                  {r.label}
                  {changed(r.key) && <span className="ml-1 text-[10px] font-semibold text-status-warning">changed</span>}
                </dt>
                <dd className="text-slate-900">{r.value}</dd>
              </div>
          )}
          </dl>
        </section>
      )}
      <section className="px-4 py-3">
        <h3 className="mb-1.5 text-[11.5px] font-bold text-slate-500">Equipment ownership and return</h3>
        <ul className="space-y-1.5">
          {t.equipment.map((e) =>
          <li key={e.id} className="text-[12.5px]">
              <span className="font-semibold text-slate-900">{e.item}</span> <span className="text-slate-500">· {e.ownership}</span>
              <span className="block text-[11.5px] text-slate-600">{e.returnCondition}</span>
            </li>
          )}
        </ul>
      </section>
    </div>);

}