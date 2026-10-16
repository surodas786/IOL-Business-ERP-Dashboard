import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { demoNow, formatDhakaDate } from '../../utils/format';
import { billingEffect, isOpen } from '../../utils/serviceChangeRules';
import { customerName } from '../../utils/relations';
import { billingBasisFor, billingChecks, commencementDate } from '../../utils/installationRules';
import { canRunBilling, currentPeriod, periodLabel, runPreview, shiftPeriod } from '../../utils/billingCalc';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { DraftInvoiceCard } from './DraftInvoiceCard';
import type { InstallationJob, ServiceChange } from '../../types/records';

export function BillingPending() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const scope = useBillingScope();
  const pk = currentPeriod();
  const now = demoNow().toISOString();
  const jobs = db.installationJobs.filter((j) => j.status === 'Verified' && scope.inScope(j));
  const awaitingVerify = db.installationJobs.filter((j) => j.status === 'Work Completed' && scope.inScope(j)).length;
  const preview = useMemo(() => runPreview(db, pk, now, Array.from(scope.accountIds)), [db, pk, now, scope.accountIds]);
  const changes = db.serviceChanges.filter(
    (s) => scope.inScope(s) && isOpen(s) && (s.effectiveDate ?? s.requestedDate) > now && (s.toMrc !== undefined || s.type === 'Discontinuation' || s.type === 'Temporary Stop')
  );
  const mayRun = canRunBilling(role);

  return (
    <div className="space-y-3">
      <AdminPanel
        title="Awaiting billing commencement review"
        description={`Verified installations. Billing never starts when a technician marks a job done — Accounts applies the approved rule on the job page.${awaitingVerify ? ` ${awaitingVerify} more job(s) await technical verification and are not billable yet.` : ''}`}>
        
        <CustomerTable<InstallationJob>
          minWidth={820}
          rows={jobs}
          rowKey={(j) => j.id}
          empty="No verified installations are waiting for billing."
          columns={[
          { label: 'Customer', cell: (j) => <span><span className="block font-semibold text-slate-900">{customerName(db, j.customerId)}</span><span className="text-[11px] text-slate-500">{j.id} · {j.connectionId}</span></span> },
          { label: 'Approved rule', cell: (j) => <span className="text-[11.5px]">{billingBasisFor(j)}</span> },
          { label: 'Commences', cell: (j) => {const c = commencementDate(db, j);return <span className="text-[11.5px]">{c ? formatDhakaDate(c) : <span className="text-status-warning">Not resolvable yet</span>}</span>;} },
          { label: 'Checks', cell: (j) => {const ch = billingChecks(db, j);const n = ch.filter((c) => c.ok).length;return <span className={`text-[11.5px] ${n === ch.length ? 'text-status-ok' : 'text-status-warning'}`}>{n}/{ch.length} met</span>;} },
          { label: '', cell: (j) => <Link to={`/installations/jobs/${j.id}`} className={linkBtn}>Review on job page</Link> }]
          } />
        
      </AdminPanel>

      <AdminPanel title={`Not yet invoiced for ${periodLabel(pk)}`} description="Active services with no recurring invoice for the current period. Generating checks again for duplicates before posting.">
        {preview.drafts.length ?
        <ul>
            {preview.drafts.map((dr) =>
          <DraftInvoiceCard
            key={dr.billingAccountId}
            draft={dr}
            action={
            mayRun ?
            <button type="button" className={primaryBtn} onClick={() => runAction({ type: 'BILL_POST_RUN', periodKey: pk, accountIds: [dr.billingAccountId] })}>
                      Generate invoice
                    </button> :
            undefined
            } />

          )}
          </ul> :

        <p className="px-4 py-3 text-[12px] text-slate-500">Every billable service is invoiced for {periodLabel(pk)}.</p>
        }
        {preview.skipped.length > 0 &&
        <details className="border-t border-slate-100 px-4 py-2 text-[11.5px] text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">{preview.skipped.length} service(s) not billable this period</summary>
            <ul className="mt-1 space-y-0.5">
              {preview.skipped.map((s) =>
            <li key={`${s.billingAccountId}-${s.connectionId ?? ''}`}>
                  <span className="font-mono text-[11px]">{s.connectionId ?? s.billingAccountId}</span> — {s.reason}
                </li>
            )}
            </ul>
          </details>
        }
      </AdminPanel>

      <AdminPanel title="Effective-dated changes ahead" description={`How upcoming tariff changes and disconnections will be billed. Preview the ${periodLabel(shiftPeriod(pk, 1))} run to see the split lines.`}>
        <CustomerTable<ServiceChange>
          minWidth={760}
          rows={changes}
          rowKey={(s) => s.id}
          empty="No upcoming effective-dated changes."
          columns={[
          { label: 'Change', cell: (s) => <span><span className="block font-semibold text-slate-900">{customerName(db, s.customerId)}</span><span className="text-[11px] text-slate-500">{s.id} · {s.connectionId} · {s.type}</span></span> },
          { label: 'From → to', cell: (s) => <span className="text-[11.5px]">{s.fromValue} → {s.toValue}</span> },
          { label: 'Effective', cell: (s) => <span className="text-[11.5px]">{s.effectiveDate ? formatDhakaDate(s.effectiveDate) : <span className="text-slate-500">Requested {formatDhakaDate(s.requestedDate)}</span>}</span> },
          { label: 'Billing effect', cell: (s) => <span className="text-[11.5px]">{billingEffect(s, true)}</span> }]
          } />
        
      </AdminPanel>
    </div>);

}