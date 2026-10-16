import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { linkBtn } from '../admin/AdminPanel';
import { CommentDecisionDialog, type DecisionVerb } from './CommentDecisionDialog';

/** Approve / Return / Reject for one approval record, each with a mandatory comment. */
export function ApprovalButtons({ approvalId, disabled, disabledReason }: {approvalId: string;disabled?: boolean;disabledReason?: string;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [verb, setVerb] = useState<Exclude<DecisionVerb, 'Resubmitted'> | null>(null);
  const ap = db.approvals.find((a) => a.id === approvalId);
  if (!ap) return null;
  if (ap.status === 'Returned') return <span className="text-[11.5px] text-status-warning">Returned to requester</span>;
  return (
    <span className="inline-flex flex-wrap justify-end gap-3">
      <button type="button" className={`${linkBtn} text-status-critical hover:text-status-critical`} disabled={disabled} title={disabledReason} onClick={() => setVerb('Rejected')}>
        Reject
      </button>
      <button type="button" className={linkBtn} disabled={disabled} title={disabledReason} onClick={() => setVerb('Returned')}>
        Return
      </button>
      <button type="button" className={linkBtn} disabled={disabled} title={disabledReason} onClick={() => setVerb('Approved')}>
        Approve
      </button>
      <AnimatePresence>
        {verb && <CommentDecisionDialog key={verb} decision={verb} subject={ap.title} onSubmit={(comment) => runAction({ type: 'DECIDE_APPROVAL', approvalId, decision: verb, comment })} onClose={() => setVerb(null)} />}
      </AnimatePresence>
    </span>);

}