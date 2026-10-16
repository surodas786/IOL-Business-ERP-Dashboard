import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { branches } from '../../data/branches';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { canEditTerms, createsCycle } from '../../utils/associateRules';
import { useAssociateForm, type AssociateDraft } from './useAssociateForm';
import { SHARING_BASES } from '../../types/associate';
import type { Associate } from '../../types/records';

const RESP = ['IOL', 'Associate', 'Shared'];

function Section({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <fieldset className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <legend className="mb-2 text-[11.5px] font-bold text-slate-900">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>);

}

export function AssociateFormDialog({ associate, onClose }: {associate?: Associate;onClose: () => void;}) {
  const { db } = useData();
  const { role } = useSession();
  const { d, set, errors, submit, parentFree } = useAssociateForm(associate, onClose);
  const terms = canEditTerms(role);
  const branch = branches.find((b) => b.id === d.branchId);
  const parents = db.associates.filter((a) => !associate || a.id !== associate.id && !createsCycle(db, associate.id, a.id));
  const text = (k: keyof AssociateDraft, label: string, opts: {required?: boolean;help?: string;error?: string;numeric?: boolean;placeholder?: string;disabled?: boolean;date?: boolean;} = {}) =>
  <FormField label={label} htmlFor={`af-${k}`} required={opts.required} help={opts.help} error={opts.error}>
      <input id={`af-${k}`} type={opts.date ? 'date' : 'text'} inputMode={opts.numeric ? 'numeric' : undefined} disabled={opts.disabled} placeholder={opts.placeholder} className={`${fieldInput} ${opts.numeric ? 'tabular-nums' : ''}`} value={d[k]} onChange={(e) => set(k)(opts.numeric ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)} />
    </FormField>;

  const select = (k: keyof AssociateDraft, label: string, options: {v: string;l: string;}[], opts: {required?: boolean;error?: string;help?: string;disabled?: boolean;} = {}) =>
  <FormField label={label} htmlFor={`af-${k}`} required={opts.required} error={opts.error} help={opts.help}>
      <select id={`af-${k}`} disabled={opts.disabled} className={fieldInput} value={d[k]} onChange={(e) => set(k)(e.target.value)}>
        {options.map((o) =>
      <option key={o.v} value={o.v}>
            {o.l}
          </option>
      )}
      </select>
    </FormField>;


  return (
    <CrmDialog size="lg" title={associate ? `Edit ${associate.name}` : 'New associate'} description="Local ISP / MAC partner agreement. Approved settlements are never recalculated when terms change." onClose={onClose} submitLabel={associate ? 'Save changes' : 'Create associate'} onSubmit={submit}>
      <div className="space-y-4">
        <Section title="Identity and contacts">
          {text('name', 'Name', { required: true, error: errors.name })}
          {text('nameBn', 'Name (বাংলা)')}
          {text('address', 'Address')}
          {text('tradeLicenceNo', 'Trade licence number')}
          {text('contactName', 'Primary contact', { required: true, error: errors.contact })}
          {text('contactPhone', 'Contact phone', { required: true, placeholder: '+880 17xx-xxxxxx' })}
        </Section>
        <Section title="Territory and ownership">
          {text('territory', 'Territory', { required: true, error: errors.territory })}
          {select('responsibleExecutiveId', 'Responsible executive', [{ v: '', l: 'Choose…' }, ...db.users.filter((u) => u.status === 'Active' && ['salesExecutive', 'businessHead', 'accountManager'].includes(u.role)).map((u) => ({ v: u.id, l: u.name }))], { required: true, error: errors.responsibleExecutiveId })}
          {select('branchId', 'Branch', branches.map((b) => ({ v: b.id, l: b.name })))}
          {select('zoneId', 'Zone', (branch?.zones ?? []).map((z) => ({ v: z.id, l: z.name })))}
          {select('parentId', 'Parent associate', [{ v: '', l: 'None — reports directly to IOL' }, ...parents.map((a) => ({ v: a.id, l: `${a.name}${a.revenueSharePct ? ` (${a.revenueSharePct}%)` : ''}` }))], {
            error: errors.parentId,
            help: d.parentId && terms ? `${parentFree}% of the parent's allotment is still available.` : 'Associates that would create a loop are not offered.'
          })}
          {text('clientIdPrefix', 'Client ID prefix', { required: true, error: errors.clientIdPrefix, placeholder: 'e.g. UNP' })}
          {select('backbone', 'Backbone responsibility', RESP.map((r) => ({ v: r, l: r })))}
          {select('lastMile', 'Last-mile responsibility', RESP.map((r) => ({ v: r, l: r })))}
        </Section>
        <Section title="Commercial terms">
          {select('collectionModel', 'Collection model', ['Centralised', 'Decentralised', 'Fixed Monthly'].map((m) => ({ v: m, l: m })), { disabled: !terms, help: terms ? undefined : 'Commercial terms are editable by finance-cleared roles only.' })}
          {d.collectionModel === 'Fixed Monthly' ?
          terms && text('fixedMonthly', 'Fixed monthly amount (BDT)', { required: true, numeric: true, error: errors.fixedMonthly }) :

          <>
              {terms && select('sharingBasis', 'Sharing basis', SHARING_BASES.map((b) => ({ v: b, l: b })), { required: true, error: errors.sharingBasis })}
              {terms && text('revenueSharePct', 'Associate share (%)', { required: true, numeric: true, error: errors.revenueSharePct, help: 'Cannot exceed 100% or the parent’s available allotment.' })}
            </>
          }
          {select('vatBearer', 'VAT cost borne by', ['IOL', 'Associate', 'Subscriber'].map((v) => ({ v, l: v })))}
          {text('agreementStart', 'Agreement start', { required: true, date: true, error: errors.agreement })}
          {text('agreementEnd', 'Agreement end', { required: true, date: true })}
        </Section>
        <Section title="Settlement, credit and renewals">
          {text('settlementDay', 'Settlement deadline (day of next month)', { required: true, numeric: true, error: errors.settlementDay })}
          {text('graceDays', 'Grace period (days)', { required: true, numeric: true, error: errors.graceDays, help: 'After this, the associate is flagged for suspension review.' })}
          {terms && text('creditLimit', 'Credit limit (BDT)', { numeric: true, error: errors.credit })}
          {terms && text('creditDays', 'Credit days', { numeric: true })}
          {terms && text('depositRequired', 'Security deposit required (BDT)', { numeric: true })}
          {text('subscribers', 'Downstream subscribers', { numeric: true })}
          {text('minRenewalDays', 'Minimum renewal days', { required: true, numeric: true, error: errors.renewal })}
          {text('maxRenewalDays', 'Maximum renewal days', { required: true, numeric: true })}
        </Section>
        <FormField label="Associated services / downstream client summary" htmlFor="af-svc">
          <textarea id="af-svc" rows={2} className={fieldTextarea} value={d.servicesSummary} onChange={(e) => set('servicesSummary')(e.target.value)} />
        </FormField>
      </div>
    </CrmDialog>);

}