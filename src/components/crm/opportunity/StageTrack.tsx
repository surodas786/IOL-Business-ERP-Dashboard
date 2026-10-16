import React from 'react';
import { CheckIcon, CircleIcon, LockIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { prospectReadiness, stageIndex, stageMoveError, stageWithRole } from '../../../utils/crmRules';
import type { Opportunity } from '../../../types/records';

/** Stage progress with click-to-move and the Suspect → Prospect gate. */
export function StageTrack({ opportunity: o, canEdit }: {opportunity: Opportunity;canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const cur = stageIndex(db, o.stage);
  const prospectIdx = stageIndex(db, stageWithRole(db, 'prospect').id);
  const gate = prospectReadiness(db, o);
  const showGate = o.status === 'Open' && cur < prospectIdx;

  return (
    <section aria-label="Pipeline stage" className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <ol className="flex flex-wrap gap-1.5">
        {db.crmStages.map((s, i) => {
          const done = i < cur || i === cur && o.status === 'Won';
          const here = i === cur;
          const err = canEdit ? stageMoveError(db, o, s.id) : 'Only the owner or a sales manager can move this opportunity.';
          const clickable = !here && !err;
          return (
            <li key={s.id} className="min-w-[110px] flex-1">
              <button
                type="button"
                disabled={!clickable}
                title={here ? 'Current stage' : err ?? `Move to ${s.label}`}
                onClick={() => runAction({ type: 'CRM_MOVE_STAGE', opportunityId: o.id, toStageId: s.id })}
                className={`flex w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[12px] font-semibold transition-colors duration-150 ${
                here ?
                o.status === 'Open' || o.status === 'Won' ?
                'border-primary bg-primary text-white' :
                'border-slate-400 bg-slate-100 text-slate-700' :
                done ?
                'border-primary/30 bg-primary-soft text-slate-800' :
                clickable ?
                'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-slate-900' :
                'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`
                }>
                
                {done && !here ? <CheckIcon className="h-3.5 w-3.5 text-primary" aria-hidden /> : s.role === 'workOrder' || s.role === 'won' ? <LockIcon className="h-3 w-3 opacity-60" aria-hidden /> : <CircleIcon className="h-3 w-3 opacity-60" aria-hidden />}
                <span className="truncate">{s.label}</span>
              </button>
            </li>);

        })}
      </ol>
      {o.status !== 'Open' && o.status !== 'Won' &&
      <p className="mt-2 text-[11.5px] text-slate-600">
          <span className="font-semibold text-slate-900">{o.status}</span> at {db.crmStages[cur]?.label}. {o.status === 'Merged' ? `Merged into ${o.mergedIntoId}.` : 'Reopen to continue moving it through the pipeline.'}
        </p>
      }
      {showGate &&
      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11.5px] text-slate-700">
          <p className="font-semibold text-slate-900">To become a Prospect</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            <Gate ok={gate.contact} label="Identified contact with phone or email" />
            <Gate ok={gate.communication || gate.interest} label="Recorded communication or customer interest" />
          </ul>
        </div>
      }
      <p className="mt-2 text-[10.5px] text-slate-400">Work Order and Closed Won are set by delivery: quotation conversion and billing activation.</p>
    </section>);

}

function Gate({ ok, label }: {ok: boolean;label: string;}) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-status-ok' : 'text-slate-500'}`}>
      {ok ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : <CircleIcon className="h-3 w-3" aria-hidden />}
      <span className={ok ? 'text-slate-700' : ''}>{label}</span>
      <span className="sr-only">{ok ? '(done)' : '(missing)'}</span>
    </li>);

}