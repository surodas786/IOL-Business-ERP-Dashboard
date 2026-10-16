import React, { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { canOpenRecord } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { ENTITY_LABEL } from '../../utils/relations';
import { inputClass } from '../admin/FormField';
import { tdClass, thClass } from '../admin/AdminPanel';

const PAGE = 60;

/** Append-only demo activity history. Read-only here: no edit or delete exists anywhere in the app. */
export function ActivityHistory() {
  const { db } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const mineOnly = !role.permissions.includes('allBranches') && role.id !== 'management';

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.auditEvents.filter((e) => (!mineOnly || e.actorId === user.id) && (!term || `${e.actorName} ${e.action} ${e.summary} ${e.entity.id}`.toLowerCase().includes(term)));
  }, [db.auditEvents, q, mineOnly, user.id]);

  return (
    <div className="space-y-3">
      <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-800">
        <span className="font-semibold">Demo activity history.</span> Entries are only ever added, never edited or removed by the app — but they are stored in this browser and can be cleared with the demo reset or browser storage. This is not a production immutable audit log.
      </p>
      <div className="rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search activity</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input className={`${inputClass} pl-8`} placeholder="Search actor, action, record" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <span className="text-[11.5px] text-slate-500">
            {rows.length} entries{mineOnly ? ' · your own actions' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                {['When', 'Actor', 'Action', 'Record', 'Relevant changes'].map((h) =>
                <th key={h} className={thClass}>
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((e) =>
              <tr key={e.id}>
                  <td className={`${tdClass} whitespace-nowrap text-[11.5px]`}>{formatDhaka(e.at)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{e.actorName}</td>
                  <td className={tdClass}>
                    <span className="font-semibold text-slate-900">{e.action}</span>
                    <span className="block text-[11.5px] text-slate-500">{e.summary}</span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {canOpenRecord(db, e.entity, user, role) ?
                  <button type="button" className="text-[11.5px] font-semibold text-primary hover:text-primary-hover" onClick={() => openRecord(e.entity)}>
                        {ENTITY_LABEL[e.entity.type]} {e.entity.id}
                      </button> :

                  <span className="text-[11.5px] text-slate-500">
                        {ENTITY_LABEL[e.entity.type]} {e.entity.id}
                      </span>
                  }
                  </td>
                  <td className={`${tdClass} text-[11.5px]`}>
                    {e.changes?.length ?
                  <ul className="space-y-0.5">
                        {e.changes.map((c, i) =>
                    <li key={i}>
                            <span className="text-slate-500">{c.field}:</span> {c.from !== undefined && <span className="text-slate-500 line-through">{c.from}</span>} {c.from !== undefined && '→ '}
                            <span className="font-semibold text-slate-800">{c.to}</span>
                          </li>
                    )}
                      </ul> :

                  <span className="text-slate-400">—</span>
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > limit &&
        <div className="border-t border-slate-100 px-3 py-2 text-center">
            <button type="button" className="text-[12px] font-semibold text-primary hover:text-primary-hover" onClick={() => setLimit((l) => l + PAGE)}>
              Show older entries
            </button>
          </div>
        }
      </div>
    </div>);

}