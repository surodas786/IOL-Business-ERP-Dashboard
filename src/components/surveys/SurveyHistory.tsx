import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { AdminPanel } from '../admin/AdminPanel';
import { formatDhaka } from '../../utils/format';
import { sameRef } from '../../utils/relations';
import { canSeeMoney, redactAmounts } from '../../utils/customerProfile';
import type { Survey } from '../../types/records';

/** Audit trail for the survey, in Asia/Dhaka time. */
export function SurveyHistory({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { role } = useSession();
  const money = canSeeMoney(role);
  const events = db.auditEvents.filter((e) => sameRef(e.entity, { type: 'survey', id: s.id })).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <AdminPanel title="History" description={`${events.length} recorded events`}>
      <ol className="divide-y divide-slate-100">
        {events.length === 0 && <li className="px-4 py-8 text-center text-[12px] text-slate-500">No recorded events yet.</li>}
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
            </div>
          </li>
        )}
      </ol>
    </AdminPanel>);

}