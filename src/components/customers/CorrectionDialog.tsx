import React, { useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canViewIdentity, fieldValue } from '../../utils/customerProfile';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField, inputClass } from '../admin/FormField';
import { CORRECTABLE_FIELDS, CUSTOMER_PROFILE_CATEGORIES, FIELD_LABEL, RESTRICTED_FIELDS, type CorrectableField } from '../../types/customer';
import type { Customer } from '../../types/records';

/** Request a change to a locked core field. Needs old value, proposed value, reason and approval. */
export function CorrectionDialog({ customer: c, onClose }: {customer: Customer;onClose: () => void;}) {
  const { role } = useSession();
  const runAction = useRunAction();
  const fields = CORRECTABLE_FIELDS.filter((f) => !RESTRICTED_FIELDS.includes(f) || canViewIdentity(role));
  const [field, setField] = useState<CorrectableField>(fields[0]);
  const [proposed, setProposed] = useState('');
  const [reason, setReason] = useState('');
  const old = fieldValue(c, field);
  const disabled = !proposed.trim() || proposed.trim() === old || reason.trim().length < 15;

  return (
    <CrmDialog
      title="Request correction at Work Order stage"
      description={`${c.name} · the profile keeps its current value until Management or the Business Head approves.`}
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={disabled}
      onSubmit={() => runAction({ type: 'CUST_REQUEST_CORRECTION', customerId: c.id, field, proposedValue: proposed, reason }) && onClose()}>
      
      <FormField label="Field to correct" htmlFor="cr-field">
        <select
          id="cr-field"
          className={inputClass}
          value={field}
          onChange={(e) => {
            setField(e.target.value as CorrectableField);
            setProposed('');
          }}>
          
          {fields.map((f) =>
          <option key={f} value={f}>
              {FIELD_LABEL[f]}
            </option>
          )}
        </select>
      </FormField>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <FormField label="Current value" htmlFor="cr-old">
          <input id="cr-old" className={inputClass} value={old || '—'} readOnly disabled />
        </FormField>
        <ArrowRightIcon className="mb-2.5 hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
        <FormField label="Proposed value" htmlFor="cr-new" required>
          {field === 'category' ?
          <select id="cr-new" className={inputClass} value={proposed} onChange={(e) => setProposed(e.target.value)}>
              <option value="">Choose…</option>
              {CUSTOMER_PROFILE_CATEGORIES.filter((x) => x !== old).map((x) =>
            <option key={x}>{x}</option>
            )}
            </select> :

          <input id="cr-new" lang={field === 'nameBn' ? 'bn' : undefined} className={inputClass} value={proposed} onChange={(e) => setProposed(e.target.value)} />
          }
        </FormField>
      </div>
      <FormField label="Reason and supporting document" htmlFor="cr-reason" required help="At least 15 characters. Name the document that proves the correct value, e.g. trade licence number.">
        <textarea id="cr-reason" rows={3} className={`${inputClass} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      <p className="rounded-md bg-slate-50 px-3 py-2 text-[11.5px] leading-snug text-slate-600">
        When approved, the profile updates. Existing quotations, work orders and invoices keep the name, category and address they were issued under.
      </p>
    </CrmDialog>);

}