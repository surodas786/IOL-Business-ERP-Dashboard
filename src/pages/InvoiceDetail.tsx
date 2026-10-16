import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LockIcon, PrinterIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { formatBDT, formatDhaka, formatDhakaDate } from '../utils/format';
import { invoiceNet, invoiceOutstanding, invoiceStatus, userName } from '../utils/relations';
import { canRecordPayment, canRequestAdjustment } from '../utils/billingCalc';
import { AdminPanel, primaryBtn, secondaryBtn, tdClass, thClass } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { BillingDetailFrame } from '../components/billing/BillingDetailFrame';
import { InvoiceLines } from '../components/billing/InvoiceLines';
import { AdjustmentDialog } from '../components/billing/AdjustmentDialog';
import { RecordReceiptDialog } from '../components/billing/RecordReceiptDialog';
import { InvoicePrintDocument } from '../components/billing/BillingPrintDocs';
import { PrintPreview } from '../components/quotations/PrintPreview';

export function InvoiceDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { role } = useSession();
  const [dlg, setDlg] = useState<'credit' | 'pay' | 'print' | null>(null);
  const inv = db.invoices.find((i) => i.id === id);
  const ba = inv && db.billingAccounts.find((b) => b.id === inv.billingAccountId);
  const receipts = inv ? db.receipts.filter((r) => r.allocations.some((a) => a.invoiceId === inv.id) || r.reversedAllocations?.some((a) => a.invoiceId === inv.id)) : [];
  const adjustments = inv ? db.billingAdjustments.filter((a) => a.invoiceId === inv.id || a.resultInvoiceId === inv.id) : [];
  const outstanding = inv ? invoiceOutstanding(inv) : 0;

  return (
    <BillingDetailFrame back={{ to: '/billing/invoices', label: 'Invoices' }} record={inv} notFound="Invoice not found.">
      {inv && ba &&
      <>
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-slate-400">
                {inv.id} · {inv.kind ?? 'Recurring'} · {inv.billingTerm ?? '—'}
              </p>
              <h1 className="text-[19px] font-bold text-slate-900">{ba.name}</h1>
              <p className="text-[12px] text-slate-600">
                {inv.period} · issued {formatDhakaDate(inv.issuedAt)} · due {formatDhakaDate(inv.dueDate)} ·{' '}
                <Link to={`/billing/statement/${ba.id}`} className="font-semibold text-primary hover:text-primary-hover">
                  Statement
                </Link>
              </p>
              <div className="mt-1.5">
                <StatusBadge status={invoiceStatus(inv)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryBtn} onClick={() => setDlg('print')}>
                <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print invoice
              </button>
              {canRequestAdjustment(role) && outstanding > 0 &&
            <button type="button" className={secondaryBtn} onClick={() => setDlg('credit')}>
                  Request credit note
                </button>
            }
              {canRecordPayment(role) && outstanding > 0 &&
            <button type="button" className={primaryBtn} onClick={() => setDlg('pay')}>
                  Record payment
                </button>
            }
            </div>
          </header>

          <p className="mb-3 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-[11.5px] text-slate-600">
            <LockIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            Posted {formatDhaka(inv.issuedAt, { year: true })}
            {inv.postedById ? ` by ${userName(inv.postedById)}` : ''}
            {inv.runId ? ` in run ${inv.runId}` : ''}. Locked — corrections only through credit notes or adjustments.
          </p>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
            <AdminPanel title="Charges" description="From the approved work order terms, billing commencement date and any effective-dated service changes.">
              <div className="px-2 pb-2">{inv.lines?.length ? <InvoiceLines lines={inv.lines} taxNote={inv.taxNote} /> : <p className="px-2 py-3 text-[12px]">{inv.description}</p>}</div>
            </AdminPanel>
            <aside className="space-y-3">
              <AdminPanel title="Amounts">
                <dl className="space-y-1 px-4 py-3 text-[12.5px]">
                  {(
                [
                ['Invoice total', inv.amount],
                ['Credits approved', -inv.credits],
                ['Net payable', invoiceNet(inv)],
                ['Paid (verified)', -inv.paidAmount]] as
                [string, number][]).
                map(([k, v]) =>
                <div key={k} className="flex justify-between">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="tabular-nums text-slate-900">{v < 0 ? `− ${formatBDT(-v)}` : formatBDT(v)}</dd>
                    </div>
                )}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold">
                    <dt>Outstanding</dt>
                    <dd className={`tabular-nums ${outstanding > 0 ? 'text-status-critical' : 'text-slate-900'}`}>{formatBDT(outstanding)}</dd>
                  </div>
                </dl>
              </AdminPanel>
              <AdminPanel title="Payments applied">
                <ul className="divide-y divide-slate-100">
                  {receipts.map((r) => {
                  const a = (r.status === 'Reversed' ? r.reversedAllocations : r.allocations)?.find((x) => x.invoiceId === inv.id);
                  return (
                    <li key={r.id} className="flex justify-between gap-2 px-4 py-2 text-[12px]">
                        <Link to={`/billing/receipt/${r.id}`} className="font-semibold text-slate-900 hover:text-primary">
                          {r.id}
                          <span className="block text-[11px] font-normal text-slate-500">
                            {r.method} · {formatDhakaDate(r.receivedAt)}
                            {r.status === 'Reversed' ? ' · reversed' : ''}
                          </span>
                        </Link>
                        <span className={`tabular-nums ${r.status === 'Reversed' ? 'text-slate-400 line-through' : ''}`}>{formatBDT(a?.amount ?? 0)}</span>
                      </li>);

                })}
                  {receipts.length === 0 && <li className="px-4 py-2 text-[12px] text-slate-500">No verified payments applied.</li>}
                </ul>
              </AdminPanel>
              {adjustments.length > 0 &&
            <AdminPanel title="Adjustments">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className={thClass}>Document</th>
                          <th className={`${thClass} text-right`}>Amount</th>
                          <th className={thClass}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((a) =>
                    <tr key={a.id}>
                            <td className={tdClass}>
                              {a.id}
                              <span className="block text-[11px] text-slate-500">{a.kind}</span>
                            </td>
                            <td className={`${tdClass} text-right tabular-nums`}>{formatBDT(a.amount)}</td>
                            <td className={tdClass}>
                              <StatusBadge status={a.status} />
                            </td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div>
                </AdminPanel>
            }
            </aside>
          </div>

          <AnimatePresence>
            {dlg === 'credit' && <AdjustmentDialog key="c" kind="Credit note" billingAccountId={ba.id} invoiceId={inv.id} onClose={() => setDlg(null)} />}
            {dlg === 'pay' && <RecordReceiptDialog key="p" billingAccountId={ba.id} onClose={() => setDlg(null)} />}
            {dlg === 'print' &&
          <PrintPreview key="pr" title={`Invoice ${inv.id}`} note="Printable copy · fictional demo document" onClose={() => setDlg(null)}>
                <InvoicePrintDocument invoice={inv} />
              </PrintPreview>
          }
          </AnimatePresence>
        </>
      }
    </BillingDetailFrame>);

}