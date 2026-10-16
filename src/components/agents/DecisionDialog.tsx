import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { MIN_REASON, financialEffect, usesMrc, usesOtc } from '../../utils/agentRules';
import { EffectSummary } from './EffectSummary';
import type { CommissionProposal } from '../../types/agent';

/** Business Head decision: approve as proposed, revise rates (reason required) or reject. */
export function DecisionDialog({ proposal: p, onClose }: {proposal: CommissionProposal;onClose: () => void;}) {
  const runAction = useRunAction();
  const [decision, setDecision] = useState<'Approve' | 'Revise' | 'Reject'>('Approve');
  const [m, setM] = useState(String(p.proposedMrcPct));
  const [o, setO] = useState(String(p.proposedOtcPct));
  const [reason, setReason] = useState('');
  const mrc = decision === 'Revise' ? Number(m) || 0 : p.proposedMrcPct;
  const otc = decision === 'Revise' ? Number(o) || 0 : p.proposedOtcPct;
  const changed = mrc !== p.proposedMrcPct || otc !== p.proposedOtcPct;
  const needsReason = decision !== 'Approve';
  const ok = (!needsReason || reason.trim().length >= MIN_REASON) && (decision !== 'Revise' || changed);

  return (
    <CrmDialog
      size="lg"
      title={`Decide ${p.id}`}
      description="Approved rates are locked into the linked work order and cannot be changed afterwards."
      onClose={onClose}
      submitLabel={decision === 'Reject' ? 'Reject proposal' : decision === 'Revise' ? 'Approve revised rates' : 'Approve as proposed'}
      submitTone={decision === 'Reject' ? 'danger' : 'primary'}
      submitDisabled={!ok}
      onSubmit={() => runAction({ type: 'AGT_DECIDE_PROPOSAL', proposalId: p.id, decision, mrcPct: mrc, otcPct: otc, reason }) && onClose()}>
      
      <div role="radiogroup" aria-label="Decision" className="grid gap-2 sm:grid-cols-3">
        {(['Approve', 'Revise', 'Reject'] as const).map((d) =>
        <label key={d} className={`cursor-pointer rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${decision === d ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <input type="radio" name="dd" className="sr-only" checked={decision === d} onChange={() => setDecision(d)} />
            {d === 'Revise' ? 'Revise rates' : d}
          </label>
        )}
      </div>
      {decision === 'Revise' &&
      <div className="grid gap-3 sm:grid-cols-2">
          {usesMrc(p.basis) &&
        <FormField label={`MRC rate (%) — proposed ${p.proposedMrcPct}%`} htmlFor="dd-m" required>
              <input id="dd-m" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={m} onChange={(e) => setM(e.target.value.replace(/[^\d.]/g, ''))} />
            </FormField>
        }
          {usesOtc(p.basis) &&
        <FormField label={`OTC rate (%) — proposed ${p.proposedOtcPct}%`} htmlFor="dd-o" required>
              <input id="dd-o" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={o} onChange={(e) => setO(e.target.value.replace(/[^\d.]/g, ''))} />
            </FormField>
        }
        </div>
      }
      {decision !== 'Reject' && <EffectSummary effect={financialEffect(p, mrc, otc)} compact />}
      {needsReason &&
      <FormField label={decision === 'Revise' ? 'Reason for the rate change' : 'Reason for rejection'} htmlFor="dd-r" required help={`At least ${MIN_REASON} characters. Recorded in the proposal history.`}>
          <textarea id="dd-r" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      }
    </CrmDialog>);

}