import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';

interface Props {
  title: string;
  description?: string;
  submitLabel: string;
  danger?: boolean;
  onSubmit: (reason: string) => boolean;
  onClose: () => void;
}

export function BillingReasonDialog({ title, description, submitLabel, danger, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState('');
  return (
    <CrmDialog title={title} description={description} onClose={onClose} submitLabel={submitLabel} submitTone={danger ? 'danger' : 'primary'} submitDisabled={reason.trim().length < 10} onSubmit={() => onSubmit(reason) && onClose()}>
      <FormField label="Reason" htmlFor="br-reason" required help="At least 10 characters. Kept in the audit history.">
        <textarea id="br-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </FormField>
    </CrmDialog>);

}