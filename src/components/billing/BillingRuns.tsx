import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canRunBilling, currentPeriod, periodLabel, runPreview, shiftPeriod } from '../../utils/billingCalc';
import { AdminPanel, primaryBtn, tdClass, thClass } from '../admin/AdminPanel';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import { DraftInvoiceCard } from './DraftInvoiceCard';

export function BillingRuns() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const cur = currentPeriod();
  const periods = [cur, shiftPeriod(cur, 1)];
  const [pk, setPk] = useState(periods[1]);
  const [confirm, setConfirm] = useState(false);
  const now = demoNow().toISOString();
  const preview = useMemo(() => runPreview(db, pk, now), [db, pk, now]);
  const mayRun = canRunBilling(role);

  return (
    <div className="space-y-3">
      <AdminPanel
        title="Prepare a billing run"
        description="Recurring MRC for every billable service in the period, across all branches. Prepaid invoices fall due at the start of the period; postpaid invoices fall due after the approved credit days."
        actions={
        <>
            <label htmlFor="run-period" className="text-[11.5px] font-semibold text-slate-600">
              Period
            </label>
            <select id="run-period" value={pk} onChange={(e) => setPk(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]">
              {periods.map((p) =>
            <option key={p} value={p}>
                  {periodLabel(p)}
                  {p === cur ? ' (current)' : ' (next)'}
                </option>
            )}
            </select>
            {mayRun &&
          <button type="button" className={primaryBtn} disabled={!preview.drafts.length} onClick={() => setConfirm(true)}>
                Post run
              </button>
          }
          </>
        }>
        
        <div className="flex flex-wrap gap-x-8 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-[12px]">
          <span>
            <span className="text-slate-500">Invoices to post </span>
            <span className="font-bold text-slate-900">{preview.drafts.length}</span>
          </span>
          <span>
            <span className="text-slate-500">Total </span>
            <span className="font-bold tabular-nums text-slate-900">{formatBDT(preview.total)}</span>
          </span>
          <span>
            <span className="text-slate-500">Skipped </span>
            <span className="font-bold text-slate-900">{preview.skipped.length}</span>
          </span>
        </div>
        {preview.drafts.length ?
        <ul>
            {preview.drafts.map((d) =>
          <DraftInvoiceCard key={d.billingAccountId} draft={d} />
          )}
          </ul> :

        <p className="px-4 py-3 text-[12px] text-slate-500">Nothing to post for {periodLabel(pk)}.</p>
        }
        {preview.skipped.length > 0 &&
        <div className="border-t border-slate-200 px-4 py-2.5">
            <h3 className="mb-1 text-[12px] font-bold text-slate-800">Skipped, with reasons</h3>
            <ul className="space-y-0.5 text-[11.5px] text-slate-600">
              {preview.skipped.map((s) =>
            <li key={`${s.billingAccountId}-${s.connectionId ?? ''}`}>
                  <span className="font-mono text-[11px] text-slate-500">{s.connectionId ?? s.billingAccountId}</span> {db.billingAccounts.find((b) => b.id === s.billingAccountId)?.name} — {s.reason}
                </li>
            )}
            </ul>
          </div>
        }
        {!mayRun && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Accounts Officer posts billing runs. You can preview the calculation.</p>}
      </AdminPanel>

      <AdminPanel title="Posted runs" description="Posted invoices are locked. Corrections go through credit notes or adjustments.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className={thClass}>Run</th>
                <th className={thClass}>Period</th>
                <th className={thClass}>Posted</th>
                <th className={`${thClass} text-right`}>Invoices</th>
                <th className={`${thClass} text-right`}>Skipped</th>
                <th className={`${thClass} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {db.billingRuns.map((r) =>
              <tr key={r.id}>
                  <td className={`${tdClass} font-mono text-[11.5px] font-semibold text-slate-900`}>{r.id}</td>
                  <td className={tdClass}>{periodLabel(r.periodKey)}</td>
                  <td className={tdClass}>
                    {formatDhaka(r.runAt, { year: true })}
                    <span className="block text-[10.5px] text-slate-500">{userName(r.byId)}</span>
                  </td>
                  <td className={`${tdClass} text-right`} title={r.invoiceIds.join(', ')}>
                    {r.invoiceIds.length}
                  </td>
                  <td className={`${tdClass} text-right`}>{r.skipped.length}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatBDT(r.total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <ConfirmDialog
        open={confirm}
        title={`Post the ${periodLabel(pk)} billing run?`}
        description={`${preview.drafts.length} invoice(s) totalling ${formatBDT(preview.total)} will be posted and locked. Services already invoiced for this period are skipped.`}
        confirmLabel="Post run"
        onConfirm={() => {
          runAction({ type: 'BILL_POST_RUN', periodKey: pk });
          setConfirm(false);
        }}
        onCancel={() => setConfirm(false)} />
      
    </div>);

}