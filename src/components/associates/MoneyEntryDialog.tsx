import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';

interface Props {
  title: string;
  description?: string;
  submitLabel: string;
  /** Which inputs to show. */
  fields: {amount?: number | true;reference?: string;date?: string;text?: {label: string;min: number;};};
  onSubmit: (v: {amount: number;reference: string;at: string;text: string;}) => boolean;
  onClose: () => void;
}

/** Small form for payouts, remittances and disputes. amount: number pre-fills and locks the amount. */
export function MoneyEntryDialog({ title, description, submitLabel, fields, onSubmit, onClose }: Props) {
  const fixed = typeof fields.amount === 'number' ? fields.amount : undefined;
  const [amount, setAmount] = useState(fixed ? String(fixed) : '');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(dhakaInputValue(demoNow().toISOString()));
  const [text, setText] = useState('');
  const ok = (!fields.amount || Number(amount) > 0) && (!fields.reference || reference.trim().length >= 4) && (!fields.text || text.trim().length >= fields.text.min);

  return (
    <CrmDialog
      title={title}
      description={description}
      onClose={onClose}
      submitLabel={submitLabel}
      submitDisabled={!ok}
      onSubmit={() => onSubmit({ amount: Number(amount), reference: reference.trim(), at: fromDhakaInput(date, '12:00'), text: text.trim() }) && onClose()}>
      
      {fields.amount &&
      <FormField label="Amount (BDT)" htmlFor="me-amt" required>
          <input id="me-amt" inputMode="numeric" disabled={fixed !== undefined} className={`${fieldInput} tabular-nums`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
        </FormField>
      }
      {fields.reference &&
      <FormField label={fields.reference} htmlFor="me-ref" required>
          <input id="me-ref" className={fieldInput} value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
      }
      {fields.date &&
      <FormField label={fields.date} htmlFor="me-date" required>
          <input id="me-date" type="date" className={fieldInput} value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
      }
      {fields.text &&
      <FormField label={fields.text.label} htmlFor="me-text" required help={`At least ${fields.text.min} characters.`}>
          <textarea id="me-text" rows={3} className={fieldTextarea} value={text} onChange={(e) => setText(e.target.value)} />
        </FormField>
      }
    </CrmDialog>);

}