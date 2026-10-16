import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LockIcon, PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canDecideFinance, canRequestAdjustment } from '../../utils/billingCalc';
import { AdminPanel, linkBtn, primaryBtn, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { AdjustmentDialog } from './AdjustmentDialog';

export function AdjustmentsView() {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const scope = useBillingScope();
  const [adding, setAdding] = useState(false);
  const rows = db.billingAdjustments.filter((a) => scope.accountIds.has(a.billingAccountId));
  const decide = canDecideFinance(role);

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[12px] text-slate-700">
        <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        Posted invoices and receipts are never edited or deleted. Every correction is a separate, authorised credit note, reversal or adjustment, kept in the audit history.
      </p>
      <AdminPanel
        title="Adjustments and credit notes"
        description="Requested by Accounts, approved by the Finance Approver. Nobody can approve their own request."
        actions={
        canRequestAdjustment(role) ?
        <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New adjustment
            </button> :
        undefined
        }>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                {['Document', 'Applies to', 'Amount', 'Reason', 'Requested', 'Status', ''].map((h) =>
                <th key={h} className={thClass}>
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const target = a.invoiceId ?? a.receiptId ?? a.resultInvoiceId;
                const href = a.invoiceId ? `/billing/invoice/${a.invoiceId}` : a.receiptId ? `/billing/receipt/${a.receiptId}` : a.resultInvoiceId ? `/billing/invoice/${a.resultInvoiceId}` : undefined;
                return (
                  <tr key={a.id}>
                    <td className={tdClass}>
                      <span className="block font-semibold text-slate-900">{a.id}</span>
                      <span className="text-[11px] text-slate-500">{a.kind}</span>
                    </td>
                    <td className={`${tdClass} text-[11.5px]`}>
                      {db.billingAccounts.find((b) => b.id === a.billingAccountId)?.name}
                      {target && href &&
                      <Link to={href} className="block font-mono text-[11px] text-primary hover:text-primary-hover">
                          {target}
                        </Link>
                      }
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{formatBDT(a.amount)}</td>
                    <td className={`${tdClass} max-w-[260px] text-[11.5px]`}>{a.reason}</td>
                    <td className={`${tdClass} text-[11.5px]`}>
                      {userName(a.requestedById)}
                      <span className="block text-slate-500">{formatDhaka(a.requestedAt)}</span>
                      {a.decidedById && <span className="block text-slate-500">decided by {userName(a.decidedById)}</span>}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      {a.status === 'Pending' && decide && a.requestedById !== user.id &&
                      <ApprovalButtons approvalId={a.approvalId} />
                      }
                      {a.status === 'Pending' && !decide && <span className="text-[11px] text-slate-500">Finance Approver decides</span>}
                    </td>
                  </tr>);

              })}
              {rows.length === 0 &&
              <tr>
                  <td colSpan={7} className={`${tdClass} text-slate-500`}>
                    No adjustments yet.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </AdminPanel>
      <AnimatePresence>{adding && <AdjustmentDialog onClose={() => setAdding(false)} />}</AnimatePresence>
    </div>);

}