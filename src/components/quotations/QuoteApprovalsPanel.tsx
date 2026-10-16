import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useWorkItems } from '../../hooks/useWorkItems';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { ruleForApproval, approverNote } from '../../utils/approvalRules';
import { redactAmounts } from '../../utils/customerProfile';
import { seesCommission, seesQuoteMoney } from '../../utils/quoteRules';
import { StatusBadge } from '../records/StatusBadge';
import { WorkItemActions } from '../records/WorkItemActions';
import type { Quotation } from '../../types/records';

/** Approvals routed for the selected version, with who must decide and inline decisions for authorised roles. */
export function QuoteApprovalsPanel({ quotation: q, version }: {quotation: Quotation;version: number;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const { all } = useWorkItems();
  const list = db.approvals.filter((a) => a.entity.type === 'quotation' && a.entity.id === q.id && (a.quotationVersion ?? 1) === version && a.type !== 'Advance Exception');
  const exception = db.approvals.filter((a) => a.entity.type === 'quotation' && a.entity.id === q.id && a.type === 'Advance Exception');
  const rows = [...list, ...exception];
  const money = seesQuoteMoney(role);

  return (
    <section aria-label="Approvals" className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">Approvals for v{version}</h2>
        <p className="text-[11px] text-slate-500">Each condition goes to its configured authority. Agent commission terms go only to the Business Head (Sales Head).</p>
      </header>
      {rows.length === 0 ?
      <p className="px-4 py-4 text-[12px] text-slate-500">Nothing routed yet — the version is a draft.</p> :

      <ul className="divide-y divide-slate-100">
          {rows.map((a) => {
          const rule = ruleForApproval(db, a);
          const item = all.find((i) => i.id === `approval-${a.id}`);
          const hideComm = a.type === 'Agent Commission Terms' && !seesCommission(role);
          const detail = hideComm || !money ? redactAmounts(a.detail) : a.detail;
          return (
            <li key={a.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-slate-900">{a.type === 'Quotation' ? 'Commercial terms' : a.type}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-[11.5px] text-slate-600">{detail}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {a.status === 'Pending' ?
                `${rule ? approverNote(rule) : 'Awaiting approver'} · requested ${formatDhaka(a.requestedAt)}` :
                `${a.status} by ${userName(a.decidedById)}${a.decidedAt ? ` · ${formatDhaka(a.decidedAt)}` : ''}`}
                </p>
                {a.status === 'Pending' && item &&
              <div className="mt-1.5">
                    {a.requestedById === user.id ? <p className="text-[10.5px] italic text-slate-400">You requested this — another authorised approver must decide.</p> : <WorkItemActions item={item} />}
                  </div>
              }
              </li>);

        })}
        </ul>
      }
    </section>);

}