import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import type { InstallationJob } from '../../types/records';

/** Technical verification is separate from "Mark job done": approve (activates service) or return to the technician. */
export function VerifyDialog({ job, mode, onClose }: {job: InstallationJob;mode: 'verify' | 'return';onClose: () => void;}) {
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  const verify = mode === 'verify';
  const failed = job.completion?.tests.result === 'Fail';

  return (
    <CrmDialog
      title={verify ? `Verify ${job.id}` : `Return ${job.id} to ${job.technicianName}`}
      description={verify ? 'Confirms the installation meets the technical parameters and activates the service. Billing still waits for Accounts to review the approved rule.' : 'Sends the job back to In Progress with your reason.'}
      onClose={onClose}
      submitLabel={verify ? 'Verify and activate service' : 'Return job'}
      submitTone={verify ? 'primary' : 'danger'}
      submitDisabled={verify ? failed : note.trim().length < 10}
      onSubmit={() => runAction(verify ? { type: 'JOB_VERIFY', jobId: job.id, note } : { type: 'JOB_RETURN', jobId: job.id, reason: note }) && onClose()}>
      
      {verify && failed && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-status-critical">Tests were recorded as Fail. Return the job instead.</p>}
      <FormField label={verify ? 'Verification note (optional)' : 'Reason'} htmlFor="vf-note" required={!verify} help={verify ? undefined : 'At least 10 characters.'}>
        <textarea id="vf-note" rows={3} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}