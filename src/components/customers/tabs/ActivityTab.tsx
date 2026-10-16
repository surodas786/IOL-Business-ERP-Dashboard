import React, { useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { formatDhaka } from '../../../utils/format';
import { canSeeMoney, customerRefs, redactAmounts } from '../../../utils/customerProfile';
import type { Customer } from '../../../types/records';

/** Audit trail for the customer and every record linked to it, in Asia/Dhaka time. */
export function ActivityTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const money = canSeeMoney(role);

  const events = useMemo(() => {
    const keys = new Set(customerRefs(db, c).map((r) => `${r.type}:${r.id}`));
    return db.auditEvents.filter((e) => keys.has(`${e.entity.type}:${e.entity.id}`) || e.related.some((r) => keys.has(`${r.type}:${r.id}`))).sort((a, b) => b.at.localeCompare(a.at));
  }, [db, c]);

  return (
    <AdminPanel title="Activity history" description={`${events.length} events across this customer’s records${money ? '' : ' · amounts hidden for your role'}`}>
      <ol className="divide-y divide-slate-100">
        {events.length === 0 && <li className="px-4 py-8 text-center text-[12px] text-slate-500">No recorded activity yet.</li>}
        {events.map((e) =>
        <li key={e.id} className="flex gap-3 px-4 py-2.5">
            <time dateTime={e.at} className="w-[120px] shrink-0 text-[11px] tabular-nums text-slate-500">
              {formatDhaka(e.at, { year: true })}
            </time>
            <div className="min-w-0">
              <p className="text-[12.5px] text-slate-900">
                <span className="font-semibold">{e.action}</span>
                <span className="text-slate-500"> · {e.actorName}</span>
              </p>
              <p className="text-[12px] text-slate-600">{money ? e.summary : redactAmounts(e.summary)}</p>
              <button type="button" onClick={() => openRecord(e.entity)} className="mt-0.5 text-[11px] font-semibold text-primary hover:text-primary-hover">
                {e.entity.id}
              </button>
            </div>
          </li>
        )}
      </ol>
    </AdminPanel>);

}