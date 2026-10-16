import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canRecordOps } from '../../utils/opsFinanceWorkflow';
import { periodLabel, recurringDue } from '../../utils/opsFinanceRules';
import { demoNow, formatBDT, formatDhakaDate } from '../../utils/format';
import { branchName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { AdminPanel, linkBtn, tdClass, thClass } from '../admin/AdminPanel';
import { NewOpsPaymentDialog } from './NewOpsPaymentDialog';
import type { RecurringPayment } from '../../types/approvals';

/** Reminders only — nothing is paid or recorded automatically. */
export function RecurringView() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [from, setFrom] = useState<{rule: RecurringPayment;period: string;} | null>(null);
  const due = recurringDue(db, demoNow());
  const can = canRecordOps(role.permissions);

  return (
    <div className="space-y-3">
      <AdminPanel title="Upcoming and overdue" description="Recurring payments with nothing recorded for the period. Reminders appear in notifications five days before the due date.">
        <ul className="divide-y divide-slate-100">
          {due.map((d) =>
          <li key={`${d.rule.id}-${d.period}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-slate-900">{d.rule.payee}</p>
                <p className="text-[11.5px] text-slate-500">{d.rule.category} · {branchName(d.rule.branchId)} · {periodLabel(d.period)} · due {formatDhakaDate(d.dueAt)}</p>
              </div>
              <span className="tabular-nums text-[12.5px] text-slate-800">{formatBDT(d.rule.amount)}</span>
              <StatusBadge status={d.daysLeft < 0 ? 'Overdue' : d.daysLeft <= 5 ? 'Due soon' : 'Scheduled'} />
              <span className="w-24 text-right text-[11.5px] text-slate-500">{d.daysLeft < 0 ? `${-d.daysLeft} days late` : d.daysLeft === 0 ? 'Today' : `in ${d.daysLeft} days`}</span>
              {can && <button type="button" className={linkBtn} onClick={() => setFrom({ rule: d.rule, period: d.period })}>Record</button>}
            </li>
          )}
          {!due.length && <li className="px-4 py-8 text-center text-[12px] text-slate-500">Nothing due in the next 20 days.</li>}
        </ul>
      </AdminPanel>
      <AdminPanel title="Recurring schedule">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>{['Payee', 'Category', 'Branch', 'Amount', 'Due day', 'Note', ''].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
            <tbody>
              {db.recurringPayments.map((r) =>
              <tr key={r.id} className={r.active ? '' : 'opacity-60'}>
                  <td className={tdClass}>{r.payee}</td>
                  <td className={tdClass}>{r.category}</td>
                  <td className={tdClass}>{branchName(r.branchId)}</td>
                  <td className={`${tdClass} tabular-nums`}>{formatBDT(r.amount)}</td>
                  <td className={`${tdClass} tabular-nums`}>{r.dueDay}</td>
                  <td className={`${tdClass} text-[11.5px]`}>{r.note ?? '—'}</td>
                  <td className={`${tdClass} text-right`}>
                    {can && <button type="button" className={linkBtn} onClick={() => runAction({ type: 'OPS_RECURRING_TOGGLE', id: r.id, active: !r.active })}>{r.active ? 'Pause' : 'Resume'}</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
      <AnimatePresence>{from && <NewOpsPaymentDialog key="n" from={from} onClose={() => setFrom(null)} />}</AnimatePresence>
    </div>);

}