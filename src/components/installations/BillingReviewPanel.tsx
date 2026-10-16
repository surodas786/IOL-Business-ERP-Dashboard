import React, { useState } from 'react';
import { CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { dhakaParts, formatBDT, formatDhaka } from '../../utils/format';
import { billingBasisFor, billingChecks, canReviewBilling, commencementDate, seesJobMoney } from '../../utils/installationRules';
import { primaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import type { InstallationJob } from '../../types/records';

/** Accounts reviews the approved commencement rule before any invoice is raised. */
export function BillingReviewPanel({ job }: {job: InstallationJob;}) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const checks = billingChecks(db, job);
  const start = commencementDate(db, job);
  const conn = db.connections.find((c) => c.id === job.connectionId);
  const wo = db.workOrders.find((w) => w.id === job.workOrderId);
  const snap = wo?.snapshots?.[wo.snapshots.length - 1];
  const money = seesJobMoney(role);
  const canAct = canReviewBilling(role) && job.status === 'Verified';
  const ready = checks.every((c) => c.ok);

  let estimate: number | undefined;
  if (start && conn) {
    const { year, month, day } = dhakaParts(start);
    const dim = new Date(year, month, 0).getDate();
    estimate = Math.round(conn.mrc * (dim - day + 1) / dim);
  }

  return (
    <section aria-label="Billing commencement" className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">Billing commencement</h2>
        <p className="text-[11px] text-slate-500">Accounts applies the approved rule. Nothing is invoiced when a technician marks the job done.</p>
      </header>
      <dl className="space-y-1 px-4 py-2.5 text-[12.5px]">
        <div className="grid grid-cols-[150px_1fr] gap-2">
          <dt className="text-slate-500">Approved rule</dt>
          <dd className="font-semibold text-slate-900">{billingBasisFor(job)}</dd>
        </div>
        <div className="grid grid-cols-[150px_1fr] gap-2">
          <dt className="text-slate-500">Approved in</dt>
          <dd>{snap ? `${wo!.id} snapshot v${snap.version} (Accounts handover)` : wo?.id ?? '—'}</dd>
        </div>
        <div className="grid grid-cols-[150px_1fr] gap-2">
          <dt className="text-slate-500">Commencement date</dt>
          <dd className={start ? 'text-slate-900' : 'text-slate-400'}>{job.billingCommencedAt ? formatDhaka(job.billingCommencedAt, { year: true }) : start ? `${formatDhaka(start, { year: true })} (under this rule)` : 'Not resolvable yet'}</dd>
        </div>
        {money && estimate !== undefined && !job.billingCommencedAt &&
        <div className="grid grid-cols-[150px_1fr] gap-2">
            <dt className="text-slate-500">First invoice (est.)</dt>
            <dd className="tabular-nums">
              {formatBDT(estimate)} pro-rated MRC{snap && snap.terms.otc ? ` + ${formatBDT(snap.terms.otc)} OTC` : ''}
            </dd>
          </div>
        }
      </dl>
      <ul className="border-t border-slate-100 px-4 py-2">
        {checks.map((c) =>
        <li key={c.label} className="flex items-center gap-2 py-0.5 text-[12px]">
            {c.ok ? <CheckCircle2Icon className="h-3.5 w-3.5 text-status-ok" aria-label="Met" /> : <XCircleIcon className="h-3.5 w-3.5 text-status-critical" aria-label="Missing" />}
            <span className={c.ok ? 'text-slate-700' : 'text-slate-900'}>{c.label}</span>
          </li>
        )}
      </ul>
      {canAct ?
      <form
        className="space-y-2 border-t border-slate-200 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          runAction({ type: 'JOB_COMMENCE_BILLING', jobId: job.id, reviewNote: note.trim() || `Reviewed: ${billingBasisFor(job)}` });
        }}>
        
          <label className="flex items-start gap-2 text-[12.5px] text-slate-800">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I have reviewed the approved rule and the dates above.
          </label>
          <input aria-label="Review note" placeholder="Review note (optional)" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className={primaryBtn} disabled={!confirmed || !ready}>
            Commence billing and issue invoice
          </button>
        </form> :

      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
          {job.billingCommencedAt ? 'Billing commenced — the job is closed.' : job.status === 'Verified' ? 'Accounts Officer reviews and commences billing.' : 'Available to Accounts after technical verification.'}
        </p>
      }
    </section>);

}