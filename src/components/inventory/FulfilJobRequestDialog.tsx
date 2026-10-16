import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { SerialEntry } from './SerialEntry';
import { customerName } from '../../utils/relations';
import { stockOf, stockPosition, warehouseForBranch } from '../../utils/inventoryRules';
import type { InstallationJob } from '../../types/records';
import type { MaterialRequest } from '../../types/installation';

const VERB = { Reservation: 'Reserve', Issue: 'Issue', Return: 'Receive return' } as const;

/** Fulfils a material request raised from an installation job, capturing serials for equipment. */
export function FulfilJobRequestDialog({ job, request: r, onClose }: {job: InstallationJob;request: MaterialRequest;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const warehouse = warehouseForBranch(job.branchId);
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  const lines = r.lines.map((l) => ({ l, m: job.materialLines!.find((x) => x.id === l.materialId)! }));
  const needsSerials = r.kind !== 'Reservation';
  const ready = !needsSerials || lines.every(({ l, m }) => !m.serialised || (serials[l.materialId]?.length ?? 0) === l.quantity);

  return (
    <CrmDialog
      size="lg"
      title={`${VERB[r.kind]} for ${job.id}`}
      description={`${customerName(db, job.customerId)} · ${job.technicianName || 'no technician assigned'} · ${warehouse}. ${r.kind === 'Reservation' ? 'Reservation holds available stock; on-hand is unchanged.' : r.kind === 'Issue' ? 'Issue reduces on-hand and records the serials given to the technician.' : 'Returned items wait for inspection before they are restocked.'}`}
      onClose={onClose}
      submitLabel={VERB[r.kind]}
      submitDisabled={!ready}
      onSubmit={() => runAction({ type: 'JOB_DECIDE_MATERIALS', jobId: job.id, requestId: r.id, decision: 'Fulfilled', serials }) && onClose()}>
      
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {lines.map(({ l, m }) => {
          const stock = stockOf(db, m.sku, warehouse);
          const pos = stock ? stockPosition(db, stock) : undefined;
          const suggestions =
          r.kind === 'Issue' ?
          db.equipmentUnits.filter((u) => u.sku === m.sku && u.warehouse === warehouse && u.status === 'In Stock').map((u) => u.serial) :
          db.equipmentUnits.filter((u) => u.sku === m.sku && u.status === 'Issued' && u.jobId === job.id).map((u) => u.serial);
          return (
            <li key={l.materialId} className="space-y-2 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-slate-900">
                  {m.item} × {l.quantity} {m.unit}
                </p>
                {pos &&
                <p className="text-[11px] tabular-nums text-slate-500">
                    On hand {pos.onHand} · reserved {pos.reserved} · available <span className="font-semibold text-slate-800">{pos.available}</span>
                  </p>
                }
              </div>
              {needsSerials && m.serialised &&
              <SerialEntry id={`fj-${l.materialId}`} value={serials[l.materialId] ?? []} onChange={(v) => setSerials({ ...serials, [l.materialId]: v })} expected={l.quantity} suggestions={suggestions} />
              }
            </li>);

        })}
      </ul>
      {r.note && <p className="text-[12px] italic text-slate-500">“{r.note}”</p>}
    </CrmDialog>);

}