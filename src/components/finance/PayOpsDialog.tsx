import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaInputValue, formatBDT, fromDhakaInput } from '../../utils/format';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { PAYMENT_METHODS, type OpsExpense, type PaymentMethod } from '../../types/approvals';

export function PayOpsDialog({ expense: e, onClose }: {expense: OpsExpense;onClose: () => void;}) {
  const runAction = useRunAction();
  const [method, setMethod] = useState<PaymentMethod>('Bank transfer');
  const [reference, setReference] = useState('');
  const [at, setAt] = useState(dhakaInputValue(demoNow().toISOString(), true));
  return (
    <CrmDialog
      title={`Record payment — ${e.id}`}
      description={`${e.payee} · ${formatBDT(e.amount)}. The approver cannot record the payment.`}
      onClose={onClose}
      submitLabel="Mark paid"
      submitDisabled={reference.trim().length < 4 || !at}
      onSubmit={() => runAction({ type: 'OPS_PAY', id: e.id, method, reference, paidAt: fromDhakaInput(at) }) && onClose()}>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Method" htmlFor="pp-m" required>
          <select id="pp-m" className={fieldInput} value={method} onChange={(x) => setMethod(x.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) =>
            <option key={m}>{m}</option>
            )}
          </select>
        </FormField>
        <FormField label="Paid at" htmlFor="pp-at" required>
          <input id="pp-at" type="datetime-local" className={fieldInput} value={at} onChange={(x) => setAt(x.target.value)} />
        </FormField>
      </div>
      <FormField label="Payment reference" htmlFor="pp-ref" required help="Cheque, transfer or transaction number. Must be unique.">
        <input id="pp-ref" className={fieldInput} value={reference} onChange={(x) => setReference(x.target.value)} />
      </FormField>
    </CrmDialog>);

}