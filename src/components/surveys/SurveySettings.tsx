import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, primaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { StatusBadge } from '../records/StatusBadge';
import { canSuperviseSurveys, canViewCostAnalysis } from '../../utils/surveyRules';

/** Configurable labels and the payback formula status. */
export function SurveySettings() {
  const { db } = useData();
  const { role } = useSession();
  const editable = canSuperviseSurveys(role);
  const labels = (['ggc', 'fnn'] as const).map((k) => ({ key: k, policy: db.policies.find((p) => p.id === (k === 'ggc' ? 'LBL-GGC' : 'LBL-FNN')) }));
  const formula = db.policies.find((p) => p.id === 'POL-PAYBACK');

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AdminPanel title="Network component labels" description="GGC and FNN are shown on every survey form under these labels. Their meaning and naming are awaiting confirmation from IOL.">
        <ul className="divide-y divide-slate-100">
          {labels.map(({ key, policy }) => policy && <LabelRow key={key} k={key} value={policy.value} status={policy.status} editable={editable} />)}
        </ul>
        {!editable && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Only the Technical Supervisor can change these labels.</p>}
      </AdminPanel>
      {canViewCostAnalysis(role) && formula &&
      <AdminPanel title="Payback formula" actions={<StatusBadge status={formula.status} />} description="Used by the cost analysis on each survey. Awaiting Finance confirmation — treat results as indicative.">
          <div className="space-y-1 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-slate-700">
            <p>Net installation investment = company-funded installation cost − applicable net OTC recovery</p>
            <p>Monthly contribution = net MRC − recurring delivery costs − recurring agent commission</p>
            <p>Estimated payback months = net installation investment ÷ positive monthly contribution</p>
          </div>
          <p className="border-t border-slate-100 px-4 py-2 text-[11.5px] text-slate-600">Refundable deposits and unapplied advances are excluded from cost recovery. Zero or negative contribution shows “No positive payback”.</p>
        </AdminPanel>
      }
    </div>);

}

function LabelRow({ k, value, status, editable }: {k: 'ggc' | 'fnn';value: string;status: string;editable: boolean;}) {
  const runAction = useRunAction();
  const [v, setV] = useState(value);
  return (
    <li className="px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12px] font-semibold text-slate-700">{k.toUpperCase()} component</span>
        <StatusBadge status={status} />
      </div>
      {editable ?
      <div className="flex gap-2">
          <input aria-label={`${k.toUpperCase()} label`} className={`${inputClass} flex-1`} value={v} onChange={(e) => setV(e.target.value)} />
          <button type="button" className={primaryBtn} disabled={v.trim() === value || v.trim().length < 2} onClick={() => runAction({ type: 'SURVEY_SET_LABEL', key: k, value: v })}>
            Save
          </button>
        </div> :

      <p className="text-[13px] text-slate-900">{value}</p>
      }
    </li>);

}