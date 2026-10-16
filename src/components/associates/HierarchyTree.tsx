import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useScopedAssociates } from '../../hooks/useScopedAssociates';
import { availableAllotment, canSeeAssociateMoney, childrenOf } from '../../utils/associateRules';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { Associate } from '../../types/records';

/** Multi-tier partner tree. Each child's share is carved from its parent's allotment. */
export function HierarchyTree() {
  const { db } = useData();
  const { role } = useSession();
  const { associates } = useScopedAssociates();
  const money = canSeeAssociateMoney(role);
  const visible = new Set(associates.map((a) => a.id));
  const roots = associates.filter((a) => !a.parentId || !visible.has(a.parentId));

  const Node = ({ a, depth }: {a: Associate;depth: number;}) => {
    const kids = childrenOf(db, a.id).filter((c) => visible.has(c.id));
    const pct = a.collectionModel !== 'Fixed Monthly';
    return (
      <li>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 py-2.5 pr-4" style={{ paddingLeft: 16 + depth * 28 }}>
          {depth > 0 && <span className="h-px w-3 bg-slate-300" aria-hidden />}
          <Link to={`/associates/records/${a.id}`} className="text-[13px] font-semibold text-slate-900 hover:text-primary">
            {a.name}
          </Link>
          <span className="text-[11px] text-slate-500">
            Tier {depth + 1} · {a.collectionModel}
          </span>
          {money && pct &&
          <span className="text-[11.5px] tabular-nums text-slate-700">
              {a.revenueSharePct}% share
              {kids.length > 0 && <span className="text-slate-500"> · {availableAllotment(db, a.id)}% still available to sub-associates</span>}
            </span>
          }
          {a.status && a.status !== 'Active' && <StatusBadge status={a.status} />}
        </div>
        {kids.length > 0 &&
        <ul>
            {kids.map((k) =>
          <Node key={k.id} a={k} depth={depth + 1} />
          )}
          </ul>
        }
      </li>);

  };

  return (
    <AdminPanel title="Associate hierarchy" description="Sub-associates receive part of their parent's share. A child's rate can never exceed what is left of the parent's allotment, and loops are blocked.">
      <ul className="-mt-px">
        {roots.map((r) =>
        <Node key={r.id} a={r} depth={0} />
        )}
      </ul>
    </AdminPanel>);

}