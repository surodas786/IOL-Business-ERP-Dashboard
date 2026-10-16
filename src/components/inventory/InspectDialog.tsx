import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { itemOf } from '../../utils/inventoryRules';
import type { StockReturn } from '../../types/inventory';

export function InspectDialog({ ret: r, onClose }: {ret: StockReturn;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const item = itemOf(db, r.sku);
  const [outcomes, setOutcomes] = useState<Record<string, 'Good' | 'Damaged'>>({});
  const [good, setGood] = useState(String(r.quantity));
  const [notes, setNotes] = useState('');
  const serial = r.serials.length > 0;
  const g = serial ? r.serials.filter((s) => outcomes[s] === 'Good').length : Number(good) || 0;
  const damaged = r.quantity - g;
  const ready = serial ? r.serials.every((s) => outcomes[s]) : g >= 0 && g <= r.quantity;

  return (
    <CrmDialog
      title={`Inspect ${r.id}`}
      description={`${r.quantity} ${item?.unit ?? ''} ${item?.name ?? r.sku} from ${r.fromName}. Good items go back on hand at ${r.warehouse}; damaged items are recorded, not restocked.`}
      onClose={onClose}
      submitLabel="Complete inspection"
      submitDisabled={!ready || damaged > 0 && notes.trim().length < 10}
      onSubmit={() => runAction({ type: 'INV_INSPECT', returnId: r.id, outcomes, good: g, damaged, notes }) && onClose()}>
      
      {serial ?
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {r.serials.map((s) =>
        <li key={s} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="font-mono text-[12px] font-semibold text-slate-900">{s}</span>
              <div role="radiogroup" aria-label={`Outcome for ${s}`} className="flex gap-3 text-[12.5px]">
                {(['Good', 'Damaged'] as const).map((o) =>
            <label key={o} className="flex items-center gap-1.5">
                    <input type="radio" name={`o-${s}`} className="accent-primary" checked={outcomes[s] === o} onChange={() => setOutcomes({ ...outcomes, [s]: o })} />
                    {o === 'Good' ? 'Good — restock' : 'Damaged'}
                  </label>
            )}
              </div>
            </li>
        )}
        </ul> :

      <FormField label={`Good quantity (${item?.unit ?? ''})`} htmlFor="in-good" required help={`Damaged: ${damaged} ${item?.unit ?? ''}`}>
          <input id="in-good" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={good} onChange={(e) => setGood(String(Math.min(r.quantity, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
        </FormField>
      }
      <FormField label="Inspection notes" htmlFor="in-notes" required={damaged > 0} help={damaged > 0 ? 'Describe the damage (at least 10 characters).' : undefined}>
        <textarea id="in-notes" rows={2} className={fieldTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </CrmDialog>);

}