import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { ESCALATION_LADDER } from '../../data/supportConfig';
import { MIN_REASON } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import type { Ticket } from '../../types/records';

export function EscalateDialog({ ticket: t, onClose }: {ticket: Ticket;onClose: () => void;}) {
  const runAction = useRunAction();
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  return (
    <CrmDialog
      title={`Escalate ${t.id}`}
      description="Manual escalation, in addition to the automatic policy steps."
      onClose={onClose}
      submitLabel="Escalate"
      submitDisabled={reason.trim().length < MIN_REASON}
      onSubmit={() => runAction({ type: 'TKT_ESCALATE', ticketId: t.id, level, to: ESCALATION_LADDER[level], reason }) && onClose()}>
      
      <FormField label="Escalate to" htmlFor="es-l" required>
        <select id="es-l" className={fieldInput} value={level} onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}>
          {([1, 2, 3] as const).map((l) =>
          <option key={l} value={l}>
              Level {l} — {ESCALATION_LADDER[l]}
            </option>
          )}
        </select>
      </FormField>
      <FormField label="Reason" htmlFor="es-r" required help={`At least ${MIN_REASON} characters.`}>
        <textarea id="es-r" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}