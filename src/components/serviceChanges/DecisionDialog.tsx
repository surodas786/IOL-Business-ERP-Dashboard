import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { dhakaInputValue, formatDhakaDate, fromDhakaInput } from '../../utils/format';
import type { ServiceChange } from '../../types/records';

export function DecisionDialog({ change: s, decision, onClose }: {change: ServiceChange;decision: 'Approved' | 'Rejected';onClose: () => void;}) {
  const runAction = useRunAction();
  const [date, setDate] = useState(dhakaInputValue(s.requestedDate));
  const [note, setNote] = useState('');
  const approve = decision === 'Approved';
  const time = s.type === 'Discontinuation' ? '23:59' : '00:00';

  return (
    <CrmDialog
      title={approve ? `Approve ${s.type.toLowerCase()} ${s.id}` : `Reject ${s.id}`}
      description={approve ? 'Billing changes from the approved effective date, not from when the work is done.' : 'The service and its billing stay as they are.'}
      onClose={onClose}
      submitLabel={approve ? 'Approve' : 'Reject'}
      submitTone={approve ? 'primary' : 'danger'}
      submitDisabled={approve ? !date : note.trim().length < 10}
      onSubmit={() => runAction({ type: 'SC_DECIDE', id: s.id, decision, effectiveDate: approve ? fromDhakaInput(date, time) : undefined, note }) && onClose()}>
      
      {approve &&
      <FormField label={s.type === 'Discontinuation' ? 'Approved service stop date' : s.type === 'Temporary Stop' ? 'Approved stop date' : 'Approved effective date'} htmlFor="dc-date" required help={`Requested ${formatDhakaDate(s.requestedDate)}`}>
          <input id="dc-date" type="date" className={fieldInput} value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
      }
      <FormField label={approve ? 'Note (optional)' : 'Reason'} htmlFor="dc-note" required={!approve} help={approve ? undefined : 'At least 10 characters. The requester is notified.'}>
        <textarea id="dc-note" rows={3} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}