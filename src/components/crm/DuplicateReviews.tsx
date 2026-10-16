import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ShieldCheckIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { canManageSales } from '../../utils/crmRules';
import { formatDhaka } from '../../utils/format';
import { ENTITY_LABEL, recordName, userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { primaryBtn } from '../admin/AdminPanel';
import { ResolveConflictDialog } from './ResolveConflictDialog';
import type { CrmConflict } from '../../types/crm';

export function DuplicateReviews({ filters }: {filters: CrmFilters;}) {
  const { db, conflicts } = useCrmData(filters);
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const manager = canManageSales(role);
  const [resolving, setResolving] = useState<CrmConflict | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const rows = conflicts.filter((c) => showResolved || c.status === 'Open');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
        <p className="flex max-w-3xl gap-2 text-[12px] leading-relaxed text-slate-600">
          <ShieldCheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
          <span>
            Similar names, phone numbers or addresses only raise a review — records are never merged automatically. Conflicting salesperson
            assignments on the same confirmed customer or opportunity are blocked. {manager ? 'You can resolve, merge or reassign.' : 'Only an authorised sales manager can resolve, merge or reassign.'}
          </span>
        </p>
        <label className="flex items-center gap-2 text-[11.5px] text-slate-600">
          <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {rows.length === 0 && <p className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-[12px] text-slate-500">No open reviews.</p>}

      {rows.map((c) => {
        const o = db.opportunities.find((x) => x.id === c.opportunityId)!;
        const lead = db.leads.find((l) => l.id === o.leadId);
        return (
          <article key={c.id} className="rounded-md border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
              <StatusBadge status={c.status === 'Open' ? c.kind === 'Assignment conflict' ? 'Pending' : 'Duplicate review' : 'Resolved'} />
              <h3 className="text-[13px] font-bold text-slate-900">{c.kind}</h3>
              <span className="font-mono text-[11px] text-slate-400">{c.id}</span>
              <span className="ml-auto text-[11px] text-slate-500">
                Raised by {userName(c.requestedById)} · {formatDhaka(c.raisedAt)}
              </span>
            </header>
            <div className="grid gap-4 px-4 py-3 md:grid-cols-2">
              <div>
                <p className="text-[10.5px] text-slate-400">Under review</p>
                <Link to={`/sales-crm/opportunities/${o.id}`} className="text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                  {lead?.company} · {o.id}
                </Link>
                <p className="text-[11.5px] text-slate-600">
                  {lead?.contactName} · {lead?.contactPhone || 'no phone'} · owner {userName(o.ownerId)}
                </p>
                <ul className="mt-2 space-y-0.5 text-[11.5px] text-slate-700">
                  {c.reasons.map((r) =>
                  <li key={r}>• {r}</li>
                  )}
                </ul>
                {c.note && <p className="mt-2 rounded bg-slate-50 px-2.5 py-1.5 text-[11.5px] italic text-slate-600">“{c.note}”</p>}
              </div>
              <div>
                <p className="text-[10.5px] text-slate-400">{c.kind === 'Assignment conflict' ? 'Current assignment' : 'Possible matches'}</p>
                <ul className="mt-0.5 divide-y divide-slate-100 rounded-md border border-slate-200">
                  {c.matches.map((m) =>
                  <li key={`${m.type}-${m.id}`}>
                      <button type="button" onClick={() => openRecord(m)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-slate-50">
                        <span className="w-20 flex-shrink-0 text-[10.5px] text-slate-400">{ENTITY_LABEL[m.type]}</span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-mono text-[11px] text-slate-500">{m.id}</span> {recordName(db, m)}
                        </span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
              {c.status === 'Resolved' ?
              <p className="text-[11.5px] text-slate-600">
                  <span className="font-semibold text-slate-900">{c.resolution}</span> by {userName(c.resolvedById)} · {c.resolvedAt && formatDhaka(c.resolvedAt)} — {c.resolutionNote}
                </p> :
              manager ?
              <button type="button" className={primaryBtn} onClick={() => setResolving(c)}>
                  Review and resolve
                </button> :

              <p className="text-[11.5px] italic text-slate-500">Awaiting a sales manager. Both records stay as they are until then.</p>
              }
            </footer>
          </article>);

      })}

      <AnimatePresence>{resolving && <ResolveConflictDialog key={resolving.id} conflict={resolving} onClose={() => setResolving(null)} />}</AnimatePresence>
    </div>);

}