import React, { useState } from 'react';
import { PaperclipIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { FilePickButton } from '../field/FilePickButton';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { demoNow, dhakaInputValue, formatBDT, fromDhakaInput } from '../../utils/format';
import { invoiceOutstanding } from '../../utils/relations';
import { duplicateReceipt, openInvoices } from '../../utils/billingCalc';
import { RECEIPT_METHODS, type ReceiptMethod, type ReceiptPurpose } from '../../types/billing';

const REF_LABEL: Record<ReceiptMethod, string> = {
  Cash: 'Money-receipt book number',
  'Bank Transfer': 'Bank and transfer reference',
  'Bank Deposit': 'Bank and deposit slip number',
  Cheque: 'Bank and cheque number',
  bKash: 'bKash TrxID',
  'Other approved': 'Method and reference'
};

/** Collectors record a claim; it remains unverified until Accounts confirms it. */
export function RecordReceiptDialog({ onClose, billingAccountId }: {onClose: () => void;billingAccountId?: string;}) {
  const { db } = useData();
  const { user } = useSession();
  const runAction = useRunAction();
  const { accounts } = useBillingScope();
  const [ba, setBa] = useState(billingAccountId ?? accounts[0]?.id ?? '');
  const [purpose, setPurpose] = useState<ReceiptPurpose>('Payment');
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [when, setWhen] = useState(dhakaInputValue(demoNow().toISOString(), true));
  const [method, setMethod] = useState<ReceiptMethod>('Bank Transfer');
  const [reference, setReference] = useState('');
  const [collector, setCollector] = useState(user.name);
  const [evidence, setEvidence] = useState<string | undefined>();
  const [intended, setIntended] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const open = openInvoices(db, ba);
  const dup = reference.trim() ? duplicateReceipt(db, method, reference) : undefined;

  return (
    <CrmDialog
      size="lg"
      title="Record payment claim"
      description="Captured as unverified. Balances change only after Accounts checks the evidence and verifies it."
      onClose={onClose}
      submitLabel="Record claim"
      submitDisabled={!ba || !payer.trim() || !(Number(amount) > 0) || !reference.trim() || !!dup}
      onSubmit={() =>
      runAction({
        type: 'BILL_CLAIM_RECEIPT', billingAccountId: ba, amount: Number(amount), method, reference, receivedAt: fromDhakaInput(when), payer, collectorName: collector, evidence, purpose, intendedInvoiceIds: intended, note
      }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Billing account" htmlFor="rc-ba" required>
          <select id="rc-ba" className={fieldInput} value={ba} onChange={(e) => {setBa(e.target.value);setIntended([]);}}>
            {accounts.map((a) =>
            <option key={a.id} value={a.id}>
                {a.name} ({a.id})
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Purpose" htmlFor="rc-purpose" required help={purpose === 'Security deposit' ? 'Held separately; never applied to monthly charges.' : undefined}>
          <select id="rc-purpose" className={fieldInput} value={purpose} onChange={(e) => setPurpose(e.target.value as ReceiptPurpose)}>
            <option>Payment</option>
            <option>Security deposit</option>
          </select>
        </FormField>
        <FormField label="Payer" htmlFor="rc-payer" required help="Bangla or English">
          <input id="rc-payer" className={fieldInput} value={payer} onChange={(e) => setPayer(e.target.value)} />
        </FormField>
        <FormField label="Amount (BDT)" htmlFor="rc-amt" required>
          <input id="rc-amt" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} />
        </FormField>
        <FormField label="Date received (Asia/Dhaka)" htmlFor="rc-when" required>
          <input id="rc-when" type="datetime-local" className={fieldInput} value={when} onChange={(e) => setWhen(e.target.value)} />
        </FormField>
        <FormField label="Method" htmlFor="rc-method" required>
          <select id="rc-method" className={fieldInput} value={method} onChange={(e) => setMethod(e.target.value as ReceiptMethod)}>
            {RECEIPT_METHODS.map((m) =>
            <option key={m}>{m}</option>
            )}
          </select>
        </FormField>
        <FormField label={REF_LABEL[method]} htmlFor="rc-ref" required error={dup ? `Already used on ${dup.id} (${dup.status}).` : undefined}>
          <input id="rc-ref" className={`${fieldInput} font-mono`} value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
        <FormField label="Collector" htmlFor="rc-col">
          <input id="rc-col" className={fieldInput} value={collector} onChange={(e) => setCollector(e.target.value)} />
        </FormField>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Evidence</p>
        <div className="flex flex-wrap items-center gap-2">
          <FilePickButton label="Attach slip, cheque or screenshot" accept="image/*,.pdf" onPick={(f) => setEvidence(f[0]?.name)} icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} />
          {evidence && <span className="text-[11.5px] text-slate-600">{evidence} — name only; nothing is uploaded in this demo.</span>}
        </div>
      </div>

      {purpose === 'Payment' && open.length > 0 &&
      <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Intended for (suggestion — Accounts decides on verification)</legend>
          <ul className="space-y-1">
            {open.map((i) =>
          <li key={i.id}>
                <label className="flex items-center gap-2 text-[12.5px] text-slate-800">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={intended.includes(i.id)} onChange={(e) => setIntended(e.target.checked ? [...intended, i.id] : intended.filter((x) => x !== i.id))} />
                  {i.id} · {i.period} · {formatBDT(invoiceOutstanding(i))} outstanding
                </label>
              </li>
          )}
          </ul>
        </fieldset>
      }

      <FormField label="Note (optional)" htmlFor="rc-note">
        <textarea id="rc-note" rows={2} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}