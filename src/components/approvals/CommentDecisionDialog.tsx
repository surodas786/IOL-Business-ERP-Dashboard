import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';

export type DecisionVerb = 'Approved' | 'Rejected' | 'Returned' | 'Resubmitted';

const COPY: Record<DecisionVerb, {title: string;label: string;submit: string;help: string;}> = {
  Approved: { title: 'Approve', label: 'Approval comment', submit: 'Approve', help: 'Why this is acceptable — kept in the decision history.' },
  Rejected: { title: 'Reject', label: 'Reason for rejection', submit: 'Reject', help: 'The requester sees this reason.' },
  Returned: { title: 'Return to requester', label: 'What is missing', submit: 'Return', help: 'Nothing changes on the linked record. The requester can resubmit.' },
  Resubmitted: { title: 'Resubmit', label: 'What changed', submit: 'Resubmit', help: 'Answer the approver’s question or describe the correction.' }
};

/** Every decision needs a comment of at least 10 characters. */
export function CommentDecisionDialog({ decision, subject, onSubmit, onClose }: {decision: DecisionVerb;subject: string;onSubmit: (comment: string) => boolean;onClose: () => void;}) {
  const [comment, setComment] = useState('');
  const c = COPY[decision];
  return (
    <CrmDialog
      title={`${c.title} — ${subject}`}
      onClose={onClose}
      submitLabel={c.submit}
      submitTone={decision === 'Rejected' ? 'danger' : 'primary'}
      submitDisabled={comment.trim().length < 10}
      onSubmit={() => onSubmit(comment) && onClose()}>
      
      <FormField label={c.label} htmlFor="cd-comment" required help={`${c.help} At least 10 characters.`}>
        <textarea id="cd-comment" rows={4} className={fieldTextarea} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
      </FormField>
    </CrmDialog>);

}