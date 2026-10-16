import React, { useState } from 'react';
import { PaperclipIcon, XIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow } from '../../utils/format';
import { periodOf } from '../../utils/opsFinanceRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { FilePickButton } from '../field/FilePickButton';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { OPS_CATEGORIES, type OpsCategory, type RecurringPayment } from '../../types/approvals';
import type { FileRef } from '../../types/field';
import type { BranchId } from '../../types/erp';

export function NewOpsPaymentDialog({ onClose, from }: {onClose: () => void;from?: {rule: RecurringPayment;period: string;};}) {
  const runAction = useRunAction();
  const [category, setCategory] = useState<OpsCategory>(from?.rule.category ?? 'Conveyance');
  const [payee, setPayee] = useState(from?.rule.payee ?? '');
  const [amount, setAmount] = useState(from ? String(from.rule.amount) : '');
  const [branchId, setBranchId] = useState<BranchId>(from?.rule.branchId ?? 'dhaka-south');
  const [period, setPeriod] = useState(from?.period ?? periodOf(demoNow()));
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<FileRef[]>([]);
  const [evidenceRef, setEvidenceRef] = useState('');
  const salary = category === 'Salary payment';
  const ready = payee.trim().length >= 3 && Number(amount) > 0 && description.trim().length >= 10 && (evidence.length > 0 || evidenceRef.trim().length >= 3);

  return (
    <CrmDialog
      size="lg"
      title={from ? `Record ${from.rule.payee}` : 'Record operational payment'}
      description="Goes to the Finance Approver. Accounts records the payment reference once approved."
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={!ready}
      onSubmit={() =>
      runAction({ type: 'OPS_CREATE', draft: { category, payee, amount: Number(amount), branchId, period, description, evidence, evidenceRef, recurringId: from?.rule.id } }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="op-cat" required>
          <select id="op-cat" className={fieldInput} value={category} onChange={(e) => setCategory(e.target.value as OpsCategory)} disabled={!!from}>
            {OPS_CATEGORIES.map((c) =>
            <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
        <FormField label="Branch" htmlFor="op-br" required>
          <select id="op-br" className={fieldInput} value={branchId} onChange={(e) => setBranchId(e.target.value as BranchId)}>
            {branches.map((b) =>
            <option key={b.id} value={b.id}>
                {b.name}
              </option>
            )}
          </select>
        </FormField>
      </div>
      {salary &&
      <p role="note" className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          Salary is recorded as a payment only. Enter the total from the HR-approved bank sheet — no payroll, attendance or leave is calculated here.
        </p>
      }
      <FormField label="Payee" htmlFor="op-payee" required help={salary ? 'For example “Sylhet branch staff (bank sheet)”.' : undefined}>
        <input id="op-payee" className={fieldInput} value={payee} onChange={(e) => setPayee(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount (BDT)" htmlFor="op-amt" required>
          <input id="op-amt" inputMode="numeric" className={fieldInput} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} />
        </FormField>
        <FormField label="Period" htmlFor="op-per" required>
          <input id="op-per" type="month" className={fieldInput} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Description" htmlFor="op-desc" required help="What the payment is for. At least 10 characters.">
        <textarea id="op-desc" rows={2} className={fieldTextarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <FormField label="Evidence" htmlFor="op-ref" required help="Attach the bill, agreement or bank sheet, or enter its reference.">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilePickButton label="Attach file" multiple icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} onPick={(f) => setEvidence((x) => [...x, ...f])} />
            <input id="op-ref" className={`${fieldInput} flex-1`} placeholder="Bill / voucher / agreement no." value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} />
          </div>
          {evidence.length > 0 &&
          <ul className="flex flex-wrap gap-1.5">
              {evidence.map((f, i) =>
            <li key={i} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-700">
                  {f.name}
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setEvidence((x) => x.filter((_, j) => j !== i))}>
                    <XIcon className="h-3 w-3" aria-hidden />
                  </button>
                </li>
            )}
            </ul>
          }
        </div>
      </FormField>
    </CrmDialog>);

}