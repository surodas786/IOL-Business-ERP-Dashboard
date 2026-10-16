import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { InfoIcon, PrinterIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatBDT, formatDhakaDate } from '../utils/format';
import { accountBalances, activeDueAllow, statementExplanations, statementRows, termsOf } from '../utils/billingCalc';
import { AdminPanel, secondaryBtn, tdClass, thClass } from '../components/admin/AdminPanel';
import { BillingDetailFrame } from '../components/billing/BillingDetailFrame';
import { BalanceFigures } from '../components/billing/BalanceFigures';
import { StatementPrintDocument } from '../components/billing/BillingPrintDocs';
import { PrintPreview } from '../components/quotations/PrintPreview';

export function BillingStatement() {
  const { id } = useParams();
  const { db } = useData();
  const [print, setPrint] = useState(false);
  const ba = db.billingAccounts.find((b) => b.id === id);
  const rows = ba ? statementRows(db, ba.id) : [];
  const notes = ba ? statementExplanations(db, ba.id) : [];
  const deposits = ba ? db.receipts.filter((r) => r.billingAccountId === ba.id && r.purpose === 'Security deposit' && r.status === 'Verified') : [];
  const claims = ba ? db.receipts.filter((r) => r.billingAccountId === ba.id && r.status === 'Pending Verification') : [];
  const da = ba ? activeDueAllow(db, ba.id) : undefined;

  return (
    <BillingDetailFrame back={{ to: '/billing/statements', label: 'Customer statements' }} record={ba} notFound="Billing account not found.">
      {ba &&
      <>
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-slate-400">
                {ba.id} · {ba.collectionMode}
              </p>
              <h1 className="text-[19px] font-bold text-slate-900">{ba.name}</h1>
              <p className="text-[12px] text-slate-600">
                {termsOf(ba).term}
                {termsOf(ba).term === 'Postpaid' ? ` · ${termsOf(ba).creditDays}-day credit` : ''} · {ba.billingContact} · {ba.billingAddress}
                {ba.customerId &&
              <>
                    {' · '}
                    <Link to={`/customers/${ba.customerId}`} className="font-semibold text-primary hover:text-primary-hover">
                      Customer
                    </Link>
                  </>
              }
              </p>
              {da && <p className="mt-1 text-[11.5px] text-status-ok">Due allow {da.id} active: limit {formatBDT(da.creditLimit)} until {formatDhakaDate(da.validUntil)}</p>}
            </div>
            <button type="button" className={secondaryBtn} onClick={() => setPrint(true)}>
              <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print statement
            </button>
          </header>

          <section aria-label="Balances" className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3">
            <BalanceFigures b={accountBalances(db, ba.id)} />
          </section>

          {notes.length > 0 &&
        <section aria-label="Explanation" className="mb-3 space-y-1.5 rounded-md border border-sky-100 bg-sky-50 px-4 py-2.5">
              {notes.map((n) =>
          <p key={n} className="flex items-start gap-2 text-[12px] text-slate-800">
                  <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-info" aria-hidden /> {n}
                </p>
          )}
            </section>
        }

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
            <AdminPanel title="Transactions" description="Charges less verified payments and approved credits. Security deposits and unverified claims are excluded.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Document</th>
                      <th className={thClass}>Description</th>
                      <th className={`${thClass} text-right`}>Charges</th>
                      <th className={`${thClass} text-right`}>Payments / credits</th>
                      <th className={`${thClass} text-right`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) =>
                  <tr key={`${r.doc}-${i}`}>
                        <td className={`${tdClass} whitespace-nowrap`}>{formatDhakaDate(r.at)}</td>
                        <td className={`${tdClass} font-mono text-[11.5px]`}>
                          {r.link ?
                      <Link to={r.link} className="text-primary hover:text-primary-hover">
                              {r.doc}
                            </Link> :

                      r.doc
                      }
                        </td>
                        <td className={`${tdClass} text-[11.5px]`}>{r.description}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{r.charge ? formatBDT(r.charge) : ''}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{r.credit ? formatBDT(r.credit) : ''}</td>
                        <td className={`${tdClass} text-right font-semibold tabular-nums`}>{r.balance < 0 ? `${formatBDT(-r.balance)} CR` : formatBDT(r.balance)}</td>
                      </tr>
                  )}
                    {rows.length === 0 &&
                  <tr>
                        <td colSpan={6} className={`${tdClass} text-slate-500`}>
                          No transactions.
                        </td>
                      </tr>
                  }
                  </tbody>
                </table>
              </div>
            </AdminPanel>
            <aside className="space-y-3">
              <AdminPanel title="Security deposits held">
                <ul className="divide-y divide-slate-100">
                  {deposits.map((r) =>
                <li key={r.id} className="flex justify-between px-4 py-2 text-[12px]">
                      <Link to={`/billing/receipt/${r.id}`} className="font-semibold text-slate-900 hover:text-primary">
                        {r.id}
                        <span className="block text-[11px] font-normal text-slate-500">{formatDhakaDate(r.receivedAt)}</span>
                      </Link>
                      <span className="tabular-nums">{formatBDT(r.amount)}</span>
                    </li>
                )}
                  {deposits.length === 0 && <li className="px-4 py-2 text-[12px] text-slate-500">None held.</li>}
                </ul>
              </AdminPanel>
              <AdminPanel title="Unverified claims" description="Not counted in any balance.">
                <ul className="divide-y divide-slate-100">
                  {claims.map((r) =>
                <li key={r.id} className="flex justify-between px-4 py-2 text-[12px]">
                      <Link to={`/billing/receipt/${r.id}`} className="font-semibold text-slate-900 hover:text-primary">
                        {r.id}
                        <span className="block text-[11px] font-normal text-slate-500">{r.method}</span>
                      </Link>
                      <span className="tabular-nums">{formatBDT(r.amount)}</span>
                    </li>
                )}
                  {claims.length === 0 && <li className="px-4 py-2 text-[12px] text-slate-500">None.</li>}
                </ul>
              </AdminPanel>
            </aside>
          </div>

          <AnimatePresence>
            {print &&
          <PrintPreview title={`Statement ${ba.id}`} note="Printable copy · fictional demo document" onClose={() => setPrint(false)}>
                <StatementPrintDocument billingAccountId={ba.id} />
              </PrintPreview>
          }
          </AnimatePresence>
        </>
      }
    </BillingDetailFrame>);

}