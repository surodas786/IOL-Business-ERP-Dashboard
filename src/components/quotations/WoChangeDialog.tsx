import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { formatBDT } from '../../utils/format';
import { MIN_REASON } from '../../utils/quoteWorkflow';
import type { WorkOrderSnapshot, ChangeRequest } from '../../types/quotation';

interface Props {
  workOrderId: string;
  snapshot: WorkOrderSnapshot;
  showMoney: boolean;
  onClose: () => void;
}

/** Request a controlled revision or cancellation. Nothing changes until the configured authority approves. */
export function WoChangeDialog({ workOrderId, snapshot: s, showMoney, onClose }: Props) {
  const runAction = useRunAction();
  const [kind, setKind] = useState<ChangeRequest['kind']>('Revision');
  const [reason, setReason] = useState('');
  const [bandwidth, setBandwidth] = useState(s.terms.bandwidthMbps);
  const [mrc, setMrc] = useState(s.terms.mrc);
  const [lead, setLead] = useState(s.terms.leadTimeDays);
  const [months, setMonths] = useState(s.terms.contractMonths);
  const [touched, setTouched] = useState(false);
  const short = reason.trim().length < MIN_REASON;
  const n = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

  return (
    <CrmDialog
      title={`Change ${workOrderId}`}
      description={`Snapshot v${s.version} stays in force until the change is approved by the Business Head or Management. An approved revision issues snapshot v${s.version + 1} with fresh handovers.`}
      onClose={onClose}
      submitLabel={kind === 'Revision' ? 'Request revision' : 'Request cancellation'}
      submitTone={kind === 'Cancellation' ? 'danger' : 'primary'}
      onSubmit={() => {
        setTouched(true);
        if (short) return;
        const proposed = kind === 'Revision' ? { bandwidthMbps: bandwidth, leadTimeDays: lead, contractMonths: months, ...(showMoney ? { mrc } : {}) } : undefined;
        if (runAction({ type: 'WO_REQUEST_CHANGE', workOrderId, kind, reason, proposed })) onClose();
      }}>
      
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Change type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['Revision', 'Cancellation'] as const).map((k) =>
          <label key={k} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-[13px] font-semibold transition-colors duration-150 sm:h-9 ${kind === k ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <input type="radio" name="wo-kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
              {k}
            </label>
          )}
        </div>
      </fieldset>

      {kind === 'Revision' &&
      <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bandwidth (Mbps)" htmlFor="wo-bw" help={`Now ${s.terms.bandwidthMbps} Mbps`}>
            <input id="wo-bw" inputMode="numeric" className={fieldInput} value={String(bandwidth)} onChange={(e) => setBandwidth(n(e.target.value))} />
          </FormField>
          {showMoney &&
        <FormField label="MRC (BDT)" htmlFor="wo-mrc" help={`Now ${formatBDT(s.terms.mrc)}`}>
              <input id="wo-mrc" inputMode="numeric" className={fieldInput} value={String(mrc)} onChange={(e) => setMrc(n(e.target.value))} />
            </FormField>
        }
          <FormField label="Installation lead time (days)" htmlFor="wo-lead" help={`Now ${s.terms.leadTimeDays} days; changes the deadline`}>
            <input id="wo-lead" inputMode="numeric" className={fieldInput} value={String(lead)} onChange={(e) => setLead(n(e.target.value))} />
          </FormField>
          <FormField label="Contract duration (months)" htmlFor="wo-months" help={`Now ${s.terms.contractMonths} months`}>
            <input id="wo-months" inputMode="numeric" className={fieldInput} value={String(months)} onChange={(e) => setMonths(n(e.target.value))} />
          </FormField>
        </div>
      }

      <FormField label="Reason" htmlFor="wo-reason" required error={touched && short ? `At least ${MIN_REASON} characters.` : undefined}>
        <textarea id="wo-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}