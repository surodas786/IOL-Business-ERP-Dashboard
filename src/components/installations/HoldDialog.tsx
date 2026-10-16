import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { dhakaDayAt, dhakaInputValue, demoNow, fromDhakaInput } from '../../utils/format';
import { HOLD_PARTIES, type HoldParty } from '../../types/installation';
import type { InstallationJob } from '../../types/records';

/** Hold with reason, responsible party and next review date — or lift an existing hold. */
export function HoldDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const lifting = job.status === 'On Hold';
  const [reason, setReason] = useState('');
  const [party, setParty] = useState<HoldParty>('Customer');
  const [review, setReview] = useState(dhakaInputValue(dhakaDayAt(demoNow(), 2, '10:00')));
  const [touched, setTouched] = useState(false);
  const short = reason.trim().length < 10;

  if (lifting) {
    return (
      <CrmDialog
        title={`Lift hold on ${job.id}`}
        description={`Returns the job to ${job.hold?.resumeTo}. The hold stays in the job history.`}
        onClose={onClose}
        submitLabel="Lift hold"
        onSubmit={() => runAction({ type: 'JOB_RESUME', jobId: job.id, note: reason }) && onClose()}>
        
        <FormField label="What changed? (optional)" htmlFor="hd-note">
          <textarea id="hd-note" rows={2} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </CrmDialog>);

  }

  return (
    <CrmDialog
      title={`Put ${job.id} on hold`}
      description="The Account Manager and supervisors are notified. Review the hold by the date you set."
      onClose={onClose}
      submitLabel="Put on hold"
      submitTone="danger"
      onSubmit={() => {
        setTouched(true);
        if (!short && runAction({ type: 'JOB_HOLD', jobId: job.id, reason, party, nextReviewAt: fromDhakaInput(review, '10:00') })) onClose();
      }}>
      
      <FormField label="Reason" htmlFor="hd-reason" required error={touched && short ? 'At least 10 characters.' : undefined}>
        <textarea id="hd-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. NTTN splice pending at Agrabad FDB / অপেক্ষমাণ" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Responsible party" htmlFor="hd-party" required>
          <select id="hd-party" className={fieldInput} value={party} onChange={(e) => setParty(e.target.value as HoldParty)}>
            {HOLD_PARTIES.map((p) =>
            <option key={p}>{p}</option>
            )}
          </select>
        </FormField>
        <FormField label="Next review date" htmlFor="hd-review" required>
          <input id="hd-review" type="date" className={fieldInput} value={review} onChange={(e) => setReview(e.target.value)} />
        </FormField>
      </div>
    </CrmDialog>);

}