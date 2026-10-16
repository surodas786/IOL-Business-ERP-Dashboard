import React, { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { formatDhaka } from '../../../utils/format';
import { ADMIN_ENTITY_TYPES, ENTITY_LABEL } from '../../../utils/relations';
import { AdminPanel, tdClass, thClass } from '../AdminPanel';
import { inputClass } from '../FormField';

type Filter = 'all' | 'admin' | 'operational';

export function AuditSection() {
  const { db } = useData();
  const { openRecord } = useRecordDrawer();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...db.auditEvents].
    sort((a, b) => b.at.localeCompare(a.at)).
    filter((e) => {
      const isAdmin = ADMIN_ENTITY_TYPES.includes(e.entity.type);
      if (filter === 'admin' && !isAdmin) return false;
      if (filter === 'operational' && isAdmin) return false;
      return !q || [e.actorName, e.action, e.summary, e.entity.id].some((v) => v.toLowerCase().includes(q));
    });
  }, [db.auditEvents, filter, query]);

  return (
    <AdminPanel title="Audit history" description="Append-only record of every change in the demo, newest first. Entries are never edited or removed except by “Reset demo data”.">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search audit history" className={`${inputClass} h-8 pl-8 text-[12px]`} placeholder="Actor, action, record ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div role="group" aria-label="Event type" className="flex rounded-md border border-slate-200 p-0.5">
          {([['all', 'All'], ['admin', 'Administration'], ['operational', 'Operational']] as const).map(([id, label]) =>
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`whitespace-nowrap rounded px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${filter === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            
              {label}
            </button>
          )}
        </div>
        <span className="ml-auto text-[11px] text-slate-500">{events.length} entries</span>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full min-w-[860px]">
          <thead className="sticky top-0">
            <tr>
              <th className={thClass}>Time (Asia/Dhaka)</th>
              <th className={thClass}>Actor</th>
              <th className={thClass}>Action</th>
              <th className={thClass}>Record</th>
              <th className={thClass}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const isAdmin = ADMIN_ENTITY_TYPES.includes(e.entity.type);
              return (
                <tr key={e.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDhaka(e.at, { year: true })}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{e.actorName}</td>
                  <td className={`${tdClass} whitespace-nowrap font-semibold text-slate-900`}>{e.action}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {isAdmin ?
                    <span className="text-[11px] text-slate-500">
                        {ENTITY_LABEL[e.entity.type]} · <span className="font-mono">{e.entity.id}</span>
                      </span> :

                    <button type="button" onClick={() => openRecord(e.entity)} className="font-mono text-[11px] font-semibold text-primary hover:text-primary-hover">
                        {e.entity.id}
                      </button>
                    }
                  </td>
                  <td className={`${tdClass} text-[11.5px]`}>{e.summary}</td>
                </tr>);

            })}
            {events.length === 0 &&
            <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-500">No entries match.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </AdminPanel>);

}