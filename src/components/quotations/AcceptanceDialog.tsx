import React, { useState } from 'react';
import { PaperclipIcon } from 'lucide-react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { FilePickButton } from '../field/FilePickButton';
import { fieldInput } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { ACCEPTANCE_METHODS, type AcceptanceMethod } from '../../types/quotation';

interface Props {
  quotationId: string;
  version: number;
  defaultContact?: string;
  onClose: () => void;
}

/** Records the customer's acceptance against one specific approved version. */
export function AcceptanceDialog({ quotationId, version, defaultContact = '', onClose }: Props) {
  const runAction = useRunAction();
  const [method, setMethod] = useState<AcceptanceMethod>('Signed quotation');
  const [reference, setReference] = useState('');
  const [by, setBy] = useState(defaultContact);
  const [when, setWhen] = useState(() => dhakaInputValue(demoNow().toISOString(), true));
  const [file, setFile] = useState<string>();
  const [touched, setTouched] = useState(false);
  const missing = !reference.trim() || !by.trim() || !when;

  return (
    <CrmDialog
      title={`Record customer acceptance — v${version}`}
      description="Acceptance applies only to this version. If the quotation is revised, acceptance must be recorded again."
      onClose={onClose}
      submitLabel="Record acceptance"
      onSubmit={() => {
        setTouched(true);
        if (missing) return;
        const ok = runAction({ type: 'QUOTE_RECORD_ACCEPTANCE', quotationId, method, reference, acceptedByName: by, acceptedAt: fromDhakaInput(when), fileName: file });
        if (ok) onClose();
      }}>
      
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Evidence type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACCEPTANCE_METHODS.map((m) =>
          <label key={m} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-[12.5px] font-semibold transition-colors duration-150 sm:h-9 ${method === m ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <input type="radio" name="acc-method" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
              {m}
            </label>
          )}
        </div>
      </fieldset>
      <FormField label={method === 'Purchase order' ? 'PO number' : method === 'Email confirmation' ? 'Email reference (sender, date, time)' : 'Signed copy reference'} htmlFor="acc-ref" required error={touched && !reference.trim() ? 'Required.' : undefined}>
        <input id="acc-ref" className={fieldInput} value={reference} onChange={(e) => setReference(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Accepted by (customer signatory)" htmlFor="acc-by" required error={touched && !by.trim() ? 'Required.' : undefined}>
          <input id="acc-by" className={fieldInput} value={by} onChange={(e) => setBy(e.target.value)} />
        </FormField>
        <FormField label="Accepted on (Asia/Dhaka)" htmlFor="acc-when" required>
          <input id="acc-when" type="datetime-local" className={fieldInput} value={when} onChange={(e) => setWhen(e.target.value)} />
        </FormField>
      </div>
      <div>
        <FilePickButton label={file ? 'Replace evidence file' : 'Attach evidence file'} accept=".pdf,image/*" onPick={(files) => setFile(files[0]?.name)} icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} />
        {file && <p className="mt-1 text-[11.5px] text-slate-600">{file} — only the file name is kept in this demo.</p>}
      </div>
    </CrmDialog>);

}