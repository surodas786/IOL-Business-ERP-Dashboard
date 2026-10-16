import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { InfoIcon, PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canDecideFinance, canRequestDueAllow, canRunBilling, dueAllowState, suspensionFlags } from '../../utils/billingCalc';
import { AdminPanel, linkBtn, primaryBtn, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { DueAllowDialog } from './DueAllowDialog';
import { BillingReasonDialog } from './BillingReasonDialog';

type Pending = {kind: 'refer';ba: string;} | {kind: 'withdraw';id: string;} | {kind: 'revoke';id: string;} | null;

export function DueAllowView() {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const scope = useBillingScope();
  const [adding, setAdding] = useState(false);
  const [dlg, setDlg] = useState<Pending>(null);
  const flags = suspensionFlags(db).filter((f) => scope.accountIds.has(f.billingAccountId));
  const allows = db.dueAllows.filter((d) => scope.accountIds.has(d.billingAccountId));
  const p = db.billingPolicy;
  const name = (id: string) => db.billingAccounts.find((b) => b.id === id)?.name ?? id;
  const accounts = canRunBilling(role);

  return (
    <div className="space-y-3">
      <section aria-label="Billing policy" className="flex flex-wrap items-start gap-x-8 gap-y-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-[12px]">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">Prepaid grace</p>
          <p className="font-bold text-slate-900">{p.prepaidGraceDays} days after due</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500">Postpaid review after</p>
          <p className="font-bold text-slate-900">{p.postpaidReviewDays} days past approved credit terms</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500">Proration</p>
          <p className="font-bold text-slate-900">{p.prorationMethod}</p>
        </div>
        <StatusBadge status={p.status} />
      </section>

      <AdminPanel title="Suspension review flags" description="Accounts past the approved grace or credit terms without an active due allow covering the balance.">
        <p className="flex items-start gap-2 border-b border-slate-100 bg-amber-50 px-4 py-2 text-[11.5px] text-slate-800">
          <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" aria-hidden />
          A flag is a financial signal only. Referring sends the service IDs to Technical for review; this demo never suspends or simulates suspending a network service.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                {['Account', 'Rule', 'Oldest overdue', 'Due', 'Status', ''].map((h) =>
                <th key={h} className={thClass}>
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {flags.map((f) =>
              <tr key={f.billingAccountId}>
                  <td className={tdClass}>
                    <Link to={`/billing/statement/${f.billingAccountId}`} className="font-semibold text-slate-900 hover:text-primary">
                      {name(f.billingAccountId)}
                    </Link>
                  </td>
                  <td className={`${tdClass} text-[11.5px]`}>
                    {f.term}: more than {f.threshold} days past due
                  </td>
                  <td className={`${tdClass} text-[11.5px]`}>
                    {f.oldestInvoiceId} · <span className="font-semibold text-status-critical">{f.daysPastDue} days</span>
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{formatBDT(f.due)}</td>
                  <td className={`${tdClass} text-[11.5px]`}>
                    {f.coveredBy ?
                  <span className="text-status-ok">
                        Covered by {f.coveredBy.id} (limit {formatBDT(f.coveredBy.creditLimit)}) until {formatDhakaDate(f.coveredBy.validUntil)}
                      </span> :
                  f.referral ?
                  <span>
                        Referred {f.referral.id} · {formatDhakaDate(f.referral.raisedAt)}
                        <span className="block text-slate-500">Network action not simulated</span>
                      </span> :

                  <span className="font-semibold text-status-critical">{f.exceedsLimit ? 'Exceeds due allow limit' : 'Needs suspension review'}</span>
                  }
                  </td>
                  <td className={`${tdClass} text-right`}>
                    {accounts && !f.coveredBy && !f.referral &&
                  <button type="button" className={linkBtn} onClick={() => setDlg({ kind: 'refer', ba: f.billingAccountId })}>
                        Refer to Technical
                      </button>
                  }
                    {accounts && f.referral &&
                  <button type="button" className={linkBtn} onClick={() => setDlg({ kind: 'withdraw', id: f.referral!.id })}>
                        Withdraw referral
                      </button>
                  }
                  </td>
                </tr>
              )}
              {flags.length === 0 &&
              <tr>
                  <td colSpan={6} className={`${tdClass} text-slate-500`}>
                    No accounts meet the suspension review rule.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Due allows"
        description="Each needs an approver, reason, credit limit, validity and review date. Finance Approver decides; nobody approves their own request."
        actions={
        canRequestDueAllow(role) ?
        <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Request due allow
            </button> :
        undefined
        }>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                {['Due allow', 'Limit', 'Validity', 'Review', 'Requested', 'State', ''].map((h) =>
                <th key={h} className={thClass}>
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {allows.map((da) => {
                const st = dueAllowState(da);
                const ap = db.approvals.find((a) => a.id === da.approvalId);
                return (
                  <tr key={da.id}>
                    <td className={tdClass}>
                      <span className="block font-semibold text-slate-900">{name(da.billingAccountId)}</span>
                      <span className="text-[11px] text-slate-500">
                        {da.id} · {da.reason}
                      </span>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{formatBDT(da.creditLimit)}</td>
                    <td className={`${tdClass} whitespace-nowrap text-[11.5px]`}>
                      {formatDhakaDate(da.validFrom)} – {formatDhakaDate(da.validUntil)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-[11.5px]`}>{formatDhakaDate(da.reviewAt)}</td>
                    <td className={`${tdClass} text-[11.5px]`}>
                      {userName(da.requestedById)}
                      {da.decidedById && <span className="block text-slate-500">decided by {userName(da.decidedById)}</span>}
                      {da.revokedReason && <span className="block text-slate-500">revoked: {da.revokedReason}</span>}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={st} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      {st === 'Pending' && canDecideFinance(role) && ap && da.requestedById !== user.id &&
                      <ApprovalButtons approvalId={ap.id} />
                      }
                      {st === 'Pending' && !canDecideFinance(role) && <span className="text-[11px] text-slate-500">Finance Approver decides</span>}
                      {(st === 'Active' || st === 'Scheduled') && (canDecideFinance(role) || accounts) &&
                      <button type="button" className={linkBtn} onClick={() => setDlg({ kind: 'revoke', id: da.id })}>
                          Revoke
                        </button>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AnimatePresence>
        {adding && <DueAllowDialog key="add" onClose={() => setAdding(false)} />}
        {dlg?.kind === 'refer' &&
        <BillingReasonDialog key="refer" title={`Refer ${name(dlg.ba)} for suspension review`} description="Technical receives the service IDs only — no amounts. Any network action happens outside this demo after confirmation." submitLabel="Refer to Technical" onSubmit={(note) => runAction({ type: 'BILL_REFER_SUSPENSION', billingAccountId: dlg.ba, note })} onClose={() => setDlg(null)} />
        }
        {dlg?.kind === 'withdraw' && <BillingReasonDialog key="wd" title={`Withdraw ${dlg.id}`} submitLabel="Withdraw referral" onSubmit={(reason) => runAction({ type: 'BILL_WITHDRAW_SUSPENSION', reviewId: dlg.id, reason })} onClose={() => setDlg(null)} />}
        {dlg?.kind === 'revoke' && <BillingReasonDialog key="rv" title={`Revoke ${dlg.id}`} danger submitLabel="Revoke due allow" onSubmit={(reason) => runAction({ type: 'BILL_REVOKE_DUE_ALLOW', dueAllowId: dlg.id, reason })} onClose={() => setDlg(null)} />}
      </AnimatePresence>
    </div>);

}