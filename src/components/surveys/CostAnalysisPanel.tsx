import React, { useMemo, useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { StatusBadge } from '../records/StatusBadge';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canEditCommercial, commercialFor, computeCost, paybackLabel } from '../../utils/surveyRules';
import type { SurveyCommercial } from '../../types/survey';
import type { Survey } from '../../types/records';

type Key = Exclude<keyof SurveyCommercial, 'updatedById' | 'updatedAt'>;

const GROUPS: {title: string;note?: string;fields: {key: Key;label: string;suffix?: string;}[];}[] = [
{ title: 'Revenue (excl. VAT)', fields: [{ key: 'mrc', label: 'MRC' }, { key: 'mrcDiscount', label: 'Monthly discount' }, { key: 'otc', label: 'OTC charged' }, { key: 'otcWaiver', label: 'OTC waived' }] },
{ title: 'One-time costs not in the BOM', note: 'Materials come from the BOM — don’t enter them again here.', fields: [{ key: 'labour', label: 'Installation labour' }, { key: 'permits', label: 'Permits and pole rent' }, { key: 'nttnOtc', label: 'NTTN one-time charge' }, { key: 'otherOneTime', label: 'Other one-time' }] },
{ title: 'Recurring delivery costs', fields: [{ key: 'nttnMonthly', label: 'NTTN lease / month' }, { key: 'upstreamMonthly', label: 'Upstream bandwidth / month' }, { key: 'otherRecurring', label: 'Other recurring / month' }, { key: 'agentRecurringPct', label: 'Recurring agent commission', suffix: '% of net MRC' }] },
{ title: 'Excluded from cost recovery', note: 'Recorded for transparency. Never reduces the investment.', fields: [{ key: 'refundableDeposit', label: 'Refundable security deposit' }, { key: 'advanceReceived', label: 'Unapplied advance' }] }];


