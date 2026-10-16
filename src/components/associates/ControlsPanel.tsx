import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FlaskConicalIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatDhaka } from '../../utils/format';
import { canDecideSuspension, canPrepareSettlement } from '../../utils/associateRules';
import { AdminPanel, linkBtn } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import type { Associate } from '../../types/records';

type Pending = {kind: 'controls';autoRecharge: boolean;networkRestricted: boolean;label: string;} | {kind: 'suspension';decision: 'Flag for review' | 'Clear' | 'Suspend';};

/** Account status and simulated network controls. Nothing here touches a real network. */
export function ControlsPanel({ associate: a, pastGrace }: {associate: Associate;pastGrace: boolean;}) {
  const { role } = useSession();
  const runAction = useRunAction();
  const [pending, setPending] = useState<Pending | null>(null);
  const c = a.controls ?? { autoRecharge: true, networkRestricted: false };
  const canControl = canPrepareSettlement(role) || canDecideSuspension(role);
  const status = a.status ?? 'Active';

  const Toggle = ({ label, on, onChange }: {label: string;on: boolean;onChange: () => void;}) =>
  <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-slate-800">{label}</span>
      <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={!canControl}
      onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50 ${on ? 'bg-primary' : 'bg-slate-300'}`}>
      
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>;


  return (
    <AdminPanel title="Status and controls">
      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={status} />
          <div className="flex gap-3">
            {status === 'Active' && canControl &&
            <button type="button" className={linkBtn} onClick={() => setPending({ kind: 'suspension', decision: 'Flag for review' })}>
                Flag for suspension review
              </button>
            }
            {status !== 'Active' && canDecideSuspension(role) &&
            <button type="button" className={linkBtn} onClick={() => setPending({ kind: 'suspension', decision: 'Clear' })}>
                Clear
              </button>
            }
            {status === 'Suspension Review' && canDecideSuspension(role) &&
            <button type="button" className={`${linkBtn} text-status-critical hover:text-status-critical`} onClick={() => setPending({ kind: 'suspension', decision: 'Suspend' })}>
                Suspend
              </button>
            }
          </div>
        </div>
        {pastGrace && status === 'Active' && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-slate-800">A settlement is past its grace period. Flag the associate for suspension review.</p>}
        <div className="rounded-md border border-dashed border-slate-300 px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <FlaskConicalIcon className="h-3.5 w-3.5" aria-hidden /> Simulated — no network change is made in the demo
          </p>
          <Toggle label="Auto recharge" on={c.autoRecharge} onChange={() => setPending({ kind: 'controls', autoRecharge: !c.autoRecharge, networkRestricted: c.networkRestricted, label: `${c.autoRecharge ? 'Turn off' : 'Turn on'} auto recharge` })} />
          <Toggle label="Network restriction" on={c.networkRestricted} onChange={() => setPending({ kind: 'controls', autoRecharge: c.autoRecharge, networkRestricted: !c.networkRestricted, label: `${c.networkRestricted ? 'Lift' : 'Apply'} network restriction` })} />
          {c.changedAt &&
          <p className="mt-1 text-[11px] text-slate-500">
              Last changed by {c.changedBy} · {formatDhaka(c.changedAt)} — {c.note}
            </p>
          }
        </div>
      </div>
      <AnimatePresence>
        {pending &&
        <BillingReasonDialog
          key="p"
          title={pending.kind === 'controls' ? `${pending.label} (simulated)` : pending.decision === 'Flag for review' ? 'Flag for suspension review' : pending.decision === 'Suspend' ? `Suspend ${a.name}` : 'Clear suspension status'}
          description={pending.kind === 'controls' ? 'Recorded in the audit history only. A real system would send this to network provisioning.' : 'Suspension decisions are taken by the Finance Approver, Management or Business Head.'}
          submitLabel="Confirm"
          danger={pending.kind === 'suspension' && pending.decision === 'Suspend'}
          onSubmit={(note) =>
          pending.kind === 'controls' ?
          runAction({ type: 'ASC_SET_CONTROLS', associateId: a.id, autoRecharge: pending.autoRecharge, networkRestricted: pending.networkRestricted, note }) :
          runAction({ type: 'ASC_SUSPENSION', associateId: a.id, decision: pending.decision, note })
          }
          onClose={() => setPending(null)} />

        }
      </AnimatePresence>
    </AdminPanel>);

}