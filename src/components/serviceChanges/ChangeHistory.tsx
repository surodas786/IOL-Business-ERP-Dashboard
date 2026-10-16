import React from 'react';
import { useData } from '../../contexts/DataContext';
import { formatDhaka } from '../../utils/format';
import { sameRef } from '../../utils/relations';
import { AdminPanel } from '../admin/AdminPanel';
import type { ServiceChange } from '../../types/records';

/** Audit trail for one change, plus its implementation evidence. Amount-bearing entries are hidden from roles without financial access. */
export function ChangeHistory({ change: s, showAmounts }: {change: ServiceChange;showAmounts: boolean;}) {
  const { db } = useData();
  const ref = { type: 'serviceChange' as const, id: s.id };
  const events = db.auditEvents.
  filter((e) => sameRef(e.entity, ref) || e.related.some((r) => sameRef(r, ref))).
  filter((e) => showAmounts || !/৳|BDT|payback/i.test(e.summary));

  return (
    <AdminPanel title="Evidence and history" description="Service history and earlier invoices are never altered by a change.">
      {s.evidence &&
      <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-[12px] font-bold text-slate-800">Implementation evidence</h3>
          <p className="mt-1 text-[12.5px] text-slate-700">{s.evidence.notes}</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Done {formatDhaka(s.evidence.doneAt, { year: true })} · files: {s.evidence.files.join(', ')}
          </p>
        </div>
      }
      <ol className="px-4 py-2">
        {events.map((e) =>
        <li key={e.id} className="grid grid-cols-[110px_1fr] gap-3 border-b border-slate-100 py-2 text-[12px] last:border-b-0">
            <span className="text-[11px] text-slate-500">{formatDhaka(e.at)}</span>
            <span>
              <span className="font-semibold text-slate-800">{e.action}</span> <span className="text-slate-500">· {e.actorName}</span>
              <span className="block text-slate-600">{e.summary}</span>
            </span>
          </li>
        )}
        {events.length === 0 && <li className="py-2 text-[12px] text-slate-500">Seeded record — earlier steps are shown in the panels above.</li>}
      </ol>
    </AdminPanel>);

}