export function CostAnalysisPanel({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const saved = commercialFor(db, s);
  const editable = canEditCommercial(role);
  const [draft, setDraft] = useState<Record<Key, string>>(() => toStrings(saved));
  const values = useMemo(() => toNumbers(draft), [draft]);
  const b = computeCost(s.bom ?? [], values);
  const dirty = JSON.stringify(toNumbers(toStrings(saved))) !== JSON.stringify(values);
  const opp = db.opportunities.find((o) => o.id === s.opportunityId);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
      <AdminPanel
        title="Inputs"
        description={saved.updatedAt ? `Last saved by ${userName(saved.updatedById ?? '')} · ${formatDhaka(saved.updatedAt)}` : 'Defaults from the latest quotation or opportunity. All values exclude VAT.'}
        actions={
        editable &&
        <>
              <button type="button" className={secondaryBtn} disabled={!dirty} onClick={() => setDraft(toStrings(saved))}>
                Discard
              </button>
              <button type="button" className={primaryBtn} disabled={!dirty} onClick={() => runAction({ type: 'SURVEY_SAVE_COMMERCIAL', surveyId: s.id, commercial: values })}>
                Save inputs
              </button>
            </>

        }>
        
        <div className="grid gap-x-6 gap-y-4 px-4 py-4 md:grid-cols-2">
          {GROUPS.map((g) =>
          <fieldset key={g.title}>
              <legend className="text-[12.5px] font-bold text-slate-900">{g.title}</legend>
              {g.note && <p className="mb-1 text-[11px] text-slate-500">{g.note}</p>}
              <div className="mt-1.5 space-y-2">
                {g.fields.map((f) =>
              <label key={f.key} className="grid grid-cols-[1fr_140px] items-center gap-2 text-[12px] text-slate-700">
                    <span>
                      {f.label}
                      {f.suffix && <span className="block text-[10.5px] text-slate-400">{f.suffix}</span>}
                    </span>
                    <input
                  inputMode="decimal"
                  readOnly={!editable}
                  className={`${inputClass} h-8 text-right tabular-nums ${!editable ? 'bg-slate-50' : ''}`}
                  value={draft[f.key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value.replace(/[^\d.]/g, '') }))} />
                
                  </label>
              )}
              </div>
            </fieldset>
          )}
        </div>
        {opp?.agentId && values.agentRecurringPct === 0 &&
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">This opportunity is agent-sourced. One-time agent commissions are not part of this formula; enter a percentage only if a recurring commission is agreed.</p>
        }
      </AdminPanel>

      <div className="space-y-3">
        <AdminPanel title="Result" actions={<StatusBadge status="Awaiting IOL confirmation" />} description="Proposed demo formula — awaiting Finance confirmation. Not for pricing decisions.">
          <dl className="divide-y divide-slate-100 text-[12.5px]">
            <Line label="Company-funded materials (BOM)" value={b.materialsCompanyFunded} />
            <Line label="One-time services" value={b.oneTimeServices} />
            <Line label="Company-funded installation cost" value={b.companyFundedInstall} strong />
            <Line label="Less applicable net OTC recovery" value={-b.netOtcRecovery} />
            <Line label="Net installation investment" value={b.netInvestment} strong tone={b.netInvestment <= 0 ? 'text-status-ok' : undefined} />
            <Line label="Net MRC" value={b.netMrc} />
            <Line label="Less recurring delivery costs" value={-b.recurringDelivery} />
            <Line label="Less recurring agent commission" value={-b.agentCommission} />
            <Line label="Monthly contribution" value={b.monthlyContribution} strong tone={b.monthlyContribution <= 0 ? 'text-status-critical' : undefined} />
          </dl>
          <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-[12.5px] font-semibold text-slate-700">Estimated payback</span>
            <span className={`text-[20px] font-bold tabular-nums ${b.paybackMonths === null ? 'text-status-critical' : 'text-slate-900'}`}>{paybackLabel(b)}</span>
          </div>
        </AdminPanel>

        <AdminPanel title="Formula and assumptions">
          <div className="space-y-2 px-4 py-3 text-[11.5px] leading-relaxed text-slate-600">
            <p className="rounded bg-slate-50 px-2.5 py-2 font-mono text-[11px] text-slate-700">
              Net installation investment = company-funded installation cost − applicable net OTC recovery
              <br />
              Monthly contribution = net MRC − recurring delivery costs − recurring agent commission
              <br />
              Payback (months) = net installation investment ÷ positive monthly contribution
            </p>
            <ul className="space-y-1.5">
              {[
              'All amounts exclude VAT.',
              'Each cost is counted once: materials only from the BOM, labour and permits only in one-time services, partner charges only as NTTN OTC or lease.',
              `Customer- and partner-supplied BOM lines carry no IOL cost${b.materialsExcluded > 0 ? ` (${formatBDT(b.materialsExcluded)} excluded)` : ''}.`,
              'Returnable equipment is counted at full cost; its possible recovery value is not deducted.',
              `Refundable deposits and unapplied advances are not cost recovery${b.excludedFromRecovery > 0 ? ` (${formatBDT(b.excludedFromRecovery)} excluded)` : ''}.`,
              'One-time agent commissions are outside this formula.',
              'If monthly contribution is zero or negative the result is “No positive payback”.'].
              map((t) =>
              <li key={t} className="flex gap-1.5">
                  <InfoIcon className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                  {t}
                </li>
              )}
            </ul>
          </div>
        </AdminPanel>
      </div>
    </div>);

}

function Line({ label, value, strong, tone }: {label: string;value: number;strong?: boolean;tone?: string;}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 px-4 py-1.5 ${strong ? 'bg-slate-50/60' : ''}`}>
      <dt className={strong ? 'font-semibold text-slate-800' : 'text-slate-500'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-bold' : ''} ${tone ?? 'text-slate-900'}`}>{value < 0 ? `− ${formatBDT(-value)}` : formatBDT(value)}</dd>
    </div>);

}

const KEYS: Key[] = ['mrc', 'mrcDiscount', 'otc', 'otcWaiver', 'refundableDeposit', 'advanceReceived', 'labour', 'permits', 'nttnOtc', 'otherOneTime', 'nttnMonthly', 'upstreamMonthly', 'otherRecurring', 'agentRecurringPct'];

function toStrings(c: SurveyCommercial): Record<Key, string> {
  return Object.fromEntries(KEYS.map((k) => [k, String(c[k] ?? 0)])) as Record<Key, string>;
}

function toNumbers(r: Record<Key, string>): SurveyCommercial {
  return Object.fromEntries(KEYS.map((k) => [k, Number(r[k]) || 0])) as unknown as SurveyCommercial;
}