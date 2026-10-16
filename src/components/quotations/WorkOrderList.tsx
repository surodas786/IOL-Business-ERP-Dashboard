import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { inUserScope } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { branchName, customerName } from '../../utils/relations';
import { currentSnapshot, seesAccountsHandover, seesTechnicalHandover } from '../../utils/quoteRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import type { WorkOrder } from '../../types/records';

export function WorkOrderList() {
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();
  const navigate = useNavigate();
  const depts = [...(seesTechnicalHandover(role) ? ['Technical'] : []), ...(seesAccountsHandover(role) ? ['Accounts'] : [])];
  const rows = useMemo(
    () =>
    db.workOrders.
    filter((w) => inUserScope(user, w.branchId) && (branchFilter === 'all' || w.branchId === branchFilter) && (zoneFilter === 'all' || w.zoneId === zoneFilter)).
    sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.workOrders, user, branchFilter, zoneFilter]
  );

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <p className="border-b border-slate-200 px-4 py-2.5 text-[11.5px] text-slate-500">Work orders released from approved quotations carry a locked snapshot and department handovers. Older work orders from service changes are listed for reference.</p>
      <CustomerTable<WorkOrder>
        minWidth={860}
        rows={rows}
        rowKey={(w) => w.id}
        onOpen={(w) => w.snapshots?.length ? navigate(`/quotations/wo/${w.id}`) : undefined}
        empty="No work orders in this scope."
        columns={[
        {
          label: 'Work order',
          cell: (w) =>
          <span>
                <span className="block font-semibold text-slate-900">{customerName(db, w.customerId)}</span>
                <span className="block text-[11px] text-slate-500">
                  {w.id} · {w.type}
                </span>
              </span>

        },
        { label: 'Snapshot', cell: (w) => <span className="text-[11.5px]">{currentSnapshot(w) ? `v${currentSnapshot(w)!.version} · ${currentSnapshot(w)!.quotationId}` : '—'}</span> },
        { label: 'Deadline', cell: (w) => <span className="text-[11.5px]">{currentSnapshot(w) ? formatDhaka(currentSnapshot(w)!.deadline) : '—'}</span> },
        {
          label: 'Handovers',
          cell: (w) =>
          <span className="flex flex-wrap gap-1">
                {(w.handovers ?? []).
            filter((h) => depts.includes(h.department) && h.snapshotVersion === currentSnapshot(w)?.version).
            map((h) =>
            <span key={h.department} className="text-[11px]">
                      {h.department}: <StatusBadge status={h.acknowledgedAt ? 'Acknowledged' : 'Awaiting acknowledgement'} />
                    </span>
            )}
                {!w.handovers?.length && <span className="text-[11px] text-slate-400">—</span>}
              </span>

        },
        { label: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
        { label: 'Branch', cell: (w) => <span className="text-[11.5px]">{branchName(w.branchId)}</span> }]
        } />
      
    </section>);

}