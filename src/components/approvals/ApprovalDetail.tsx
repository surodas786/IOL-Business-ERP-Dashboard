import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ExternalLinkIcon, PaperclipIcon, ShieldCheckIcon, XIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useRunAction } from '../../hooks/useRunAction';
import { amountText, decideBlock, decisionAction, isOverdue, resubmitAction, showAmount, type CentreItem } from '../../utils/approvalCentre';
import { demoNow, formatDhaka } from '../../utils/format';
import { roleLabel, userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { CommentDecisionDialog, type DecisionVerb } from './CommentDecisionDialog';

/** Everything an approver needs on one panel: request, linked record, people, impact, evidence, actions and history. */
export function ApprovalDetail({ item, onClose }: {item: CentreItem;onClose: () => void;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const runAction = useRunAction();
  const [verb, setVerb] = useState<DecisionVerb | null>(null);
  const block = decideBlock(db, item, user, role);
  const canResubmit = item.status === 'Returned' && item.requestedById === user.id;
  const overdue = isOverdue(item, demoNow());

  const fact = (label: string, value: React.ReactNode) =>
  <div>
      <dt className="text-[10.5px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-slate-800">{value}</dd>
    </div>;


  return (
    <aside aria-label={`Approval ${item.id}`} className="flex h-full flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-mono">{item.id}</span> · {item.typeLabel}
            <StatusBadge status={item.status} />
            {overdue && <StatusBadge status="Overdue" />}
          </p>
          <h2 className="mt-1 text-[15px] font-bold leading-snug text-slate-900">{item.title}</h2>
          <p className="mt-0.5 text-[12px] text-slate-600">{item.detail}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700">
          <XIcon className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {fact(
            'Linked record',
            item.linkPath ?
            <Link to={item.linkPath} className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-hover">
                {item.linkedLabel} <ExternalLinkIcon className="h-3 w-3" aria-hidden />
              </Link> :

            <button type="button" className="font-semibold text-primary hover:text-primary-hover" onClick={() => openRecord(item.linked)}>
                {item.linkedLabel}
              </button>

          )}
          {fact('Assigned approver', item.approverLabel)}
          {fact('Submitted by', `${userName(item.requestedById)} · ${roleLabel(db.users.find((u) => u.id === item.requestedById)?.role ?? 'management')}`)}
          {fact('Submitted', `${formatDhaka(item.requestedAt)}${overdue ? ` · past ${item.slaHours} h target` : ''}`)}
          {fact('Amount', <span className={showAmount(item, role) ? 'font-semibold tabular-nums' : 'text-slate-400'}>{amountText(item, role)}</span>)}
          {fact('Category', item.category)}
        </dl>

        <section>
          <h3 className="text-[11.5px] font-semibold text-slate-500">Business and financial impact</h3>
          <p className="mt-1 text-[12.5px] text-slate-800">{showAmount(item, role) || item.amount === undefined ? item.impact : 'Financial impact is restricted for your role.'}</p>
          {item.note && <p className="mt-1 text-[11.5px] text-slate-500">{item.note}</p>}
        </section>

        <section>
          <h3 className="text-[11.5px] font-semibold text-slate-500">Supporting evidence</h3>
          {item.evidence.length ?
          <ul className="mt-1 space-y-1">
              {item.evidence.map((e, i) =>
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-700">
                  <PaperclipIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  {e}
                </li>
            )}
            </ul> :

          <p className="mt-1 text-[12px] text-status-warning">No evidence attached.</p>
          }
        </section>

        {item.returnedComment && item.status === 'Returned' &&
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-slate-800">
            <span className="font-semibold">Returned for more information:</span> {item.returnedComment}
          </p>
        }

        {item.ruleSnapshot &&
        <p className="flex items-start gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-[11.5px] text-slate-600">
            <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            Decided under “{item.ruleSnapshot.name}” ({item.ruleSnapshot.condition}, {item.ruleSnapshot.approverRoles.map(roleLabel).join(' or ')}) as of {formatDhaka(item.ruleSnapshot.capturedAt)}. Later rule changes do not alter this decision.
          </p>
        }

        <section>
          <h3 className="text-[11.5px] font-semibold text-slate-500">Decision history</h3>
          <ol className="mt-1.5 space-y-2 border-l border-slate-200 pl-3">
            {item.history.map((h, i) =>
            <li key={i} className="text-[12px]">
                <p>
                  <span className="font-semibold text-slate-900">{h.action}</span> <span className="text-slate-500">· {userName(h.byId)} · {formatDhaka(h.at)}</span>
                </p>
                <p className="text-slate-700">{h.comment}</p>
              </li>
            )}
          </ol>
        </section>
      </div>

      <footer className="border-t border-slate-100 px-4 py-3">
        {item.status === 'Pending' && !block &&
        <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={`${secondaryBtn} text-status-critical`} onClick={() => setVerb('Rejected')}>
              Reject
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setVerb('Returned')}>
              Return
            </button>
            <button type="button" className={primaryBtn} onClick={() => setVerb('Approved')}>
              Approve
            </button>
          </div>
        }
        {canResubmit &&
        <div className="flex justify-end">
            <button type="button" className={primaryBtn} onClick={() => setVerb('Resubmitted')}>
              Resubmit
            </button>
          </div>
        }
        {block && !canResubmit && <p className="text-[11.5px] text-slate-500">{block}</p>}
      </footer>

      <AnimatePresence>
        {verb &&
        <CommentDecisionDialog
          key={verb}
          decision={verb}
          subject={item.id}
          onSubmit={(c) => runAction(verb === 'Resubmitted' ? resubmitAction(item, c) : decisionAction(item, verb, c))}
          onClose={() => setVerb(null)} />

        }
      </AnimatePresence>
    </aside>);

}