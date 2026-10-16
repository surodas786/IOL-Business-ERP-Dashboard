import React from 'react';
import { InfoIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { assessmentGaps, billingEffect, changePayback, needsApproval } from '../../utils/serviceChangeRules';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { ServiceChange } from '../../types/records';

interface Props {
  change: ServiceChange;
  showAmounts: boolean;
  showPayback: boolean;
}

/** Technical and commercial impact, approval and billing effect. */
export function ImpactPanel({ change: s, showAmounts, showPayback }: Props) {
  const { db } = useData();
  const ap = db.approvals.find((a) => a.id === s.approvalId);
  const pb = changePayback(s);
  const gaps = s.status === 'Requested' ? assessmentGaps(s) : [];
  const t = s.technicalImpact;

  return (
    <AdminPanel title="Impact and approval" description={gaps.length && needsApproval(s.type) ? `Before approval: ${gaps.join(' · ')}` : undefined}>
      <div className="divide-y divide-slate-100">
        <section className="px-4 py-3">
          <h3 className="text-[12px] font-bold text-slate-800">Technical impact</h3>
          {t ?
          <div className="mt-1 text-[12.5px] text-slate-700">
              <p>{t.impact}</p>
              {t.capacityValidated !== undefined &&
            <p className={`mt-1 font-semibold ${t.capacityValidated ? 'text-status-ok' : 'text-status-critical'}`}>
                  Capacity {t.capacityValidated ? 'validated' : 'not available'}
                  {t.capacityNote ? <span className="font-normal text-slate-600"> — {t.capacityNote}</span> : null}
                </p>
            }
              {t.feasibility &&
            <p className="mt-1">
                  Mini-feasibility: <StatusBadge status={t.feasibility} />
                </p>
            }
              <p className="mt-1 text-[11px] text-slate-500">
                {userName(t.byId)} · {formatDhaka(t.at)}
              </p>
            </div> :

          <p className="mt-1 text-[12px] text-slate-500">{s.type === 'Resumption' ? 'Verified by Technical at implementation.' : 'Awaiting Technical Supervisor.'}</p>
          }
        </section>

        <section className="px-4 py-3">
          <h3 className="text-[12px] font-bold text-slate-800">Commercial impact</h3>
          {!showAmounts ?
          <p className="mt-1 text-[12px] text-slate-500">{s.commercialImpact ? 'Recorded.' : 'Not recorded yet.'} Amounts are hidden for your role.</p> :
          s.commercialImpact ?
          <div className="mt-1 text-[12.5px] text-slate-700">
              <p>{s.commercialImpact.summary}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {userName(s.commercialImpact.byId)} · {formatDhaka(s.commercialImpact.at)}
              </p>
            </div> :

          <p className="mt-1 text-[12px] text-slate-500">{s.type === 'Resumption' ? 'Not needed — the previously approved rate resumes.' : 'Awaiting Account Manager or Accounts.'}</p>
          }
        </section>

        {showPayback && pb.applies &&
        <section className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[12px] font-bold text-slate-800">Proposed payback (IOL funds equipment)</h3>
              <StatusBadge status="Awaiting IOL confirmation" />
            </div>
            <p className={`mt-1 text-[20px] font-bold tabular-nums ${pb.months === null && pb.investment > 0 ? 'text-status-critical' : 'text-slate-900'}`}>{pb.label}</p>
            <dl className="mt-2 grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 text-[12px]">
              <dt className="text-slate-500">IOL-funded equipment</dt>
              <dd className="text-right tabular-nums">{formatBDT(pb.equipment)}</dd>
              <dt className="text-slate-500">Less one-time charge recovered</dt>
              <dd className="text-right tabular-nums">− {formatBDT(pb.recovery)}</dd>
              <dt className="font-semibold text-slate-700">Net investment</dt>
              <dd className="text-right font-semibold tabular-nums">{formatBDT(pb.investment)}</dd>
              <dt className="text-slate-500">MRC change</dt>
              <dd className="text-right tabular-nums">{formatBDT(pb.mrcDelta)}</dd>
              <dt className="text-slate-500">Less recurring delivery cost change</dt>
              <dd className="text-right tabular-nums">− {formatBDT(pb.recurringDelta)}</dd>
              <dt className="font-semibold text-slate-700">Monthly contribution change</dt>
              <dd className="text-right font-semibold tabular-nums">{formatBDT(pb.contribution)}</dd>
            </dl>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
              <InfoIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Same proposed formula as survey cost analysis, applied to the change only: net investment ÷ positive monthly contribution change. Existing installation cost is not counted again. Deposits and advances are excluded. Awaiting Finance confirmation.
            </p>
          </section>
        }

        <section className="px-4 py-3">
          <h3 className="text-[12px] font-bold text-slate-800">Approval</h3>
          {!needsApproval(s.type) ?
          <p className="mt-1 text-[12px] text-slate-500">No approval needed — a resumption restores an already-approved service once Technical verifies it.</p> :
          ap ?
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-700">
              <StatusBadge status={ap.status} />
              <span>
                {ap.id} · Business Head or Management
                {ap.decidedById ? ` · ${userName(ap.decidedById)} ${formatDhaka(ap.decidedAt!)}` : ''}
              </span>
              {s.effectiveDate && <span className="w-full text-[12px]">Approved effective date: <span className="font-semibold">{formatDhakaDate(s.effectiveDate)}</span></span>}
              {s.decisionNote && <span className="w-full text-[12px] italic text-slate-500">“{s.decisionNote}”</span>}
            </div> :

          <p className="mt-1 text-[12px] text-slate-500">Sent automatically once technical and commercial assessments are complete.</p>
          }
        </section>

        <section className="px-4 py-3">
          <h3 className="text-[12px] font-bold text-slate-800">Billing effect</h3>
          <p className="mt-1 text-[12.5px] text-slate-700">{billingEffect(s, showAmounts)}</p>
          {s.relocationInvoiceId && showAmounts && <p className="mt-1 text-[12px] text-slate-500">Relocation charge invoiced on {s.relocationInvoiceId}.</p>}
        </section>
      </div>
    </AdminPanel>);

}