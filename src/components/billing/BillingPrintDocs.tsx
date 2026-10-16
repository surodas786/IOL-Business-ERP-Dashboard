import React from 'react';
import { useData } from '../../contexts/DataContext';
import { demoNow, formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { invoiceNet, invoiceOutstanding, invoiceStatus, userName } from '../../utils/relations';
import { accountBalances, statementExplanations, statementRows, termsOf } from '../../utils/billingCalc';
import { DocRows, DocSection, DocumentHeader } from '../quotations/PrintPreview';
import { InvoiceLines } from './InvoiceLines';
import type { Invoice, Receipt } from '../../types/records';

export function InvoicePrintDocument({ invoice: i }: {invoice: Invoice;}) {
  const { db } = useData();
  const ba = db.billingAccounts.find((b) => b.id === i.billingAccountId);
  const credits = db.billingAdjustments.filter((a) => a.invoiceId === i.id && a.status === 'Approved');
  return (
    <>
      <DocumentHeader
        docTitle={i.kind === 'Adjustment' ? 'Debit note' : 'Invoice'}
        docId={i.id}
        stamp={invoiceOutstanding(i) === 0 ? 'Paid' : invoiceStatus(i) === 'Overdue' ? 'Overdue' : undefined}
        meta={[
        { label: 'Issued', value: formatDhakaDate(i.issuedAt) },
        { label: 'Due', value: formatDhakaDate(i.dueDate) },
        { label: 'Period', value: i.period },
        { label: 'Terms', value: i.billingTerm ?? '—' }]
        } />
      
      <DocSection title="Bill to">
        <DocRows
          rows={[
          ['Account', `${ba?.name ?? ''} (${i.billingAccountId})`],
          ['Issued to', i.customerSnapshot?.name ?? ba?.name ?? '—'],
          ['Billing contact', ba?.billingContact ?? '—'],
          ['Billing address', ba?.billingAddress ?? '—']]
          } />
        
      </DocSection>
      <DocSection title="Charges">{i.lines?.length ? <InvoiceLines lines={i.lines} taxNote={i.taxNote} print /> : <p>{i.description} — {formatBDT(i.amount)}</p>}</DocSection>
      <DocSection title="Summary">
        <DocRows
          rows={[
          ['Invoice total', formatBDT(i.amount)],
          ...credits.map((c): [string, string] => [`Less credit note ${c.id}`, `− ${formatBDT(c.amount)}`]),
          ['Net payable', formatBDT(invoiceNet(i))],
          ['Paid (verified receipts)', formatBDT(i.paidAmount)],
          ['Balance due', formatBDT(invoiceOutstanding(i))]]
          } />
        
      </DocSection>
      <p className="text-[10.5px] text-slate-500">Pay by bank transfer, cheque or bKash quoting {i.id}. Payments count once verified by IOL Accounts. Times in Asia/Dhaka. Fictional demo document.</p>
    </>);

}

export function ReceiptPrintDocument({ receipt: r }: {receipt: Receipt;}) {
  const { db } = useData();
  const ba = db.billingAccounts.find((b) => b.id === r.billingAccountId);
  const stamp = r.status === 'Verified' ? undefined : r.status === 'Pending Verification' ? 'Unverified claim' : r.status;
  const allocations = r.status === 'Reversed' ? r.reversedAllocations ?? [] : r.allocations;
  return (
    <>
      <DocumentHeader
        docTitle={r.purpose === 'Security deposit' ? 'Deposit receipt' : 'Money receipt'}
        docId={r.id}
        stamp={stamp}
        meta={[
        { label: 'Received', value: formatDhaka(r.receivedAt, { year: true }) },
        { label: 'Method', value: r.method },
        { label: 'Amount', value: formatBDT(r.amount) },
        { label: 'Verified', value: r.verifiedAt && r.status === 'Verified' ? formatDhakaDate(r.verifiedAt) : '—' }]
        } />
      
      <DocSection title="Received from">
        <DocRows
          rows={[
          ['Payer', r.payer ?? '—'],
          ['Account', `${ba?.name ?? ''} (${r.billingAccountId})`],
          ['Reference', r.reference],
          ['Collector', r.collectorName ?? '—'],
          ['Verified by', r.verifiedById ? userName(r.verifiedById) : '—']]
          } />
        
      </DocSection>
      <DocSection title={r.purpose === 'Security deposit' ? 'Treatment' : 'Allocation'}>
        {r.purpose === 'Security deposit' ?
        <p>Held as a refundable security deposit. Not applied to monthly charges.</p> :

        <DocRows
          rows={[
          ...allocations.map((a): [string, string] => [a.invoiceId, formatBDT(a.amount)]),
          ['Unallocated advance', formatBDT(r.status === 'Verified' ? r.amount - r.allocations.reduce((s, a) => s + a.amount, 0) : 0)]]
          } />

        }
      </DocSection>
      {stamp && <p className="text-[11px] font-semibold text-status-critical">This document is not proof of payment: status {r.status}.</p>}
    </>);

}

export function StatementPrintDocument({ billingAccountId }: {billingAccountId: string;}) {
  const { db } = useData();
  const ba = db.billingAccounts.find((b) => b.id === billingAccountId)!;
  const b = accountBalances(db, ba.id);
  const rows = statementRows(db, ba.id);
  const notes = statementExplanations(db, ba.id);
  const t = termsOf(ba);
  return (
    <>
      <DocumentHeader
        docTitle="Statement of account"
        docId={ba.id}
        meta={[
        { label: 'As of', value: formatDhaka(demoNow().toISOString(), { year: true }) },
        { label: 'Terms', value: `${t.term}${t.term === 'Postpaid' ? ` · ${t.creditDays} days` : ''}` },
        { label: 'Contact', value: ba.billingContact },
        { label: 'Mode', value: ba.collectionMode }]
        } />
      
      <DocSection title="Balances">
        <DocRows
          rows={[
          ['Due (unpaid invoices)', formatBDT(b.due)],
          ['Advance (verified, unallocated)', formatBDT(b.advance)],
          ['Security deposit (held separately)', formatBDT(b.deposit)],
          ['Unverified payment claims (not counted)', formatBDT(b.pendingClaims)]]
          } />
        
      </DocSection>
      {notes.length > 0 &&
      <DocSection title="Why these balances">
          <ul className="list-disc space-y-0.5 pl-4 text-[11.5px]">
            {notes.map((n) =>
          <li key={n}>{n}</li>
          )}
          </ul>
        </DocSection>
      }
      <DocSection title="Transactions">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase text-slate-500">
              <th className="border-b border-slate-300 py-1">Date</th>
              <th className="border-b border-slate-300 py-1">Document</th>
              <th className="border-b border-slate-300 py-1">Description</th>
              <th className="border-b border-slate-300 py-1 text-right">Charges</th>
              <th className="border-b border-slate-300 py-1 text-right">Payments / credits</th>
              <th className="border-b border-slate-300 py-1 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) =>
            <tr key={`${r.doc}-${i}`} className="align-top text-[11px]">
                <td className="border-b border-slate-100 py-1 pr-2">{formatDhakaDate(r.at)}</td>
                <td className="border-b border-slate-100 py-1 pr-2 font-mono">{r.doc}</td>
                <td className="border-b border-slate-100 py-1 pr-2">{r.description}</td>
                <td className="border-b border-slate-100 py-1 text-right tabular-nums">{r.charge ? formatBDT(r.charge) : ''}</td>
                <td className="border-b border-slate-100 py-1 text-right tabular-nums">{r.credit ? formatBDT(r.credit) : ''}</td>
                <td className="border-b border-slate-100 py-1 text-right tabular-nums">{r.balance < 0 ? `${formatBDT(-r.balance)} CR` : formatBDT(r.balance)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-1 text-[10.5px] text-slate-500">Running balance = charges less verified payments and credits (CR = in credit). Security deposits are excluded.</p>
      </DocSection>
    </>);

}