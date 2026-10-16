import React, { useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, LockIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { inputClass } from '../admin/FormField';
import { CrmDialog } from './CrmDialog';
import type { CrmStage } from '../../types/crm';

const ROLE_NOTE: Record<NonNullable<CrmStage['role']>, string> = {
  entry: 'New leads start here',
  prospect: 'Needs a named contact plus a communication or interest',
  workOrder: 'Set when Back Office converts the accepted quotation',
  won: 'Set when billing is activated'
};

/** Rename, add, remove and reorder pipeline stages. System stages keep their order. */
export function StageConfigDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [stages, setStages] = useState<CrmStage[]>(db.crmStages.map((s) => ({ ...s })));

  const update = (i: number, label: string) => setStages((s) => s.map((x, j) => j === i ? { ...x, label } : x));
  const move = (i: number, dir: -1 | 1) =>
  setStages((s) => {
    const n = [...s];
    [n[i], n[i + dir]] = [n[i + dir], n[i]];
    return n;
  });
  const add = () => {
    const wo = stages.findIndex((s) => s.role === 'workOrder');
    const id = `custom-${Date.now().toString(36)}`;
    setStages((s) => [...s.slice(0, wo), { id, label: 'New stage' }, ...s.slice(wo)]);
  };
  const inUse = (id: string) => db.opportunities.filter((o) => o.stage === id).length;

  return (
    <CrmDialog
      title="Configure pipeline stages"
      description="Rename stages or add your own between Prospect and Work Order. Changes apply to every branch and are audited."
      onClose={onClose}
      onSubmit={() => runAction({ type: 'CRM_SAVE_STAGES', stages }) && onClose()}
      submitLabel="Save stages">
      
      <ol className="space-y-2">
        {stages.map((s, i) => {
          const custom = !s.role;
          const canUp = custom && i > 0 && stages[i - 1].role !== 'entry';
          const canDown = custom && i < stages.length - 1 && !stages[i + 1].role;
          const count = inUse(s.id);
          return (
            <li key={s.id} className="rounded-md border border-slate-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-[11px] font-semibold text-slate-400">{i + 1}</span>
                <input aria-label={`Stage ${i + 1} name`} className={`${inputClass} h-8`} value={s.label} onChange={(e) => update(i, e.target.value)} />
                {custom ?
                <>
                    <IconBtn label="Move up" disabled={!canUp} onClick={() => move(i, -1)}>
                      <ArrowUpIcon className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Move down" disabled={!canDown} onClick={() => move(i, 1)}>
                      <ArrowDownIcon className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label={count ? `${count} opportunities use this stage` : 'Remove stage'} disabled={count > 0} onClick={() => setStages((x) => x.filter((_, j) => j !== i))}>
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </IconBtn>
                  </> :

                <LockIcon className="mx-2 h-3.5 w-3.5 flex-shrink-0 text-slate-300" aria-label="System stage" />
                }
              </div>
              <p className="ml-7 mt-1 text-[10.5px] text-slate-500">
                {s.role ? ROLE_NOTE[s.role] : 'Custom stage'}
                {count > 0 && ` · ${count} opportunit${count === 1 ? 'y' : 'ies'}`}
              </p>
            </li>);

        })}
      </ol>
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-hover">
        <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add stage before Work Order
      </button>
      <p className="text-[11px] text-slate-500">Lost and Stalled are outcomes, not stages, so an opportunity keeps the stage it reached.</p>
    </CrmDialog>);

}

function IconBtn({ label, disabled, onClick, children }: {label: string;disabled?: boolean;onClick: () => void;children: React.ReactNode;}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>);

}