import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangleIcon, PrinterIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { formatBDT, formatDhaka } from '../utils/format';
import { receiptUnallocated, userName } from '../utils/relations';
import { canViewPaymentDetails, maskReference } from '../utils/customerProfile';
import { canRequestAdjustment, canVerifyPayment, duplicateReceipt } from '../utils/billingCalc';
import { AdminPanel, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { BillingDetailFrame } from '../components/billing/BillingDetailFrame';
import { AllocationDialog } from '../components/billing/AllocationDialog';
import { AdjustmentDialog } from '../components/billing/AdjustmentDialog';
import { BillingReasonDialog } from '../components/billing/BillingReasonDialog';
import { ReceiptPrintDocument } from '../components/billing/BillingPrintDocs';
import { PrintPreview } from '../components/quotations/PrintPreview';

export function ReceiptDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [dlg, setDlg] = useState<'verify' | 'allocate' | 'reject' | 'reverse' | 'print' | null>(null);
  const r = db.receipts.find((x) => x.id === id);
  const ba = r && db.billingAccounts.find((b) => b.id === r.billingAccountId);
  const paymentOk = canViewPaymentDetails(role);
  const verify = canVerifyPayment(role);
  const dup = r && r.status === 'Pending Verification' ? duplicateReceipt(db, r.method, r.reference, r.id) : undefined;
  const deposit = r?.purpose === 'Security deposit';
  const free = r && r.status === 'Verified' && !deposit ? receiptUnallocated(r) : 0;
  const pendingReversal = r && db.billingAdjustments.find((a) => a.receiptId === r.id && a.status === 'Pending');

  return (
    <BillingDetailFrame back={{ to: '/billing/receipts', label: 'Receipts' }} record={r} notFound="Receipt not found.">
      {r && ba &&
      <>
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-slate-400">
                {r.id} · {r.purpose ?? 'Payment'}
              </p>
              <h1 className="text-[19px] font-bold text-slate-900">
                {formatBDT(r.amount)} · {ba.name}
              </h1>
              <p className="text-[12px] text-slate-600">
                {r.method} · received {formatDhaka(r.receivedAt, { year: true })} ·{' '}
                <Link to={`/billing/statement/${ba.id}`} className="font-semibold text-primary hover:text-primary-hover">
                  Statement
                </Link>
              </p>
              <div className="mt-1.5">
                <StatusBadge status={r.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryBtn} onClick={() => setDlg('print')}>
                <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print receipt
              </button>
              {verify && r.status === 'Pending Verification' &&
            <>
                  <button type="button" className={secondaryBtn} onClick={() => setDlg('reject')}>
                    Reject
                  </button>
                  <button type="button" className={primaryBtn} disabled={!!dup} onClick={() => setDlg('verify')}>
                    Verify
                  </button>
                </>
            }
              {verify && free > 0 &&
            <button type="button" className={primaryBtn} onClick={() => setDlg('allocate')}>
                  Allocate advance
                </button>
            }
              {canRequestAdjustment(role) && r.status === 'Verified' && !pendingReversal &&
            <button type="button" className={secondaryBtn} onClick={() => setDlg('reverse')}>
                  Request reversal
                </button>
            }
            </div>
          </header>

          {dup &&
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-md bg-rose-50 px-4 py-2 text-[12.5px] font-semibold text-status-critical">
              <AlertTriangleIcon className="h-4 w-4" aria-hidden /> Duplicate transaction reference — already used on {dup.id} ({dup.status}). Verification is blocked.
            </p>
        }
          {r.status === 'Pending Verification' && <p className="mb-3 rounded-md bg-amber-50 px-4 py-2 text-[12px] text-slate-800">Unverified payment claim — it does not affect Due, Advance or Deposit until Accounts verifies it.</p>}
          {pendingReversal && <p className="mb-3 rounded-md bg-amber-50 px-4 py-2 text-[12px] text-slate-800">Reversal {pendingReversal.id} is awaiting Finance Approver decision.</p>}

          <div className="grid gap-3 lg:grid-cols-2">
            <AdminPanel title="Payment details" description={paymentOk ? undefined : 'Transaction reference is masked for your role.'}>
              <dl className="divide-y divide-slate-100 text-[12.5px]">
                {(
              [
              ['Payer', r.payer ?? '—'],
              ['Reference', paymentOk ? r.reference : maskReference(r.reference)],
              ['Collector', r.collectorName ?? '—'],
              ['Recorded by', r.recordedById ? `${userName(r.recordedById)} · ${formatDhaka(r.recordedAt ?? r.receivedAt)}` : 'Bank / wallet feed'],
              ['Evidence', r.evidence ?? 'None attached'],
              ['Verified', r.verifiedAt && r.status !== 'Rejected' ? `${userName(r.verifiedById)} · ${formatDhaka(r.verifiedAt, { year: true })}` : '—'],
              ...(r.rejectReason ? [['Rejected', `${userName(r.verifiedById)} — ${r.rejectReason}`]] : []),
              ...(r.reversedAt ? [['Reversed', formatDhaka(r.reversedAt, { year: true })]] : []),
              ...(r.note ? [['Note', r.note]] : [])] as
              [string, string][]).
              map(([k, v]) =>
              <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-1.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={`text-slate-900 ${k === 'Reference' ? 'font-mono text-[12px]' : ''}`}>{v}</dd>
                  </div>
              )}
              </dl>
            </AdminPanel>
            <AdminPanel title={deposit ? 'Security deposit' : 'Allocation'}>
              {deposit ?
            <p className="px-4 py-3 text-[12.5px] text-slate-700">Held as a refundable security deposit. It is never allocated to invoices or used for monthly charges automatically.</p> :

            <ul className="divide-y divide-slate-100">
                  {(r.status === 'Reversed' ? r.reversedAllocations ?? [] : r.allocations).map((a) =>
              <li key={a.invoiceId} className="flex justify-between px-4 py-2 text-[12.5px]">
                      <Link to={`/billing/invoice/${a.invoiceId}`} className="font-semibold text-slate-900 hover:text-primary">
                        {a.invoiceId}
                      </Link>
                      <span className={`tabular-nums ${r.status === 'Reversed' ? 'text-slate-400 line-through' : ''}`}>{formatBDT(a.amount)}</span>
                    </li>
              )}
                  <li className="flex justify-between px-4 py-2 text-[12.5px] font-semibold">
                    <span>Unallocated advance</span>
                    <span className={`tabular-nums ${free > 0 ? 'text-status-warning' : ''}`}>{formatBDT(free)}</span>
                  </li>
                  {r.intendedInvoiceIds?.length && r.status === 'Pending Verification' ? <li className="px-4 py-2 text-[11.5px] text-slate-500">Collector suggested: {r.intendedInvoiceIds.join(', ')}</li> : null}
                </ul>
            }
            </AdminPanel>
          </div>

          <AnimatePresence>
            {(dlg === 'verify' || dlg === 'allocate') && <AllocationDialog key={dlg} receipt={r} mode={dlg} onClose={() => setDlg(null)} />}
            {dlg === 'reject' &&
          <BillingReasonDialog key="rj" title={`Reject ${r.id}`} danger submitLabel="Reject claim" description="The claim stays on record as rejected and never affects balances." onSubmit={(reason) => runAction({ type: 'BILL_REJECT_RECEIPT', receiptId: r.id, reason })} onClose={() => setDlg(null)} />
          }
            {dlg === 'reverse' && <AdjustmentDialog key="rv" kind="Receipt reversal" billingAccountId={ba.id} receiptId={r.id} onClose={() => setDlg(null)} />}
            {dlg === 'print' &&
          <PrintPreview key="pr" title={`Receipt ${r.id}`} note="Printable copy · fictional demo document" onClose={() => setDlg(null)}>
                <ReceiptPrintDocument receipt={r} />
              </PrintPreview>
          }
          </AnimatePresence>
        </>
      }
    </BillingDetailFrame>);

}