import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { MIN_REASON } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { MaterialLines, type MaterialDraft } from './MaterialLines';
import { CONFIRMATION_STATUSES, type ConfirmationStatus } from '../../types/ticket';
import type { Ticket } from '../../types/records';

/** Resolution needs description, work performed, materials (or none), timestamp and confirmation status. */
export function ResolveDialog({ ticket: t, onClose }: {ticket: Ticket;onClose: () => void;}) {
  const runAction = useRunAction();
  const [description, setDescription] = useState('');
  const [work, setWork] = useState('');
  const [none, setNone] = useState(false);
  const [lines, setLines] = useState<MaterialDraft[]>([]);
  const [at, setAt] = useState(dhakaInputValue(demoNow().toISOString(), true));
  const [confirmation, setConfirmation] = useState<ConfirmationStatus>('Confirmed by customer');
  const [confirmedBy, setConfirmedBy] = useState(t.callerName ?? '');
  const [note, setNote] = useState('');

  const linesOk = lines.every((l) => l.sku && (l.serials.length > 0 || Number(l.quantity) > 0));
  const ready =
  description.trim().length >= MIN_REASON &&
  work.trim().length >= MIN_REASON && (
  none || lines.length > 0 && linesOk) &&
  !!at && (
  confirmation !== 'Confirmed by customer' || confirmedBy.trim().length >= 3) && (
  confirmation !== 'Customer unreachable' || note.trim().length >= MIN_REASON);

  const submit = () =>
  runAction({
    type: 'TKT_RESOLVE',
    ticketId: t.id,
    input: {
      description, workPerformed: work, noMaterials: none, resolvedAt: fromDhakaInput(at), confirmation, confirmedBy: confirmation === 'Confirmed by customer' ? confirmedBy : '', confirmationNote: note,
      materials: none ? [] : lines.map((l) => ({ sku: l.sku, source: l.source, serials: l.serials, quantity: l.serials.length || Number(l.quantity) }))
    }
  }) && onClose();

  return (
    <CrmDialog size="lg" title={`Resolve ${t.id}`} description="Materials are posted to inventory against this ticket, the customer and the service." onClose={onClose} submitLabel="Resolve ticket" submitDisabled={!ready} onSubmit={submit}>
      <FormField label="Resolution description" htmlFor="rs-d" required help="Cause found and how it was fixed.">
        <textarea id="rs-d" rows={2} className={fieldTextarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <FormField label="Work performed" htmlFor="rs-w" required help="Steps taken, readings and tests.">
        <textarea id="rs-w" rows={3} className={fieldTextarea} value={work} onChange={(e) => setWork(e.target.value)} />
      </FormField>
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Materials used<span className="ml-0.5 text-status-critical">*</span>
        </legend>
        <label className="mb-2 flex items-center gap-2 text-[12px] text-slate-700">
          <input type="checkbox" className="accent-primary" checked={none} onChange={(e) => setNone(e.target.checked)} /> No materials used
        </label>
        {!none && <MaterialLines ticket={t} lines={lines} onChange={setLines} />}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Resolved at" htmlFor="rs-at" required>
          <input id="rs-at" type="datetime-local" className={fieldInput} value={at} onChange={(e) => setAt(e.target.value)} />
        </FormField>
        <FormField label="Customer confirmation" htmlFor="rs-c" required>
          <select id="rs-c" className={fieldInput} value={confirmation} onChange={(e) => setConfirmation(e.target.value as ConfirmationStatus)}>
            {CONFIRMATION_STATUSES.filter((c) => c !== 'Customer disputes').map((c) =>
            <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
      </div>
      {confirmation === 'Confirmed by customer' &&
      <FormField label="Confirmed by" htmlFor="rs-by" required help="Name and role on the customer side.">
          <input id="rs-by" className={fieldInput} value={confirmedBy} onChange={(e) => setConfirmedBy(e.target.value)} />
        </FormField>
      }
      {confirmation !== 'Confirmed by customer' &&
      <FormField label={confirmation === 'Customer unreachable' ? 'Contact attempts' : 'Note'} htmlFor="rs-n" required={confirmation === 'Customer unreachable'} help={confirmation === 'Confirmation pending' ? 'The ticket cannot be closed until confirmation is recorded.' : undefined}>
          <textarea id="rs-n" rows={2} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      }
    </CrmDialog>);

}