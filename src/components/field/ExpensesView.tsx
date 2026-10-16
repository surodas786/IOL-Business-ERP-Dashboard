import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFieldData } from '../../hooks/useFieldData';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { ClaimDetail } from './ClaimDetail';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canDecideClaim, canPayClaim, claimTotal } from '../../utils/fieldRules';
import type { ClaimStatus } from '../../types/field';

const STATUSES: ClaimStatus[] = ['Draft', 'Submitted', 'Returned', 'Approved', 'Rejected', 'Paid'];
type Filter = ClaimStatus | 'all' | 'mine-to-act';

/** Expense claims with approval status, and the selected claim's detail. */
export function ExpensesView() {
  const { db, user, role, claims } = useFieldData();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('claim');
  const [filter, setFilter] = useState<Filter>('all');

  const toAct = claims.filter((c) => !canDecideClaim(c, user, role, db) || !canPayClaim(c, user, role) || c.claimantId === user.id && (c.status === 'Draft' || c.status === 'Returned'));
  const shown = filter === 'all' ? claims : filter === 'mine-to-act' ? toAct : claims.filter((c) => c.status === filter);
  const selected = claims.find((c) => c.id === selectedId);
  const select = (id: string | null) => setParams(id ? { claim: id } : {}, { replace: true });

  const chip = (id: Filter, label: string, n: number) =>
  <button
    key={id}
    type="button"
    aria-pressed={filter === id}
    onClick={() => setFilter(id)}
    className={`flex items-baseline gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition-colors duration-150 ${filter === id ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
    
      {label}
      <span className={`tabular-nums ${filter === id ? 'text-slate-300' : 'text-slate-400'}`}>{n}</span>
    </button>;


  return (
    <div className={`grid gap-3 ${selected ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
      <AdminPanel
        title="Expense claims"
        description="Draft → Submitted → Approved / Returned / Rejected → Paid. Claimants can’t approve their own claims; approved claims are locked.">
        
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2.5">
          {chip('mine-to-act', 'Needs my action', toAct.length)}
          {chip('all', 'All', claims.length)}
          {STATUSES.map((s) => chip(s, s, claims.filter((c) => c.status === s).length))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className={thClass}>Claim</th>
                <th className={thClass}>Claimant</th>
                <th className={thClass}>Lines</th>
                <th className={`${thClass} text-right`}>Total</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Last change</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 &&
              <tr>
                  <td colSpan={6} className={`${tdClass} py-8 text-center text-slate-500`}>
                    No claims here.
                  </td>
                </tr>
              }
              {shown.map((c) => {
                const last = c.history[c.history.length - 1];
                return (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    aria-selected={c.id === selectedId}
                    onClick={() => select(c.id)}
                    onKeyDown={(e) => e.key === 'Enter' && select(c.id)}
                    className={`cursor-pointer outline-none focus-visible:bg-slate-50 ${c.id === selectedId ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
                    
                    <td className={`${tdClass} font-semibold text-slate-900`}>{c.id}</td>
                    <td className={tdClass}>{c.claimantId === user.id ? 'You' : userName(c.claimantId)}</td>
                    <td className={tdClass}>
                      {c.lines.length}
                      <span className="ml-1 text-[11px] text-slate-500">{Array.from(new Set(c.lines.map((l) => l.category))).join(', ')}</span>
                    </td>
                    <td className={`${tdClass} text-right font-semibold tabular-nums text-slate-900`}>{formatBDT(claimTotal(c))}</td>
                    <td className={tdClass}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-[11.5px]`}>{last ? `${last.action} · ${formatDhaka(last.at)}` : `Created ${formatDhaka(c.createdAt)}`}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
      {selected &&
      <div className="lg:sticky lg:top-4 lg:self-start">
          <ClaimDetail claim={selected} onClose={() => select(null)} />
        </div>
      }
    </div>);

}