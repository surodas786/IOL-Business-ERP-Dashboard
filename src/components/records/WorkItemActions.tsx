import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { hasPermission } from '../../utils/access';
import { CommentDecisionDialog } from '../approvals/CommentDecisionDialog';
import type { WorkActionDef, WorkItem } from '../../utils/workItems';

interface WorkItemActionsProps {
  item: WorkItem;
  size?: 'sm' | 'md';
}

/** Action buttons the active role may use on a work item, or a note on who must act. Approval decisions ask for a comment first. */
export function WorkItemActions({ item, size = 'sm' }: WorkItemActionsProps) {
  const { role } = useSession();
  const runAction = useRunAction();
  const [pending, setPending] = useState<WorkActionDef | null>(null);
  const allowed = item.actions.filter((a) => hasPermission(role, a.permission) && (!a.roles || a.roles.includes(role.id)));

  if (allowed.length === 0) {
    return item.blockedNote ? <p className="text-[10.5px] italic text-slate-400">{item.blockedNote}</p> : null;
  }

  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]';
  const click = (a: WorkActionDef) => a.action.type === 'DECIDE_APPROVAL' ? setPending(a) : runAction(a.action);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowed.map((a) =>
      <button
        key={a.label}
        type="button"
        disabled={!!a.disabledReason}
        title={a.disabledReason}
        onClick={() => click(a)}
        className={`rounded-md font-semibold transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${pad} ${
        a.variant === 'secondary' ?
        'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300' :
        'bg-primary text-white hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400'}`
        }>
        
          {a.label}
        </button>
      )}
      {allowed.
      filter((a) => a.disabledReason).
      map((a) =>
      <span key={`${a.label}-reason`} className="text-[10.5px] text-slate-400">
            {a.disabledReason}
          </span>
      )}
      <AnimatePresence>
        {pending && pending.action.type === 'DECIDE_APPROVAL' &&
        <CommentDecisionDialog
          key="cd"
          decision={pending.action.decision}
          subject={item.title}
          onSubmit={(comment) => runAction({ ...(pending.action as Extract<WorkActionDef['action'], {type: 'DECIDE_APPROVAL';}>), comment })}
          onClose={() => setPending(null)} />

        }
      </AnimatePresence>
    </div>);

}