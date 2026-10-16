import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { hasPermission } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { approverNote } from '../../utils/approvalRules';
import { userName } from '../../utils/relations';
import { inputClass } from '../admin/FormField';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { TaxTreatment } from '../../types/quotation';

const ROUTED = ['Quotation', 'Special Pricing', 'OTC Reduction', 'Credit Terms', 'Agent Commission Terms', 'Advance Exception', 'Work Order Change'];

/** Illustrative tax treatments, commercial thresholds and who each condition routes to. */
export function QuoteSettings() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const canTax = hasPermission(role, 'approveQuotation') || hasPermission(role, 'approveFinancial');
  const canPolicy = hasPermission(role, 'approveQuotation');
  const [credit, setCredit] = useState(String(db.quotePolicy.standardCreditDays));
  const [adv, setAdv] = useState(String(db.quotePolicy.minAdvanceMonths));

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-md border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-slate-900">Tax treatments (illustrative)</h2>
          <p className="text-[11px] text-slate-500">No statutory rate is assumed. Rates stay unset until Finance configures them; quotations then show an illustrative amount.</p>
        </header>
        <ul className="divide-y divide-slate-100">
          {db.taxTreatments.map((t) =>
          <TaxRow key={t.id} t={t} editable={canTax && t.basis !== 'Exempt'} onSave={(rate) => runAction({ type: 'QUOTE_SET_TAX', taxId: t.id, ratePct: rate })} />
          )}
        </ul>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900">Commercial thresholds</h2>
            <p className="text-[11px] text-slate-500">Terms beyond these go to the Finance Approver as exceptional credit terms.</p>
          </div>
          <StatusBadge status={db.quotePolicy.status} />
        </header>
        <form
          className="grid gap-4 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            runAction({ type: 'QUOTE_SET_POLICY', standardCreditDays: Number(credit) || 0, minAdvanceMonths: Number(adv) || 0 });
          }}>
          
          <label className="text-[12px] font-semibold text-slate-700">
            Standard postpaid credit (days)
            <input className={`${inputClass} mt-1.5`} inputMode="numeric" value={credit} disabled={!canPolicy} onChange={(e) => setCredit(e.target.value.replace(/[^\d]/g, ''))} />
          </label>
          <label className="text-[12px] font-semibold text-slate-700">
            Minimum prepaid advance (months of MRC)
            <input className={`${inputClass} mt-1.5`} inputMode="numeric" value={adv} disabled={!canPolicy} onChange={(e) => setAdv(e.target.value.replace(/[^\d]/g, ''))} />
          </label>
          {canPolicy &&
          <button type="submit" className={primaryBtn}>
              Save
            </button>
          }
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white xl:col-span-2">
        <header className="border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-slate-900">Who approves what</h2>
          <p className="text-[11px] text-slate-500">From Administration → Approval Rules. Agent commission terms route exclusively to the Business Head (Sales Head).</p>
        </header>
        <ul className="divide-y divide-slate-100">
          {db.approvalRules.
          filter((r) => ROUTED.includes(r.approvalType)).
          map((r) =>
          <li key={r.id} className="grid gap-1 px-4 py-2 text-[12.5px] sm:grid-cols-[260px_1fr]">
                <span className="font-semibold text-slate-900">{r.name}</span>
                <span className="text-slate-600">
                  {approverNote(r)} · {r.slaHours} h response
                </span>
              </li>
          )}
        </ul>
      </section>
    </div>);

}

function TaxRow({ t, editable, onSave }: {t: TaxTreatment;editable: boolean;onSave: (rate: number | null) => boolean;}) {
  const [value, setValue] = useState(t.ratePct === null ? '' : String(t.ratePct));
  return (
    <li className="px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-slate-900">{t.label}</span>
        {editable ?
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(value.trim() === '' ? null : Number(value));
          }}>
          
            <input aria-label={`${t.label} illustrative rate`} placeholder="Not set" className={`${inputClass} h-8 w-24`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} />
            <span className="text-[11.5px] text-slate-500">%</span>
            <button type="submit" className={secondaryBtn}>
              Save
            </button>
          </form> :

        <span className="text-[12px] text-slate-600">{t.basis === 'Exempt' ? '0% (exempt)' : t.ratePct === null ? 'Rate not configured' : `${t.ratePct}% illustrative`}</span>
        }
      </div>
      <p className="text-[11px] text-slate-500">{t.note}</p>
      {t.updatedAt &&
      <p className="text-[10.5px] text-slate-400">
          Changed by {userName(t.updatedById)} · {formatDhaka(t.updatedAt)}
        </p>
      }
    </li>);

}