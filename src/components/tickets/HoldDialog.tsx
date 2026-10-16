import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { MIN_REASON, policyFor } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { HOLD_REASONS, type HoldReason } from '../../types/ticket';
import type { Ticket } from '../../types/records';

/** On Hold requires a reason. Whether the SLA pauses comes from the configured policy, shown before confirming. */
export function HoldDialog({ ticket: t, onClose }: {ticket: Ticket;onClose: () => void;}) {
  const runAction = useRunAction();
  const [reason, setReason] = useState<HoldReason>('Awaiting customer access');
  const [note, setNote] = useState('');
  const pauses = policyFor(t.priority).pauseReasons.includes(reason);
  return (
    <CrmDialog title={`Put ${t.id} on hold`} onClose={onClose} submitLabel="Put on hold" submitDisabled={note.trim().length < MIN_REASON} onSubmit={() => runAction({ type: 'TKT_HOLD', ticketId: t.id, reason, note }) && onClose()}>
      <FormField label="Reason" htmlFor="hd-r" required>
        <select id="hd-r" className={fieldInput} value={reason} onChange={(e) => setReason(e.target.value as HoldReason)}>
          {HOLD_REASONS.map((r) =>
          <option key={r}>{r}</option>
          )}
        </select>
      </FormField>
      <p role="status" className={`rounded-md px-3 py-2 text-[12px] ${pauses ? 'bg-blue-50 text-slate-800' : 'bg-amber-50 text-slate-800'}`}>
        {pauses ? `The ${t.priority} policy pauses the resolution timer for this reason.` : `The resolution timer keeps running — the ${t.priority} policy does not pause for this reason.`}
      </p>
      <FormField label="Details" htmlFor="hd-n" required help={`What is blocking the work and when it is expected to clear. At least ${MIN_REASON} characters.`}>
        <textarea id="hd-n" rows={3} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}