import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { canManageStock, warehouseForBranch } from '../../utils/inventoryRules';
import { formatDhaka } from '../../utils/format';
import { customerName, userName } from '../../utils/relations';
import { AdminPanel, linkBtn } from '../admin/AdminPanel';
import { FulfilJobRequestDialog } from './FulfilJobRequestDialog';
import type { InstallationJob } from '../../types/records';
import type { MaterialRequest, MaterialRequestKind } from '../../types/installation';

const TITLE: Record<MaterialRequestKind, string> = { Reservation: 'Reservation requests from jobs', Issue: 'Issue requests from jobs', Return: 'Return requests from jobs' };

/** Material requests raised on installation jobs, waiting for Inventory. */
export function JobRequestsPanel({ kind }: {kind: MaterialRequestKind;}) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const { inScope } = useWarehouseScope();
  const [open, setOpen] = useState<{job: InstallationJob;r: MaterialRequest;} | null>(null);
  const manage = canManageStock(role);
  const rows = db.installationJobs.
  filter((j) => inScope(warehouseForBranch(j.branchId))).
  flatMap((j) => (j.materialRequests ?? []).filter((r) => r.kind === kind && r.status === 'Requested').map((r) => ({ j, r })));
  if (!rows.length) return null;

  return (
    <AdminPanel title={`${TITLE[kind]} · ${rows.length}`} description="Raised by technicians and supervisors on the job.">
      <ul className="divide-y divide-slate-100">
        {rows.map(({ j, r }) =>
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-slate-900">
                {r.lines.map((l) => {const m = j.materialLines?.find((x) => x.id === l.materialId);return `${m?.item ?? l.materialId} × ${l.quantity}${m && m.unit !== 'pc' ? ` ${m.unit}` : ''}`;}).join(', ')}
              </p>
              <p className="text-[11.5px] text-slate-500">
                <Link to={`/installations/jobs/${j.id}`} className="font-semibold text-primary hover:text-primary-hover">
                  {j.id}
                </Link>{' '}
                · {customerName(db, j.customerId)} · {warehouseForBranch(j.branchId)} · {userName(r.requestedById)} {formatDhaka(r.requestedAt)}
                {r.note && ` · “${r.note}”`}
              </p>
            </div>
            {manage &&
          <div className="flex items-center gap-3">
                <button type="button" className={`${linkBtn} text-status-critical hover:text-status-critical`} onClick={() => runAction({ type: 'JOB_DECIDE_MATERIALS', jobId: j.id, requestId: r.id, decision: 'Rejected', note: 'Rejected by Inventory' })}>
                  Reject
                </button>
                <button type="button" className={linkBtn} onClick={() => setOpen({ job: j, r })}>
                  {kind === 'Return' ? 'Receive' : 'Fulfil'}
                </button>
              </div>
          }
          </li>
        )}
      </ul>
      <AnimatePresence>{open && <FulfilJobRequestDialog key={open.r.id} job={open.job} request={open.r} onClose={() => setOpen(null)} />}</AnimatePresence>
    </AdminPanel>);

}