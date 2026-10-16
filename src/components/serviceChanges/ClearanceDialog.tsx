import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { ACCOUNTS_CHECKS, TECH_CHECKS } from '../../utils/serviceChangeRules';
import type { ServiceChange } from '../../types/records';

interface Props {
  change: ServiceChange;
  side: 'technical' | 'accounts';
  showAmounts: boolean;
  onClose: () => void;
}

export function ClearanceDialog({ change: s, side, showAmounts, onClose }: Props) {
  const runAction = useRunAction();
  const list = side === 'technical' ? TECH_CHECKS : ACCOUNTS_CHECKS;
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [charge, setCharge] = useState('');
  const all = list.every((c) => checks[c.key]);

  return (
    <CrmDialog
      title={side === 'technical' ? 'Technical clearance' : 'Accounts clearance'}
      description="Confirm every check. If one cannot be met, cancel and request an exception instead."
      onClose={onClose}
      submitLabel="Give clearance"
      submitDisabled={!all}
      onSubmit={() => runAction({ type: 'SC_CLEAR', id: s.id, side, checks, notes, recoveryCharge: charge ? Number(charge) : undefined }) && onClose()}>
      
      <fieldset className="space-y-2">
        <legend className="sr-only">Checks</legend>
        {list.map((c) =>
        <label key={c.key} className="flex items-start gap-2 text-[12.5px] text-slate-800">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={!!checks[c.key]} onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })} />
            {c.label}
          </label>
        )}
      </fieldset>
      {side === 'technical' && showAmounts &&
      <FormField label="Recovery charge for damage or loss (BDT, optional)" htmlFor="cl-charge">
          <input id="cl-charge" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={charge} onChange={(e) => setCharge(e.target.value.replace(/[^\d]/g, ''))} />
        </FormField>
      }
      <FormField label="Notes" htmlFor="cl-notes" help={side === 'technical' ? 'Serials retrieved, condition, anything left with the customer.' : 'Refund references and adjustments.'}>
        <textarea id="cl-notes" rows={3} className={fieldTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </CrmDialog>);

}