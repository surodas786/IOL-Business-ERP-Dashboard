import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { BYPASS_MIN_JUSTIFICATION } from '../../utils/surveyWorkflow';
import { BYPASS_REASONS, type BypassReason } from '../../types/survey';
import type { Opportunity } from '../../types/records';

export function RequestBypassDialog({ opportunity: o, onClose }: {opportunity: Opportunity;onClose: () => void;}) {
  const runAction = useRunAction();
  const [reason, setReason] = useState<BypassReason>(BYPASS_REASONS[0]);
  const [justification, setJustification] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const short = justification.trim().length < BYPASS_MIN_JUSTIFICATION;

  return (
    <CrmDialog
      title="Request survey bypass"
      description="Skipping a survey needs a documented reason and Technical Supervisor approval. Until it is approved, a survey is still required."
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={short || documentRef.trim().length < 4}
      onSubmit={() => runAction({ type: 'SURVEY_REQUEST_BYPASS', opportunityId: o.id, reason, justification, documentRef }) && onClose()}>
      
      <FormField label="Reason" htmlFor="bp-reason" required>
        <select id="bp-reason" className={fieldInput} value={reason} onChange={(e) => setReason(e.target.value as BypassReason)}>
          {BYPASS_REASONS.map((r) =>
          <option key={r}>{r}</option>
          )}
        </select>
      </FormField>
      <FormField label="Justification" htmlFor="bp-just" required help={`${justification.trim().length}/${BYPASS_MIN_JUSTIFICATION} characters minimum. Explain why the existing information is enough.`}>
        <textarea id="bp-just" rows={4} className={fieldTextarea} value={justification} onChange={(e) => setJustification(e.target.value)} />
      </FormField>
      <FormField label="Supporting document" htmlFor="bp-doc" required help="e.g. earlier survey ID, building NOC or tender clause.">
        <input id="bp-doc" className={fieldInput} value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} />
      </FormField>
    </CrmDialog>);

}