import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { amountText, canSeeItem, centreItems, decideBlock, isOverdue, type CentreItem } from '../../utils/approvalCentre';
import { demoNow, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { inputClass } from '../admin/FormField';
import { ApprovalDetail } from './ApprovalDetail';
import { CENTRE_CATEGORIES, type CentreCategory } from '../../types/approvals';

export type QueueMode = 'inbox' | 'mine' | 'all';

const EMPTY: Record<QueueMode, string> = {
  inbox: 'Nothing is waiting for your decision.',
  mine: 'You have no submitted requests.',
  all: 'No approvals match.'
};

export function ApprovalQueue({ mode }: {mode: QueueMode;}) {
  const { db } = useData();
  const { user, role, branchFilter } = useSession();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CentreCategory | 'all'>('all');
  const now = demoNow();

  const items = useMemo(() => {
    const all = centreItems(db).filter((i) => canSeeItem(db, i, user, role) && (branchFilter === 'all' || i.branchId === null || i.branchId === branchFilter));
    if (mode === 'inbox') return all.filter((i) => i.status === 'Pending' && !decideBlock(db, i, user, role));
    if (mode === 'mine') return all.filter((i) => i.requestedById === user.id);
    return all;
  }, [db, user, role, branchFilter, mode]);

  const filtered = items.filter((i) => (cat === 'all' || i.category === cat) && (!q.trim() || `${i.id} ${i.title} ${i.detail} ${userName(i.requestedById)}`.toLowerCase().includes(q.trim().toLowerCase())));
  const sorted = mode === 'inbox' ? [...filtered].sort((a, b) => Number(isOverdue(b, now)) - Number(isOverdue(a, now)) || a.requestedAt.localeCompare(b.requestedAt)) : filtered;
  const selectedKey = params.get('item');
  const selected = items.find((i) => i.key === selectedKey) ?? null;
  const select = (i: CentreItem | null) => {
    const next = new URLSearchParams(params);
    if (i) next.set('item', i.key);else
    next.delete('item');
    setParams(next, { replace: true });
  };
  const counts = CENTRE_CATEGORIES.map((c) => ({ c, n: items.filter((i) => i.category === c).length })).filter((x) => x.n > 0);

  return (
    <div className={`grid gap-3 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_440px]' : ''}`}>
      <div className="min-w-0 rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Search approvals</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input className={`${inputClass} pl-8`} placeholder="Search by ID, title or requester" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="sr-only" htmlFor="aq-cat">
            Category
          </label>
          <select id="aq-cat" className={`${inputClass} w-auto`} value={cat} onChange={(e) => setCat(e.target.value as CentreCategory | 'all')}>
            <option value="all">All types ({items.length})</option>
            {counts.map(({ c, n }) =>
            <option key={c} value={c}>
                {c} ({n})
              </option>
            )}
          </select>
        </div>
        <ul className="divide-y divide-slate-100">
          {sorted.map((i) => {
            const overdue = isOverdue(i, now);
            return (
              <li key={i.key}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  aria-current={selected?.key === i.key}
                  className={`grid w-full gap-1 px-3 py-2.5 text-left transition-colors duration-150 sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:items-center ${selected?.key === i.key ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
                  
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-mono">{i.id}</span> · {i.category}
                      {overdue && <StatusBadge status="Overdue" />}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-slate-900">{i.title}</span>
                    <span className="block truncate text-[11.5px] text-slate-500">
                      {userName(i.requestedById)} · {formatDhaka(i.requestedAt)} · {i.approverLabel}
                    </span>
                  </span>
                  <span className="text-[12px] tabular-nums text-slate-700 sm:text-right">{amountText(i, role)}</span>
                  <span className="sm:text-right">
                    <StatusBadge status={i.status} />
                  </span>
                </button>
              </li>);

          })}
          {!sorted.length && <li className="px-4 py-10 text-center text-[12px] text-slate-500">{EMPTY[mode]}</li>}
        </ul>
      </div>
      {selected &&
      <div className="xl:sticky xl:top-3 xl:h-[calc(100vh-140px)]">
          <ApprovalDetail item={selected} onClose={() => select(null)} />
        </div>
      }
    </div>);

}