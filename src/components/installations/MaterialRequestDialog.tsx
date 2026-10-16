import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import type { InstallationJob } from '../../types/records';
import type { JobMaterial, MaterialRequestKind } from '../../types/installation';

const HELP: Record<MaterialRequestKind, string> = {
  Reservation: 'Holds stock for this job. Physical stock is not reduced until it is issued.',
  Issue: 'Inventory issues the items to the technician. Stock on hand goes down when fulfilled.',
  Return: 'Unused items go back to the warehouse. Only issued, unconsumed quantities can be returned.'
};

const available = (kind: MaterialRequestKind, m: JobMaterial) =>
kind === 'Reservation' ? Math.max(0, m.planned - m.reserved - m.issued) : kind === 'Issue' ? Math.max(0, m.planned - m.issued) : Math.max(0, m.issued - m.consumed - m.returned);

export function MaterialRequestDialog({ job, kind, onClose }: {job: InstallationJob;kind: MaterialRequestKind;onClose: () => void;}) {
  const runAction = useRunAction();
  const lines = (job.materialLines ?? []).filter((m) => available(kind, m) > 0);
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((m) => [m.id, String(available(kind, m))])));
  const [note, setNote] = useState('');

  return (
    <CrmDialog
      title={`${kind === 'Return' ? 'Return unused material' : `Request ${kind.toLowerCase()}`} — ${job.id}`}
      description={HELP[kind]}
      onClose={onClose}
      submitLabel="Send to Inventory"
      submitDisabled={lines.length === 0}
      onSubmit={() => runAction({ type: 'JOB_REQUEST_MATERIALS', jobId: job.id, kind, lines: lines.map((m) => ({ materialId: m.id, quantity: Number(qty[m.id]) || 0 })), note }) && onClose()}>
      
      {lines.length === 0 ?
      <p className="text-[12.5px] text-slate-600">Nothing left to {kind.toLowerCase()} on this job.</p> :

      <ul className="space-y-2">
          {lines.map((m) =>
        <li key={m.id} className="grid grid-cols-[1fr_110px] items-center gap-3">
              <label htmlFor={`mr-${m.id}`} className="text-[13px] text-slate-800">
                {m.item}
                <span className="block text-[11px] text-slate-500">
                  up to {available(kind, m)} {m.unit}
                </span>
              </label>
              <input id={`mr-${m.id}`} inputMode="numeric" className={`${fieldInput} text-right tabular-nums`} value={qty[m.id] ?? ''} onChange={(e) => setQty({ ...qty, [m.id]: e.target.value.replace(/[^\d]/g, '') })} />
            </li>
        )}
        </ul>
      }
      <FormField label="Note for Inventory (optional)" htmlFor="mr-note">
        <input id="mr-note" className={fieldInput} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}