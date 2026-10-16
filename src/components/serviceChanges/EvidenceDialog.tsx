import React, { useState } from 'react';
import { CameraIcon, PaperclipIcon, XIcon } from 'lucide-react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { FilePickButton } from '../field/FilePickButton';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import type { ServiceChange } from '../../types/records';

const TITLE: Record<ServiceChange['type'], string> = {
  Shifting: 'Record shift implementation',
  Upgrade: 'Record upgrade implementation',
  Downgrade: 'Record downgrade implementation',
  'Temporary Stop': 'Record temporary stop',
  Resumption: 'Verify resumption',
  Discontinuation: 'Record service stop'
};

const HELP: Record<ServiceChange['type'], string> = {
  Shifting: 'The connection moves to the destination site. A new site is added to the same customer profile; the old site stays in history.',
  Upgrade: 'Bandwidth is updated on the service. Billing still follows the approved effective date.',
  Downgrade: 'Bandwidth is updated on the service. Billing still follows the approved effective date.',
  'Temporary Stop': 'The service is marked temporarily stopped and a resumption reminder is set.',
  Resumption: 'Confirm the service is working again. The full rate resumes from the date you enter — never automatically.',
  Discontinuation: 'Marks the service as stopped. Billing ends on the approved date; clearances continue separately.'
};

export function EvidenceDialog({ change: s, onClose }: {change: ServiceChange;onClose: () => void;}) {
  const runAction = useRunAction();
  const [doneAt, setDoneAt] = useState(dhakaInputValue(demoNow().toISOString(), true));
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const add = (list: {name: string;}[]) => setFiles((f) => [...f, ...list.map((x) => x.name)]);

  return (
    <CrmDialog
      title={TITLE[s.type]}
      description={HELP[s.type]}
      onClose={onClose}
      submitLabel={s.type === 'Resumption' ? 'Confirm resumption' : 'Save evidence'}
      submitDisabled={notes.trim().length < 10 || !files.length}
      onSubmit={() => runAction({ type: 'SC_IMPLEMENT', id: s.id, doneAt: fromDhakaInput(doneAt), notes, files }) && onClose()}>
      
      <FormField label={s.type === 'Resumption' ? 'Verified working at' : 'Work done at'} htmlFor="ev-at" required>
        <input id="ev-at" type="datetime-local" className={fieldInput} value={doneAt} onChange={(e) => setDoneAt(e.target.value)} />
      </FormField>
      <FormField label={s.type === 'Resumption' ? 'Test results' : 'What was done'} htmlFor="ev-notes" required help="At least 10 characters.">
        <textarea id="ev-notes" rows={3} className={fieldTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Evidence<span className="ml-0.5 text-status-critical">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <FilePickButton label="Take photo" capture accept="image/*" onPick={add} icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden />} />
          <FilePickButton label="Attach file" multiple accept="image/*,.pdf" onPick={add} icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} />
        </div>
        {files.length > 0 &&
        <ul className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f, i) =>
          <li key={`${f}-${i}`} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-700">
                {f}
                <button type="button" aria-label={`Remove ${f}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700">
                  <XIcon className="h-3 w-3" />
                </button>
              </li>
          )}
          </ul>
        }
        <p className="mt-1 text-[11px] text-slate-500">Only file names are kept in this demo.</p>
      </div>
    </CrmDialog>);

}