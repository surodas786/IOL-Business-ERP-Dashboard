import React from 'react';
import { useData } from '../../contexts/DataContext';
import { formatDhaka, formatDhakaDate } from '../../utils/format';
import { customerName, userName } from '../../utils/relations';
import { componentLabels } from '../../utils/surveyRules';
import { accountsRows, technicalRows } from './handoverRows';
import { DocRows, DocSection, DocumentHeader } from './PrintPreview';
import type { WorkOrder } from '../../types/records';
import type { Department, WorkOrderSnapshot } from '../../types/quotation';

interface Props {
  workOrder: WorkOrder;
  snapshot: WorkOrderSnapshot;
  department: Department;
}

/** Department copy of a work order. The Technical copy has no prices; the Accounts copy has no network configuration. */
export function WorkOrderPrintDocument({ workOrder: w, snapshot: s, department }: Props) {
  const { db } = useData();
  const labels = componentLabels(db);
  const job = db.installationJobs.find((j) => j.workOrderId === w.id);
  const tech = department === 'Technical';
  const rows = tech ? technicalRows(s, labels.ggc, labels.fnn) : null;

  return (
    <>
      <DocumentHeader
        docTitle={`Work order — ${department} copy`}
        docId={`${w.id} · snapshot v${s.version}`}
        stamp={w.status === 'Cancelled' ? 'Cancelled' : undefined}
        meta={[
        { label: 'Customer', value: customerName(db, w.customerId) },
        { label: 'Released', value: formatDhakaDate(w.createdAt) },
        { label: 'Locked by', value: userName(s.lockedById) },
        { label: 'Source', value: `${s.quotationId} v${s.quotationVersion}` }]
        } />
      

      {tech && rows ?
      <>
          <DocSection title="Scope">
            <DocRows rows={rows.scope} />
            {job && <p className="mt-1 text-[11px] text-slate-600">Installation job {job.id} · {job.technicianName} · scheduled {formatDhaka(job.scheduledAt)}</p>}
          </DocSection>
          <DocSection title="Technical parameters">
            <DocRows rows={rows.params} />
          </DocSection>
          <DocSection title="Bill of materials">
            {s.bom.length === 0 ?
          <p>No BOM — survey bypassed. Materials from equipment terms: {s.terms.equipment.map((e) => e.item).join(', ')}.</p> :

          <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-[10.5px] uppercase text-slate-500">
                    <th className="py-1 font-semibold">Item</th>
                    <th className="py-1 text-right font-semibold">Qty</th>
                    <th className="py-1 pl-3 font-semibold">Supply</th>
                    <th className="py-1 pl-3 font-semibold">Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {s.bom.map((l) =>
              <tr key={l.id} className="border-b border-slate-100">
                      <td className="py-1">{l.item}</td>
                      <td className="py-1 text-right tabular-nums">
                        {l.quantity} {l.unit}
                      </td>
                      <td className="py-1 pl-3">{l.supply}</td>
                      <td className="py-1 pl-3">{l.ownership}</td>
                    </tr>
              )}
                </tbody>
              </table>
          }
          </DocSection>
        </> :

      <DocSection title="Billing terms">
          <DocRows rows={accountsRows(db, s)} />
        </DocSection>
      }

      <DocSection title="Locked terms">
        <p>
          This copy reflects snapshot v{s.version}, locked {formatDhaka(s.lockedAt, { year: true })} ({s.reason}). Changes need an approved revision, which issues a new snapshot and handover.
        </p>
      </DocSection>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <p className="border-t border-slate-400 pt-1 text-[10.5px] text-slate-500">Received by ({department}), name and date</p>
        <p className="border-t border-slate-400 pt-1 text-[10.5px] text-slate-500">Issued by (Back Office)</p>
      </div>
    </>);

}