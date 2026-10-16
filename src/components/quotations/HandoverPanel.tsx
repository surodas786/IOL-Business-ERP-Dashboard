import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PrinterIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { hasPermission } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { componentLabels } from '../../utils/surveyRules';
import { primaryBtn, secondaryBtn, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { accountsRows, technicalRows } from './handoverRows';
import { PrintPreview } from './PrintPreview';
import { WorkOrderPrintDocument } from './WorkOrderPrintDocument';
import type { WorkOrder } from '../../types/records';
import type { Department, WorkOrderSnapshot } from '../../types/quotation';

interface Props {
  workOrder: WorkOrder;
  snapshot: WorkOrderSnapshot;
  department: Department;
}

/** One department's handover. The page decides which panels a role may see. */
export function HandoverPanel({ workOrder: w, snapshot: s, department }: Props) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [printing, setPrinting] = useState(false);
  const tech = department === 'Technical';
  const h = w.handovers?.find((x) => x.department === department && x.snapshotVersion === s.version);
  const canAck = tech ? hasPermission(role, 'technicalConfig') : hasPermission(role, 'recordCollection');
  const labels = componentLabels(db);
  const rows = tech ? technicalRows(s, labels.ggc, labels.fnn) : null;

  const dl = (items: [string, string][]) =>
  <dl className="divide-y divide-slate-100">
      {items.map(([k, v]) =>
    <div key={k} className="grid gap-1 px-4 py-1.5 text-[12.5px] sm:grid-cols-[200px_1fr] sm:gap-3">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-slate-900">{v}</dd>
        </div>
    )}
    </dl>;


  return (
    <section aria-label={`${department} handover`} className="rounded-md border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div>
          <h2 className="text-[13px] font-bold text-slate-900">{department} handover</h2>
          <p className="text-[11px] text-slate-500">
            {tech ? 'Scope, technical parameters, BOM and deadline — no billing terms, margins or commissions' : 'Billing terms and approved commissioning date — no network configuration'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {h?.acknowledgedAt ?
          <span className="text-[11px] text-slate-600">
              <StatusBadge status="Acknowledged" /> {userName(h.acknowledgedById)} · {formatDhaka(h.acknowledgedAt)}
            </span> :
          h ?
          <>
              <StatusBadge status="Awaiting acknowledgement" />
              {canAck && w.status !== 'Cancelled' &&
            <button type="button" className={primaryBtn} onClick={() => runAction({ type: 'WO_ACK_HANDOVER', workOrderId: w.id, department })}>
                  Acknowledge
                </button>
            }
            </> :

          <span className="text-[11px] text-slate-500">Superseded snapshot</span>
          }
          <button type="button" className={secondaryBtn} onClick={() => setPrinting(true)}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print {department.toLowerCase()} copy
          </button>
        </div>
      </header>

      {tech && rows ?
      <>
          <h3 className="px-4 pt-3 text-[11.5px] font-bold text-slate-500">Scope</h3>
          {dl(rows.scope)}
          <h3 className="px-4 pt-3 text-[11.5px] font-bold text-slate-500">Technical parameters</h3>
          {dl(rows.params)}
          <h3 className="px-4 pb-1 pt-3 text-[11.5px] font-bold text-slate-500">Bill of materials</h3>
          {s.bom.length === 0 ?
        <p className="px-4 pb-3 text-[12px] text-slate-600">No BOM — survey bypassed. Confirm materials on site.</p> :

        <div className="overflow-x-auto pb-1">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th className={thClass}>Item</th>
                    <th className={`${thClass} text-right`}>Quantity</th>
                    <th className={thClass}>Supply</th>
                    <th className={thClass}>Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {s.bom.map((l) =>
              <tr key={l.id}>
                      <td className={tdClass}>{l.item}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {l.quantity} {l.unit}
                      </td>
                      <td className={tdClass}>{l.supply}</td>
                      <td className={tdClass}>{l.ownership}</td>
                    </tr>
              )}
                </tbody>
              </table>
            </div>
        }
        </> :

      <div className="py-1">{dl(accountsRows(db, s))}</div>
      }

      <AnimatePresence>
        {printing &&
        <PrintPreview title={`${w.id} — ${department} copy`} note={`Snapshot v${s.version} · fictional demo data`} onClose={() => setPrinting(false)}>
            <WorkOrderPrintDocument workOrder={w} snapshot={s} department={department} />
          </PrintPreview>
        }
      </AnimatePresence>
    </section>);

}