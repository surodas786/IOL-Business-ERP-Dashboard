import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangleIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { formatBDT, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canViewPaymentDetails, maskReference } from '../../utils/customerProfile';
import { canVerifyPayment, duplicateReceipt } from '../../utils/billingCalc';
import { AdminPanel, primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { AllocationDialog } from './AllocationDialog';
import { BillingReasonDialog } from './BillingReasonDialog';
import type { Receipt } from '../../types/records';

export function PaymentVerification() {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const { receipts } = useBillingScope();
  const [verify, setVerify] = useState<Receipt | null>(null);
  const [reject, setReject] = useState<Receipt | null>(null);
  const pending = receipts.filter((r) => r.status === 'Pending Verification').sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const decided = receipts.filter((r) => r.verifiedAt && (r.status === 'Verified' || r.status === 'Rejected')).sort((a, b) => (b.verifiedAt ?? '').localeCompare(a.verifiedAt ?? '')).slice(0, 6);
  const mayVerify = canVerifyPayment(role);
  const paymentOk = canViewPaymentDetails(role);

  return (
    <div className="space-y-3">
      <AdminPanel title={`Awaiting verification · ${pending.length}`} description="Payment claims stay unverified until Accounts confirms them. Unverified amounts never change Due, Advance or Deposit.">
        {pending.length === 0 ?
        <p className="px-4 py-4 text-[12px] text-slate-500">No payment claims are waiting.</p> :

        <ul className="divide-y divide-slate-100">
            {pending.map((r) => {
            const dup = duplicateReceipt(db, r.method, r.reference, r.id);
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-900">
                      <Link to={`/billing/receipt/${r.id}`} className="hover:text-primary">
                        {r.id}
                      </Link>{' '}
                      · {db.billingAccounts.find((b) => b.id === r.billingAccountId)?.name}
                    </p>
                    <p className="text-[11.5px] text-slate-600">
                      {r.payer ?? '—'} · {r.method} <span className="font-mono">{paymentOk ? r.reference : maskReference(r.reference)}</span> · received {formatDhaka(r.receivedAt)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Collector {r.collectorName ?? '—'} · recorded by {userName(r.recordedById)} · evidence {r.evidence ?? <span className="text-status-warning">none</span>}
                      {r.intendedInvoiceIds?.length ? ` · intended for ${r.intendedInvoiceIds.join(', ')}` : ''}
                      {r.purpose === 'Security deposit' ? ' · security deposit' : ''}
                    </p>
                    {r.note && <p className="mt-0.5 text-[11px] italic text-slate-500">“{r.note}”</p>}
                    {dup &&
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded bg-rose-50 px-2 py-0.5 text-[11.5px] font-semibold text-status-critical">
                        <AlertTriangleIcon className="h-3.5 w-3.5" aria-hidden /> Duplicate reference — matches {dup.id} ({dup.status})
                      </p>
                  }
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold tabular-nums text-slate-900">{formatBDT(r.amount)}</p>
                    {mayVerify ?
                  <div className="mt-1.5 flex gap-2">
                        <button type="button" className={secondaryBtn} onClick={() => setReject(r)}>
                          Reject
                        </button>
                        <button type="button" className={primaryBtn} disabled={!!dup} onClick={() => setVerify(r)}>
                          Verify
                        </button>
                      </div> :

                  <p className="mt-1 text-[11px] text-slate-500">Accounts Officer verifies</p>
                  }
                  </div>
                </li>);

          })}
          </ul>
        }
      </AdminPanel>

      <AdminPanel title="Recently decided">
        <ul className="divide-y divide-slate-100">
          {decided.map((r) =>
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px]">
              <Link to={`/billing/receipt/${r.id}`} className="font-semibold text-slate-900 hover:text-primary">
                {r.id} · {db.billingAccounts.find((b) => b.id === r.billingAccountId)?.name}
              </Link>
              <span className="text-slate-500">
                {formatBDT(r.amount)} · {userName(r.verifiedById)} · {formatDhaka(r.verifiedAt!)}
              </span>
              <StatusBadge status={r.status} />
            </li>
          )}
        </ul>
      </AdminPanel>

      <AnimatePresence>
        {verify && <AllocationDialog key="v" receipt={verify} mode="verify" onClose={() => setVerify(null)} />}
        {reject &&
        <BillingReasonDialog
          key="r"
          title={`Reject ${reject.id}`}
          description="The claim stays on record as rejected and never affects balances. The collector is notified."
          submitLabel="Reject claim"
          danger
          onSubmit={(reason) => runAction({ type: 'BILL_REJECT_RECEIPT', receiptId: reject.id, reason })}
          onClose={() => setReject(null)} />

        }
      </AnimatePresence>
    </div>);

}