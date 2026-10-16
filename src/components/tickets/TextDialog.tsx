import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';

interface Props {
  title: string;
  description?: string;
  label: string;
  help?: string;
  submitLabel: string;
  min?: number;
  danger?: boolean;
  onSubmit: (text: string) => boolean;
  onClose: () => void;
}

/** Single free-text entry (response, note, reopen reason). */
export function TextDialog({ title, description, label, help, submitLabel, min = 10, danger, onSubmit, onClose }: Props) {
  const [text, setText] = useState('');
  return (
    <CrmDialog title={title} description={description} onClose={onClose} submitLabel={submitLabel} submitTone={danger ? 'danger' : 'primary'} submitDisabled={text.trim().length < min} onSubmit={() => onSubmit(text) && onClose()}>
      <FormField label={label} htmlFor="td-text" required help={help ?? `At least ${min} characters.`}>
        <textarea id="td-text" rows={4} className={fieldTextarea} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </FormField>
    </CrmDialog>);

}