import React from 'react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canFulfilMaterials } from '../../utils/installationRules';
import { linkBtn, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { InstallationJob } from '../../types/records';
import type { MaterialRequestKind } from '../../types/installation';

interface Props {
  job: InstallationJob;
  canRequest: boolean;
  onRequest: (kind: MaterialRequestKind) => void;
}

/** Planned, reserved, issued, consumed and returned quantities kept in separate columns, plus requests to Inventory. */
export function MaterialsPanel({ job, canRequest, onRequest }: Props) {
  const { role } = useSession();
  const runAction = useRunAction();
  const lines = job.materialLines ?? [];
  const requests = [...(job.materialRequests ?? [])].reverse();
  const fulfil = canFulfilMaterials(role);
  const closed = ['Verified', 'Closed', 'Cancelled'].includes(job.status);
  const unused = lines.some((m) => m.issued - m.consumed - m.returned > 0);

  return (
    <section aria-label="Materials" className="rounded-md border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div>
          <h2 className="text-[13px] font-bold text-slate-900">Materials</h2>
          <p className="text-[11px] text-slate-500">A reservation holds stock; only an issue reduces it.</p>
        </div>
        {canRequest &&
        <div className="flex flex-wrap gap-2">
            {!closed &&
          <>
                <button type="button" className={linkBtn} onClick={() => onRequest('Reservation')}>
                  Request reservation
                </button>
                <button type="button" className={linkBtn} onClick={() => onRequest('Issue')}>
                  Request issue
                </button>
              </>
          }
            {unused &&
          <button type="button" className={linkBtn} onClick={() => onRequest('Return')}>
                Return unused
              </button>
          }
          </div>
        }
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              {['Planned', 'Reserved', 'Issued', 'Consumed', 'Returned', 'Unused'].map((h) =>
              <th key={h} className={`${thClass} text-right`}>
                  {h}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((m) => {
              const left = m.issued - m.consumed - m.returned;
              return (
                <tr key={m.id}>
                  <td className={tdClass}>
                    {m.item}
                    <span className="block font-mono text-[10.5px] text-slate-400">{m.sku}</span>
                  </td>
                  {[m.planned, m.reserved, m.issued, m.consumed, m.returned].map((v, i) =>
                  <td key={i} className={`${tdClass} text-right tabular-nums`}>
                      {v} <span className="text-[10.5px] text-slate-400">{m.unit}</span>
                    </td>
                  )}
                  <td className={`${tdClass} text-right tabular-nums ${left > 0 && ['Work Completed', 'Verified', 'Closed'].includes(job.status) ? 'font-semibold text-status-warning' : ''}`}>{left}</td>
                </tr>);

            })}
            {lines.length === 0 &&
            <tr>
                <td colSpan={7} className={`${tdClass} text-slate-500`}>
                  No materials planned.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      {requests.length > 0 &&
      <ul className="divide-y divide-slate-100 border-t border-slate-200">
          {requests.map((r) =>
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-slate-900">
                  {r.kind} · {r.lines.map((l) => `${lines.find((m) => m.id === l.materialId)?.item ?? l.materialId} ×${l.quantity}`).join(', ')}
                </p>
                <p className="text-[11px] text-slate-500">
                  {userName(r.requestedById)} · {formatDhaka(r.requestedAt)}
                  {r.note && ` · ${r.note}`}
                  {r.decidedAt && ` · ${r.status.toLowerCase()} by ${userName(r.decidedById)} ${formatDhaka(r.decidedAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {fulfil && r.status === 'Requested' &&
            <>
                    <button type="button" className={linkBtn} onClick={() => runAction({ type: 'JOB_DECIDE_MATERIALS', jobId: job.id, requestId: r.id, decision: 'Fulfilled' })}>
                      Fulfil
                    </button>
                    <button type="button" className={`${linkBtn} text-status-critical`} onClick={() => runAction({ type: 'JOB_DECIDE_MATERIALS', jobId: job.id, requestId: r.id, decision: 'Rejected', note: 'Rejected by Inventory' })}>
                      Reject
                    </button>
                  </>
            }
              </div>
            </li>
        )}
        </ul>
      }
    </section>);

}