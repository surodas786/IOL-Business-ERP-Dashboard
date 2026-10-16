import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';
import { MIN_REASON } from '../../utils/quoteWorkflow';

interface Props {
  title: string;
  description: string;
  label: string;
  submitLabel: string;
  tone?: 'primary' | 'danger';
  /** Returns true when the action succeeded and the dialog should close. */
  onSubmit: (reason: string) => boolean;
  onClose: () => void;
}

/** Reason-required confirmation used for cancellations and exception requests. */
export function ReasonDialog({ title, description, label, submitLabel, tone = 'primary', onSubmit, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const short = reason.trim().length < MIN_REASON;

  return (
    <CrmDialog
      title={title}
      description={description}
      onClose={onClose}
      submitLabel={submitLabel}
      submitTone={tone}
      onSubmit={() => {
        setTouched(true);
        if (!short && onSubmit(reason.trim())) onClose();
      }}>
      
      <FormField label={label} htmlFor="reason-text" required error={touched && short ? `At least ${MIN_REASON} characters.` : undefined} help="Recorded in the history and audit log.">
        <textarea id="reason-text" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </FormField>
    </CrmDialog>);

}