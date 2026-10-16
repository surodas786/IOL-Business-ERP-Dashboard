import React from 'react';
import { PaperclipIcon, ReceiptIcon, XIcon } from 'lucide-react';
import { FormField } from '../admin/FormField';
import { FilePickButton } from './FilePickButton';
import { fieldInput } from './fieldStyles';
import { RECEIPT_THRESHOLD, parseTaka, receiptRequired, type DraftErrors, type ExpenseLineDraft } from '../../utils/fieldRules';
import { EXPENSE_CATEGORIES, EXPENSE_RELATIONS, type ExpenseCategory, type ExpenseRelation } from '../../types/field';

interface ExpenseLineFieldsProps {
  idPrefix: string;
  value: ExpenseLineDraft;
  onChange: (next: ExpenseLineDraft) => void;
  errors?: DraftErrors<ExpenseLineDraft>;
  /** Hide the date when it is taken from the visit. */
  hideDate?: boolean;
}

/** One expense line: category, amount, purpose, acquisition vs servicing, and receipt. */
export function ExpenseLineFields({ idPrefix, value: v, onChange, errors: e = {}, hideDate }: ExpenseLineFieldsProps) {
  const set = <K extends keyof ExpenseLineDraft,>(k: K, val: ExpenseLineDraft[K]) => onChange({ ...v, [k]: val });
  const req = receiptRequired({ category: v.category, amount: parseTaka(v.amount) });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Category" htmlFor={`${idPrefix}-cat`}>
        <select id={`${idPrefix}-cat`} className={fieldInput} value={v.category} onChange={(ev) => set('category', ev.target.value as ExpenseCategory)}>
          {EXPENSE_CATEGORIES.map((c) =>
          <option key={c}>{c}</option>
          )}
        </select>
      </FormField>
      <FormField label="Amount (৳)" htmlFor={`${idPrefix}-amt`} required error={e.amount}>
        <input id={`${idPrefix}-amt`} className={fieldInput} inputMode="decimal" value={v.amount} onChange={(ev) => set('amount', ev.target.value)} placeholder="0" />
      </FormField>
      {!hideDate &&
      <FormField label="Date" htmlFor={`${idPrefix}-date`} required error={e.date}>
          <input id={`${idPrefix}-date`} type="date" className={fieldInput} value={v.date} onChange={(ev) => set('date', ev.target.value)} />
        </FormField>
      }
      <FormField label="Purpose" htmlFor={`${idPrefix}-purpose`} required error={e.purpose} className={hideDate ? 'sm:col-span-2' : ''}>
        <input id={`${idPrefix}-purpose`} className={fieldInput} value={v.purpose} onChange={(ev) => set('purpose', ev.target.value)} placeholder="e.g. CNG Uttara → Konabari" />
      </FormField>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Relates to</legend>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_RELATIONS.map((r) =>
          <label
            key={r}
            className={`flex min-h-[40px] cursor-pointer items-center justify-center rounded-md border px-2 text-center text-[12.5px] font-semibold transition-colors duration-150 ${
            v.relation === r ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`
            }>
            
              <input type="radio" className="sr-only" name={`${idPrefix}-rel`} checked={v.relation === r} onChange={() => set('relation', r as ExpenseRelation)} />
              {r}
            </label>
          )}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Receipt
          {req === 'always' && <span className="ml-1 font-normal text-slate-500">— required for entertainment</span>}
          {req === 'threshold' && <span className="ml-1 font-normal text-slate-500">— required from ৳ {RECEIPT_THRESHOLD}, or give a reason</span>}
        </p>
        {v.receipt ?
        <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-800">
            <PaperclipIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{v.receipt.name}</span>
            <button type="button" aria-label="Remove receipt" onClick={() => set('receipt', undefined)} className="rounded p-1 text-slate-500 hover:bg-slate-200">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </p> :

        <div className="flex flex-wrap gap-2">
            <FilePickButton label="Photo or file" accept="image/*,application/pdf" capture icon={<ReceiptIcon className="h-3.5 w-3.5" aria-hidden />} onPick={([f]) => set('receipt', f)} />
            <button
            type="button"
            onClick={() => set('receipt', { name: `demo_receipt_${v.date || 'today'}.jpg`, sizeKb: 240 })}
            className="inline-flex h-10 items-center rounded-md px-2 text-[12px] font-semibold text-primary hover:text-primary-hover sm:h-8">
            
              Add demo receipt
            </button>
          </div>
        }
        {!v.receipt && req === 'threshold' &&
        <input aria-label="Reason there is no receipt" className={`${fieldInput} mt-2`} value={v.noReceiptReason} onChange={(ev) => set('noReceiptReason', ev.target.value)} placeholder="Why is there no receipt? e.g. CNG fare" />
        }
        {e.receipt &&
        <p role="alert" className="mt-1.5 text-[11.5px] text-status-critical">
            {e.receipt}
          </p>
        }
      </div>
    </div>);

}