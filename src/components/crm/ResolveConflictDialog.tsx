import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { userName } from '../../utils/relations';
import { FormField, inputClass } from '../admin/FormField';
import { CrmDialog } from './CrmDialog';
import type { ConflictResolution, CrmConflict } from '../../types/crm';

interface Option {
  id: ConflictResolution;
  label: string;
  help: string;
}

export function ResolveConflictDialog({ conflict, onClose }: {conflict: CrmConflict;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const o = db.opportunities.find((x) => x.id === conflict.opportunityId)!;
  const mergeTargets = conflict.matches.filter((m) => m.type === 'opportunity' && m.id !== o.id);
  const customers = conflict.matches.filter((m) => m.type === 'customer');

  const options: Option[] = useMemo(() => {
    if (conflict.kind === 'Assignment conflict')
    return [
    { id: 'Kept with current owner', label: `Keep with ${userName(o.ownerId)}`, help: 'The current owner continues; the request is closed.' },
    { id: 'Reassigned', label: `Reassign to ${userName(conflict.requestedById)}`, help: 'Ownership moves; the change is kept in ownership history.' }];

    const list: Option[] = [{ id: 'Not a duplicate', label: 'Not a duplicate', help: 'Both records stay separate and active.' }];
    if (mergeTargets.length) list.push({ id: 'Merged', label: 'Merge into the existing opportunity', help: 'Communications and attachments move across; this record is closed as merged.' });
    if (customers.length) list.push({ id: 'Linked as additional site/service', label: 'Link to the existing customer', help: 'Keeps this opportunity as an additional site or service under that customer.' });
    return list;
  }, [conflict, o.ownerId, mergeTargets.length, customers.length]);

  const [resolution, setResolution] = useState<ConflictResolution>(options[0].id);
  const [target, setTarget] = useState(mergeTargets[0]?.id ?? '');
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [note, setNote] = useState('');

  const submit = () => {
    const okRun = runAction({ type: 'CRM_RESOLVE_CONFLICT', conflictId: conflict.id, resolution, note, mergeIntoId: target, customerId });
    if (okRun) onClose();
  };

  return (
    <CrmDialog title={`Resolve ${conflict.id}`} description={`${conflict.kind} · ${o.title}`} onClose={onClose} onSubmit={submit} submitLabel="Record decision" submitDisabled={note.trim().length < 8}>
      <fieldset>
        <legend className="mb-2 text-[12px] font-semibold text-slate-700">Decision</legend>
        <div className="space-y-2">
          {options.map((op) =>
          <label key={op.id} className={`block cursor-pointer rounded-md border px-3 py-2 transition-colors duration-150 ${resolution === op.id ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="resolution" className="sr-only" checked={resolution === op.id} onChange={() => setResolution(op.id)} />
              <span className="block text-[12.5px] font-semibold text-slate-900">{op.label}</span>
              <span className="block text-[11px] text-slate-500">{op.help}</span>
            </label>
          )}
        </div>
      </fieldset>
      {resolution === 'Merged' &&
      <FormField label="Merge into" htmlFor="merge-into">
          <select id="merge-into" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
            {mergeTargets.map((m) => {
            const t = db.opportunities.find((x) => x.id === m.id);
            return (
              <option key={m.id} value={m.id}>
                  {m.id} · {t?.title} · {userName(t?.ownerId)}
                </option>);

          })}
          </select>
        </FormField>
      }
      {resolution === 'Linked as additional site/service' &&
      <FormField label="Existing customer" htmlFor="link-customer">
          <select id="link-customer" className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((m) =>
          <option key={m.id} value={m.id}>
                {m.id} · {db.customers.find((c) => c.id === m.id)?.name}
              </option>
          )}
          </select>
        </FormField>
      }
      <FormField label="Reason for the decision" htmlFor="resolve-note" required help="Recorded in the audit history and on both records.">
        <textarea id="resolve-note" rows={3} className={`${inputClass} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}