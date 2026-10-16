import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { MIN_REASON } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { CONFIRMATION_STATUSES, type ConfirmationStatus } from '../../types/ticket';
import type { Ticket } from '../../types/records';

export function ConfirmationDialog({ ticket: t, onClose }: {ticket: Ticket;onClose: () => void;}) {
  const runAction = useRunAction();
  const [c, setC] = useState<ConfirmationStatus>('Confirmed by customer');
  const [by, setBy] = useState(t.callerName ?? '');
  const [note, setNote] = useState('');
  const ok = c === 'Confirmed by customer' ? by.trim().length >= 3 : note.trim().length >= MIN_REASON;
  return (
    <CrmDialog title="Record customer confirmation" onClose={onClose} submitLabel="Save" submitDisabled={!ok} onSubmit={() => runAction({ type: 'TKT_CONFIRM', ticketId: t.id, confirmation: c, confirmedBy: c === 'Confirmed by customer' ? by : '', note }) && onClose()}>
      <FormField label="Status" htmlFor="cf-s" required>
        <select id="cf-s" className={fieldInput} value={c} onChange={(e) => setC(e.target.value as ConfirmationStatus)}>
          {CONFIRMATION_STATUSES.map((x) =>
          <option key={x}>{x}</option>
          )}
        </select>
      </FormField>
      {c === 'Confirmed by customer' ?
      <FormField label="Confirmed by" htmlFor="cf-b" required>
          <input id="cf-b" className={fieldInput} value={by} onChange={(e) => setBy(e.target.value)} />
        </FormField> :

      <FormField label="Note" htmlFor="cf-n" required help={c === 'Customer disputes' ? 'Reopen the ticket afterwards to continue work.' : `At least ${MIN_REASON} characters.`}>
          <textarea id="cf-n" rows={3} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      }
    </CrmDialog>);

}