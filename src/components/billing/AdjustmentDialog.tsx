import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { formatBDT } from '../../utils/format';
import { invoiceOutstanding } from '../../utils/relations';
import type { AdjustmentKind } from '../../types/billing';

const HELP: Record<AdjustmentKind, string> = {
  'Credit note': 'Reduces what is owed on one invoice, up to its outstanding amount. The invoice itself is not edited.',
  'Debit adjustment': 'Posts a separate adjustment invoice for an approved extra charge.',
  'Receipt reversal': 'Reverses a verified receipt (for example a dishonoured cheque). Its allocations are undone and the invoices become due again.'
};

interface Props {
  onClose: () => void;
  kind?: AdjustmentKind;
  billingAccountId?: string;
  invoiceId?: string;
  receiptId?: string;
}

export function AdjustmentDialog({ onClose, ...preset }: Props) {
  const { db } = useData();
  const runAction = useRunAction();
  const { accounts } = useBillingScope();
  const [kind, setKind] = useState<AdjustmentKind>(preset.kind ?? 'Credit note');
  const [ba, setBa] = useState(preset.billingAccountId ?? accounts[0]?.id ?? '');
  const invoices = db.invoices.filter((i) => i.billingAccountId === ba && invoiceOutstanding(i) > 0);
  const receipts = db.receipts.filter((r) => r.billingAccountId === ba && r.status === 'Verified');
  const [invoiceId, setInvoiceId] = useState(preset.invoiceId ?? '');
  const [receiptId, setReceiptId] = useState(preset.receiptId ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const inv = invoices.find((i) => i.id === (invoiceId || invoices[0]?.id));
  const rc = receipts.find((r) => r.id === (receiptId || receipts[0]?.id));

  const ready = reason.trim().length >= 10 && (kind === 'Receipt reversal' ? !!rc : Number(amount) > 0 && (kind === 'Debit adjustment' || !!inv));

  return (
    <CrmDialog
      title="Request adjustment"
      description={`${HELP[kind]} Finance Approver must approve; nothing changes before that.`}
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={!ready}
      onSubmit={() =>
      runAction({ type: 'BILL_REQUEST_ADJUSTMENT', kind, billingAccountId: ba, invoiceId: kind === 'Credit note' ? inv?.id : undefined, receiptId: kind === 'Receipt reversal' ? rc?.id : undefined, amount: Number(amount) || 0, reason }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="adj-kind" required>
          <select id="adj-kind" className={fieldInput} value={kind} onChange={(e) => setKind(e.target.value as AdjustmentKind)} disabled={!!preset.kind}>
            {(Object.keys(HELP) as AdjustmentKind[]).map((k) =>
            <option key={k}>{k}</option>
            )}
          </select>
        </FormField>
        <FormField label="Billing account" htmlFor="adj-ba" required>
          <select id="adj-ba" className={fieldInput} value={ba} onChange={(e) => {setBa(e.target.value);setInvoiceId('');setReceiptId('');}} disabled={!!preset.billingAccountId}>
            {accounts.map((a) =>
            <option key={a.id} value={a.id}>
                {a.name} ({a.id})
              </option>
            )}
          </select>
        </FormField>
        {kind === 'Credit note' &&
        <FormField label="Invoice" htmlFor="adj-inv" required>
            <select id="adj-inv" className={fieldInput} value={inv?.id ?? ''} onChange={(e) => setInvoiceId(e.target.value)}>
              {invoices.length === 0 && <option value="">No open invoices</option>}
              {invoices.map((i) =>
            <option key={i.id} value={i.id}>
                  {i.id} · {i.period} · {formatBDT(invoiceOutstanding(i))} outstanding
                </option>
            )}
            </select>
          </FormField>
        }
        {kind === 'Receipt reversal' &&
        <FormField label="Receipt" htmlFor="adj-rc" required>
            <select id="adj-rc" className={fieldInput} value={rc?.id ?? ''} onChange={(e) => setReceiptId(e.target.value)}>
              {receipts.length === 0 && <option value="">No verified receipts</option>}
              {receipts.map((r) =>
            <option key={r.id} value={r.id}>
                  {r.id} · {r.method} · {formatBDT(r.amount)}
                </option>
            )}
            </select>
          </FormField>
        }
        {kind !== 'Receipt reversal' &&
        <FormField label="Amount (BDT)" htmlFor="adj-amt" required help={kind === 'Credit note' && inv ? `Up to ${formatBDT(invoiceOutstanding(inv))}` : undefined}>
            <input id="adj-amt" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} />
          </FormField>
        }
      </div>
      <FormField label="Reason" htmlFor="adj-reason" required help="At least 10 characters. Shown on the customer statement for credit notes.">
        <textarea id="adj-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}