import React from 'react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { illustrativeTax, quoteName, taxLabel, taxTreatment } from '../../utils/quoteRules';
import { DocRows, DocSection, DocumentHeader } from './PrintPreview';
import type { Quotation } from '../../types/records';
import type { QuotationVersion } from '../../types/quotation';

/** Customer-facing quotation. Never prints margin, rate-card comparisons or agent commission. */
export function QuotePrintDocument({ quotation: q, version: v }: {quotation: Quotation;version: QuotationVersion;}) {
  const { db } = useData();
  const t = v.terms;
  const opp = db.opportunities.find((o) => o.id === q.opportunityId);
  const lead = db.leads.find((l) => l.id === opp?.leadId);
  const customer = q.customerId ? db.customers.find((c) => c.id === q.customerId) : undefined;
  const primary = customer?.contacts?.find((c) => c.role === 'Primary');
  const tax = taxTreatment(db, t.taxTreatmentId);
  const taxMrc = illustrativeTax(tax, t.mrc);
  const taxOtc = illustrativeTax(tax, t.otc);
  const acceptance = q.acceptance?.version === v.version ? q.acceptance : undefined;
  const stamp = v.status === 'Approved' ? undefined : v.status === 'Superseded' ? 'Superseded' : `${v.status} — not for issue`;

  return (
    <>
      <DocumentHeader
        docTitle="Quotation"
        docId={`${q.id} · v${v.version}`}
        stamp={stamp}
        meta={[
        { label: 'Date', value: formatDhakaDate(v.submittedAt ?? v.createdAt) },
        { label: 'Valid until', value: formatDhakaDate(t.validUntil) },
        { label: 'Prepared by', value: userName(q.preparedById) },
        { label: 'Reference', value: q.opportunityId }]
        } />
      

      <div className="mb-5 grid gap-6 sm:grid-cols-2">
        <DocSection title="Customer">
          <p className="font-semibold text-slate-900">{quoteName(db, q)}</p>
          {(customer?.nameBn ?? lead?.companyBn) && <p>{customer?.nameBn ?? lead?.companyBn}</p>}
          <p>{customer?.registeredAddress ?? lead?.address}</p>
          <p>
            Attn: {primary?.name ?? lead?.contactName}
            {(primary?.phone ?? lead?.contactPhone) && ` · ${primary?.phone ?? lead?.contactPhone}`}
          </p>
        </DocSection>
        <DocSection title="Service site">
          <p className="font-semibold text-slate-900">{t.siteName}</p>
          <p>{t.siteAddress}</p>
        </DocSection>
      </div>

      <DocSection title="Service and charges (BDT)">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10.5px] uppercase text-slate-500">
              <th className="py-1 font-semibold">Description</th>
              <th className="py-1 text-right font-semibold">Monthly (MRC)</th>
              <th className="py-1 text-right font-semibold">One-time (OTC)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 align-top">
              <td className="py-1.5">
                {t.description}
                <span className="block text-[10.5px] text-slate-500">
                  {t.serviceType} · {t.bandwidthMbps} Mbps
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums">{formatBDT(t.mrc)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatBDT(t.otc)}</td>
            </tr>
            <tr className="align-top text-[11px] text-slate-600">
              <td className="py-1">Tax — {taxLabel(tax)}</td>
              <td className="py-1 text-right tabular-nums">{taxMrc === null ? 'To be confirmed' : formatBDT(taxMrc)}</td>
              <td className="py-1 text-right tabular-nums">{taxOtc === null ? 'To be confirmed' : formatBDT(taxOtc)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[10.5px] text-slate-500">Tax shown is illustrative and configurable. No statutory rate is assumed in this demo.</p>
      </DocSection>

      <DocSection title="Commercial terms">
        <DocRows
          rows={[
          ['Payment terms', t.billingTerm === 'Prepaid' ? 'Prepaid — monthly in advance' : `Postpaid — ${t.creditDays} days from invoice`],
          ['Advance before installation', t.advanceRequired > 0 ? formatBDT(t.advanceRequired) : 'Not required'],
          ['Security deposit (refundable)', t.securityDeposit > 0 ? formatBDT(t.securityDeposit) : 'Not required'],
          ['Contract duration', `${t.contractMonths} months from commissioning`],
          ['Installation lead time', `${t.leadTimeDays} days from work order release`],
          ['Validity', `Until ${formatDhakaDate(t.validUntil)}`]]
          } />
        
      </DocSection>

      <DocSection title="Equipment ownership and return">
        <ul className="space-y-1">
          {t.equipment.map((e) =>
          <li key={e.id}>
              <span className="font-semibold">{e.item}</span> — {e.ownership}. {e.returnCondition}
            </li>
          )}
        </ul>
      </DocSection>

      <DocSection title="Customer acceptance">
        {acceptance ?
        <DocRows
          rows={[
          ['Accepted by', acceptance.acceptedByName],
          ['Method', acceptance.method],
          ['Evidence', `${acceptance.reference}${acceptance.fileName ? ` (${acceptance.fileName})` : ''}`],
          ['Accepted on', formatDhaka(acceptance.acceptedAt, { year: true })]]
          } /> :


        <div className="grid grid-cols-2 gap-8 pt-6">
            <p className="border-t border-slate-400 pt-1 text-[10.5px] text-slate-500">Authorised signatory, name and date</p>
            <p className="border-t border-slate-400 pt-1 text-[10.5px] text-slate-500">Company seal</p>
          </div>
        }
      </DocSection>
    </>);

}