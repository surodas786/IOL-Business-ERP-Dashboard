import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import type { InstallationJob } from '../../types/records';

export function NoteDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const [text, setText] = useState('');
  return (
    <CrmDialog title={`Work note — ${job.id}`} onClose={onClose} submitLabel="Add note" submitDisabled={!text.trim()} onSubmit={() => runAction({ type: 'JOB_ADD_NOTE', jobId: job.id, text }) && onClose()}>
      <FormField label="Note" htmlFor="nt-text" help="Bangla or English. Visible to the technical team.">
        <textarea id="nt-text" rows={4} className={fieldTextarea} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </FormField>
    </CrmDialog>);

}