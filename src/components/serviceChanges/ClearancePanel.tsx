import React from 'react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { accountBalances, existingRecurring, periodKeyOf, periodLabel } from '../../utils/billingCalc';
import { ACCOUNTS_CHECKS, TECH_CHECKS, closureGaps } from '../../utils/serviceChangeRules';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { ServiceChange } from '../../types/records';
import type { ClearanceTask } from '../../types/serviceChange';

function Side({ title, task, checks, showAmounts, children }: {title: string;task: ClearanceTask;checks: {key: string;label: string;}[];showAmounts: boolean;children?: React.ReactNode;}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[12.5px] font-bold text-slate-800">{title}</h3>
        <StatusBadge status={task.status} />
      </div>
      <ul className="space-y-1">
        {checks.map((c) => {
          const ok = !!task.checks[c.key];
          return (
            <li key={c.key} className="flex items-start gap-2 text-[12px]">
              {ok ? <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-ok" aria-label="Confirmed" /> : <MinusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" aria-label="Not confirmed" />}
              <span className={ok ? 'text-slate-800' : 'text-slate-500'}>{c.label}</span>
            </li>);

        })}
      </ul>
      {children}
      {task.exceptionReason && <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[11.5px] text-slate-700">Exception: {task.exceptionReason}</p>}
      {task.notes && <p className="mt-2 text-[11.5px] italic text-slate-500">“{task.notes}”</p>}
      {showAmounts && task.recoveryCharge ? <p className="mt-1 text-[11.5px] text-slate-700">Recovery charge for damage or loss: {formatBDT(task.recoveryCharge)}</p> : null}
      {task.byId && <p className="mt-1 text-[11px] text-slate-500">{userName(task.byId)} · {formatDhaka(task.at!)}</p>}
    </div>);

}

/** Parallel Technical and Accounts clearance for a discontinuation. */
export function ClearancePanel({ change: s, showAmounts }: {change: ServiceChange;showAmounts: boolean;}) {
  const { db } = useData();
  if (!s.clearances) return null;
  const conn = db.connections.find((c) => c.id === s.connectionId)!;
  const b = accountBalances(db, conn.billingAccountId);
  const pk = periodKeyOf(s.effectiveDate!);
  const finalInv = existingRecurring(db, conn.id, pk);
  const gaps = closureGaps(s);

  return (
    <AdminPanel
      title="Clearance"
      description={s.status === 'Closed' ? 'Both clearances complete; administratively closed.' : gaps.length ? `Closure blocked — ${gaps.join(' · ')}` : 'Both clearances complete — ready for administrative closure.'}>
      
      <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <Side title="Technical" task={s.clearances.technical} checks={TECH_CHECKS} showAmounts={showAmounts}>
          <p className="mt-2 text-[11.5px] text-slate-500">Equipment on site: {conn.cpe ?? '—'}{conn.onuSerial ? ` · ONT ${conn.onuSerial}` : ''}</p>
        </Side>
        <Side title="Accounts" task={s.clearances.accounts} checks={ACCOUNTS_CHECKS} showAmounts={showAmounts}>
          {showAmounts &&
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded bg-slate-50 px-2.5 py-2 text-[11.5px]">
              <dt className="text-slate-500">Final invoice ({periodLabel(pk)})</dt>
              <dd className={finalInv ? 'text-slate-800' : 'font-semibold text-status-warning'}>{finalInv ? finalInv.id : 'Not posted yet'}</dd>
              <dt className="text-slate-500">Due</dt>
              <dd className={b.due > 0 ? 'font-semibold text-status-critical' : 'text-slate-800'}>{formatBDT(b.due)}</dd>
              <dt className="text-slate-500">Unallocated advance</dt>
              <dd className="text-slate-800">{formatBDT(b.advance)}</dd>
              <dt className="text-slate-500">Security deposit</dt>
              <dd className="text-slate-800">{formatBDT(b.deposit)}</dd>
            </dl>
          }
        </Side>
      </div>
    </AdminPanel>);

}