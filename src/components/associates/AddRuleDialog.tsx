import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { fromDhakaInput } from '../../utils/format';
import { RULE_KINDS, type RuleKind, type RuleMethod } from '../../types/associate';

const METHODS: RuleMethod[] = ['Percent of revenue', 'Fixed per settlement', 'Per subscriber'];

export function AddRuleDialog({ associateId, onClose }: {associateId?: string;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [scope, setScope] = useState(associateId ?? '');
  const [kind, setKind] = useState<RuleKind>('Discount');
  const [label, setLabel] = useState('');
  const [method, setMethod] = useState<RuleMethod>('Percent of revenue');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <CrmDialog
      title="Add settlement rule"
      description="Rules are effective-dated. A new open-ended rule of the same kind ends the previous one. Approved settlements keep the rules they were calculated with."
      onClose={onClose}
      submitLabel="Add rule"
      submitDisabled={label.trim().length < 3 || !value || !from}
      onSubmit={() =>
      runAction({ type: 'ASC_ADD_RULE', associateId: scope || undefined, kind, label, method, value: Number(value), effectiveFrom: fromDhakaInput(from, '00:00'), effectiveTo: to ? fromDhakaInput(to, '23:59') : undefined }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Applies to" htmlFor="ar-scope" className="sm:col-span-2">
          <select id="ar-scope" className={fieldInput} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">All associates</option>
            {db.associates.map((a) =>
            <option key={a.id} value={a.id}>
                {a.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Kind" htmlFor="ar-kind" required>
          <select id="ar-kind" className={fieldInput} value={kind} onChange={(e) => setKind(e.target.value as RuleKind)}>
            {RULE_KINDS.map((k) =>
            <option key={k}>{k}</option>
            )}
          </select>
        </FormField>
        <FormField label="Method" htmlFor="ar-method" required>
          <select id="ar-method" className={fieldInput} value={method} onChange={(e) => setMethod(e.target.value as RuleMethod)}>
            {METHODS.map((m) =>
            <option key={m}>{m}</option>
            )}
          </select>
        </FormField>
        <FormField label="Name" htmlFor="ar-label" required className="sm:col-span-2">
          <input id="ar-label" className={fieldInput} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Festival discount" />
        </FormField>
        <FormField label={method === 'Percent of revenue' ? 'Value (%)' : 'Value (BDT)'} htmlFor="ar-value" required>
          <input id="ar-value" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} />
        </FormField>
        <div />
        <FormField label="Effective from" htmlFor="ar-from" required>
          <input id="ar-from" type="date" className={fieldInput} value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
        <FormField label="Effective to" htmlFor="ar-to" help="Leave empty for open-ended.">
          <input id="ar-to" type="date" className={fieldInput} value={to} onChange={(e) => setTo(e.target.value)} />
        </FormField>
      </div>
    </CrmDialog>);

}