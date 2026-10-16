import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { inUserScope } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { branchName, userName } from '../../utils/relations';
import { canSuperviseSurveys } from '../../utils/surveyRules';
import { AdminPanel, primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { StatusBadge } from '../records/StatusBadge';
import type { SurveyBypass } from '../../types/survey';

/** Documented, approved exceptions to the survey requirement. */
export function BypassRequests() {
  const { db } = useData();
  const { user } = useSession();
  const list = db.surveyBypasses.filter((b) => inUserScope(user, b.branchId)).sort((a, b) => Number(b.status === 'Pending') - Number(a.status === 'Pending') || b.requestedAt.localeCompare(a.requestedAt));
  return (
    <AdminPanel title="Survey bypass requests" description="A survey can be skipped only with a documented justification, a supporting document and Technical Supervisor approval. The requester can’t approve their own request.">
      <ul className="divide-y divide-slate-100">
        {list.length === 0 && <li className="px-4 py-8 text-center text-[12.5px] text-slate-500">No bypass requests.</li>}
        {list.map((b) =>
        <BypassRow key={b.id} bypass={b} />
        )}
      </ul>
    </AdminPanel>);

}

function BypassRow({ bypass: b }: {bypass: SurveyBypass;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  const opp = db.opportunities.find((o) => o.id === b.opportunityId);
  const canDecide = b.status === 'Pending' && canSuperviseSurveys(role) && b.requestedById !== user.id;

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {role.modules.includes('crm') && opp ?
        <Link to={`/sales-crm/opportunities/${opp.id}`} className="text-[13px] font-semibold text-slate-900 hover:text-primary">
            {opp.title}
          </Link> :

        <span className="text-[13px] font-semibold text-slate-900">{opp?.title ?? b.opportunityId}</span>
        }
        <StatusBadge status={b.status} />
        <span className="text-[11px] text-slate-400">
          {b.id} · {branchName(b.branchId)}
        </span>
      </div>
      <p className="mt-1 text-[12px] font-semibold text-slate-700">{b.reason}</p>
      <p className="mt-0.5 text-[12.5px] text-slate-700">{b.justification}</p>
      <p className="mt-1 text-[11.5px] text-slate-600">
        <span className="text-slate-400">Supporting document:</span> {b.documentRef}
      </p>
      <p className="mt-0.5 text-[10.5px] text-slate-400">
        Requested by {userName(b.requestedById)} · {formatDhaka(b.requestedAt, { year: true })}
        {b.decidedById && ` · ${b.status} by ${userName(b.decidedById)}${b.decidedAt ? ` · ${formatDhaka(b.decidedAt)}` : ''}${b.decisionNote ? ` — ${b.decisionNote}` : ''}`}
      </p>
      {b.status === 'Pending' && !canDecide && <p className="mt-1.5 text-[11px] italic text-slate-500">{b.requestedById === user.id ? 'Your request — awaiting the Technical Supervisor.' : 'Awaiting Technical Supervisor approval.'}</p>}
      {canDecide &&
      <div className="mt-2 flex flex-wrap items-center gap-2">
          <input aria-label="Decision note" className={`${inputClass} h-8 min-w-[220px] flex-1 text-[12px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to reject)" />
          <button type="button" className={primaryBtn} disabled={note.trim().length < 10} title="A comment of at least 10 characters is required" onClick={() => runAction({ type: 'SURVEY_DECIDE_BYPASS', bypassId: b.id, decision: 'Approved', note })}>
            Approve bypass
          </button>
          <button type="button" className={secondaryBtn} disabled={note.trim().length < 10} onClick={() => runAction({ type: 'SURVEY_DECIDE_BYPASS', bypassId: b.id, decision: 'Rejected', note })}>
            Reject — survey required
          </button>
        </div>
      }
    </li>);

}