import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useBillingScope } from '../../hooks/useBillingScope';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { dhakaDayAt, dhakaInputValue, demoNow, formatBDT, fromDhakaInput } from '../../utils/format';
import { accountBalances, termsOf } from '../../utils/billingCalc';

export function DueAllowDialog({ onClose, billingAccountId }: {onClose: () => void;billingAccountId?: string;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const { accounts } = useBillingScope();
  const now = demoNow().toISOString();
  const [ba, setBa] = useState(billingAccountId ?? accounts[0]?.id ?? '');
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');
  const [from, setFrom] = useState(dhakaInputValue(now));
  const [until, setUntil] = useState(dhakaInputValue(dhakaDayAt(now, 14)));
  const [review, setReview] = useState(dhakaInputValue(dhakaDayAt(now, 10)));
  const account = db.billingAccounts.find((b) => b.id === ba);
  const bal = account ? accountBalances(db, ba) : undefined;
  const approver = db.users.find((u) => u.role === 'financeApprover' && u.status !== 'Inactive');

  return (
    <CrmDialog
      title="Request due allow"
      description="Temporary credit beyond approved terms. While active and within the limit, the account is not flagged for suspension review."
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={!ba || !(Number(limit) > 0) || reason.trim().length < 10}
      onSubmit={() =>
      runAction({ type: 'BILL_REQUEST_DUE_ALLOW', billingAccountId: ba, creditLimit: Number(limit), reason, validFrom: fromDhakaInput(from, '00:00'), validUntil: fromDhakaInput(until, '23:59'), reviewAt: fromDhakaInput(review, '10:00') }) && onClose()
      }>
      
      <FormField label="Billing account" htmlFor="da-ba" required>
        <select id="da-ba" className={fieldInput} value={ba} onChange={(e) => setBa(e.target.value)}>
          {accounts.map((a) =>
          <option key={a.id} value={a.id}>
              {a.name} ({a.id})
            </option>
          )}
        </select>
      </FormField>
      {account && bal &&
      <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          {termsOf(account).term} account · due {formatBDT(bal.due)} · advance {formatBDT(bal.advance)} · deposit {formatBDT(bal.deposit)} (deposit is not counted toward the limit)
        </p>
      }
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Credit limit (BDT)" htmlFor="da-limit" required>
          <input id="da-limit" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ''))} />
        </FormField>
        <FormField label="Approver" htmlFor="da-appr" help="Set by the Due Allow approval rule">
          <input id="da-appr" className={`${fieldInput} bg-slate-50`} readOnly value={`Finance Approver${approver ? ` — ${approver.name}` : ''}`} />
        </FormField>
        <FormField label="Valid from" htmlFor="da-from" required>
          <input id="da-from" type="date" className={fieldInput} value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
        <FormField label="Valid until (expiry)" htmlFor="da-until" required>
          <input id="da-until" type="date" className={fieldInput} value={until} onChange={(e) => setUntil(e.target.value)} />
        </FormField>
        <FormField label="Review date" htmlFor="da-review" required help="On or before expiry">
          <input id="da-review" type="date" className={fieldInput} value={review} onChange={(e) => setReview(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Reason" htmlFor="da-reason" required help="At least 10 characters. Bangla or English.">
        <textarea id="da-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}