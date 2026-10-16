import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { ACK_METHODS, type AckMethod } from '../../types/installation';
import type { InstallationJob } from '../../types/records';

/** Records customer acceptance after the job was marked done without it. */
export function AcceptanceRecordDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const [name, setName] = useState('');
  const [method, setMethod] = useState<AckMethod>('Signed job sheet');
  const [at, setAt] = useState(dhakaInputValue(demoNow().toISOString(), true));

  return (
    <CrmDialog
      title={`Record customer acceptance — ${job.id}`}
      description="This date is kept separately from installation, verification and billing."
      onClose={onClose}
      submitLabel="Record acceptance"
      submitDisabled={!name.trim() || !at}
      onSubmit={() => runAction({ type: 'JOB_RECORD_ACCEPTANCE', jobId: job.id, name, method, at: fromDhakaInput(at) }) && onClose()}>
      
      <FormField label="Accepted by" htmlFor="ar-name" required>
        <input id="ar-name" className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Method" htmlFor="ar-m">
          <select id="ar-m" className={fieldInput} value={method} onChange={(e) => setMethod(e.target.value as AckMethod)}>
            {ACK_METHODS.map((m) =>
            <option key={m}>{m}</option>
            )}
          </select>
        </FormField>
        <FormField label="Accepted at (Asia/Dhaka)" htmlFor="ar-at" required>
          <input id="ar-at" type="datetime-local" className={fieldInput} value={at} onChange={(e) => setAt(e.target.value)} />
        </FormField>
      </div>
    </CrmDialog>);

}