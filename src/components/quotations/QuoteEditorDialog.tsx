import React, { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { linkBtn } from '../admin/AdminPanel';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useQuoteForm } from './useQuoteForm';
import { dhakaInputValue, formatBDT, fromDhakaInput } from '../../utils/format';
import { redactAmounts } from '../../utils/customerProfile';
import { seesCommission, seesMargin, taxLabel } from '../../utils/quoteRules';
import { OWNERSHIP_OPTIONS, type Ownership } from '../../types/survey';
import type { ServiceType } from '../../types/records';
import type { QuotationTerms } from '../../types/quotation';

const SERVICES: ServiceType[] = ['Dedicated Internet', 'Broadband', 'IP Transit', 'Data Connectivity'];

type Mode = {kind: 'create';opportunityId: string;} | {kind: 'edit';quotationId: string;} | {kind: 'revise';quotationId: string;fromVersion: number;};

interface Props {
  mode: Mode;
  initial: QuotationTerms;
  customerId?: string;
  onClose: () => void;
}

/** Create a quotation, edit a draft version, or prepare a revision. Approved versions are never edited in place. */
export function QuoteEditorDialog({ mode, initial, customerId, onClose }: Props) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const { t, set, setCommission, updateEquipment, addEquipment, removeEquipment, errors, routes, agent } = useQuoteForm(initial);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const sites = customerId ? db.sites.filter((s) => s.customerId === customerId) : [];
  const commission = seesCommission(role);
  const reasonShort = mode.kind === 'revise' && reason.trim().length < 10;

  const num = (k: keyof QuotationTerms, label: string, help?: string, suffix?: string) =>
  <FormField label={label} htmlFor={`qt-${k}`} help={help}>
      <div className="relative">
        <input
        id={`qt-${k}`}
        inputMode="numeric"
        className={`${fieldInput} tabular-nums ${suffix ? 'pr-14' : ''}`}
        value={String(t[k] ?? 0)}
        onChange={(e) => set(k, (Number(e.target.value.replace(/[^\d]/g, '')) || 0) as never)} />
      
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{suffix}</span>}
      </div>
    </FormField>;


  const submit = (andSubmit: boolean) => {
    if (errors.length || reasonShort) {
      setShowErrors(true);
      return;
    }
    let ok = false;
    if (mode.kind === 'create') ok = runAction({ type: 'QUOTE_CREATE', opportunityId: mode.opportunityId, terms: t, submit: andSubmit });
    if (mode.kind === 'edit') ok = runAction({ type: 'QUOTE_SAVE', quotationId: mode.quotationId, terms: t }) && (!andSubmit || runAction({ type: 'QUOTE_SUBMIT', quotationId: mode.quotationId }));
    if (mode.kind === 'revise') ok = runAction({ type: 'QUOTE_REVISE', quotationId: mode.quotationId, terms: t, reason });
    if (ok) onClose();
  };

  const title = mode.kind === 'create' ? 'New quotation' : mode.kind === 'edit' ? 'Edit draft version' : `Revise — new version from v${mode.fromVersion}`;

  return (
    <CrmDialog
      size="lg"
      title={title}
      description={mode.kind === 'revise' ? 'The current version stays exactly as it was. The revision becomes a new draft that must be approved again.' : 'Amounts in BDT, excluding tax. Rate-card prices come from the service and bandwidth.'}
      onClose={onClose}
      onSubmit={() => submit(mode.kind !== 'revise')}
      submitLabel={mode.kind === 'revise' ? 'Create revision' : 'Save and submit for approval'}>
      
      {showErrors && (errors.length > 0 || reasonShort) &&
      <ul role="alert" className="space-y-0.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-status-critical">
          {reasonShort && <li>Give a reason for the revision (10+ characters).</li>}
          {errors.map((e) =>
        <li key={e}>{e}</li>
        )}
        </ul>
      }

      {mode.kind === 'revise' &&
      <FormField label="Reason for revision" htmlFor="qt-reason" required help="Recorded on the version history and audit log.">
          <textarea id="qt-reason" rows={2} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      }

      <fieldset className="space-y-4">
        <legend className="mb-1 text-[12.5px] font-bold text-slate-900">Customer, site and service</legend>
        {sites.length > 0 &&
        <FormField label="Existing site" htmlFor="qt-site" help="Choose an existing site, or a new site under this customer.">
            <select
            id="qt-site"
            className={fieldInput}
            value={t.siteId ?? ''}
            onChange={(e) => {
              const s = sites.find((x) => x.id === e.target.value);
              set('siteId', s?.id);
              if (s) {
                set('siteName', s.name);
                set('siteAddress', s.address);
              }
            }}>
            
              <option value="">New site</option>
              {sites.map((s) =>
            <option key={s.id} value={s.id}>
                  {s.name} — {s.address}
                </option>
            )}
            </select>
          </FormField>
        }
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <FormField label="Site name" htmlFor="qt-sname">
            <input id="qt-sname" className={fieldInput} value={t.siteName} disabled={!!t.siteId} onChange={(e) => set('siteName', e.target.value)} />
          </FormField>
          <FormField label="Site address" htmlFor="qt-saddr" required>
            <input id="qt-saddr" className={fieldInput} value={t.siteAddress} disabled={!!t.siteId} onChange={(e) => set('siteAddress', e.target.value)} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Service" htmlFor="qt-svc">
            <select id="qt-svc" className={fieldInput} value={t.serviceType} onChange={(e) => set('serviceType', e.target.value as ServiceType)}>
              {SERVICES.map((s) =>
              <option key={s}>{s}</option>
              )}
            </select>
          </FormField>
          {num('bandwidthMbps', 'Bandwidth', undefined, 'Mbps')}
          <FormField label="Description" htmlFor="qt-desc" className="sm:col-span-1">
            <input id="qt-desc" className={fieldInput} value={t.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-100 pt-4">
        <legend className="mb-1 text-[12.5px] font-bold text-slate-900">Prices</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {num('mrc', 'MRC', `Rate card ${formatBDT(t.listMrc)}`)}
          {num('otc', 'OTC (installation)', `Standard ${formatBDT(t.listOtc)}`)}
          {num('advanceRequired', 'Advance requirement', `Policy: ${db.quotePolicy.minAdvanceMonths} month(s) of MRC for prepaid`)}
          {num('securityDeposit', 'Security deposit', 'Refundable; not part of revenue')}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Payment terms</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['Prepaid', 'Postpaid'] as const).map((b) =>
              <label key={b} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-[13px] font-semibold transition-colors duration-150 sm:h-9 ${t.billingTerm === b ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="qt-billing" className="sr-only" checked={t.billingTerm === b} onChange={() => set('billingTerm', b)} />
                  {b}
                </label>
              )}
            </div>
          </fieldset>
          {t.billingTerm === 'Postpaid' ? num('creditDays', 'Credit period', `Standard ${db.quotePolicy.standardCreditDays} days`, 'days') : <div className="hidden sm:block" />}
          <FormField label="Tax treatment" htmlFor="qt-tax" help="Illustrative and configurable. No statutory rate is assumed.">
            <select id="qt-tax" className={fieldInput} value={t.taxTreatmentId} onChange={(e) => set('taxTreatmentId', e.target.value)}>
              {db.taxTreatments.map((x) =>
              <option key={x.id} value={x.id}>
                  {taxLabel(x)}
                </option>
              )}
            </select>
          </FormField>
        </div>
        {(agent || seesMargin(role)) &&
        <div className="grid gap-4 sm:grid-cols-2">
            {agent && (
          commission ?
          <FormField label={`Agent commission — ${agent.name}`} htmlFor="qt-comm" help={`${agent.commissionRule}. Approved by the Business Head only.`}>
                  <input id="qt-comm" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={String(t.agentCommission)} onChange={(e) => setCommission(Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                </FormField> :

          <p className="self-end rounded-md bg-slate-50 px-3 py-2 text-[11.5px] text-slate-600">Agent-sourced ({agent.name}). Commission follows the agent’s rule and is approved by the Business Head.</p>)
          }
            {seesMargin(role) && num('marginPct', 'Estimated margin', undefined, '%')}
          </div>
        }
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-100 pt-4">
        <legend className="mb-1 text-[12.5px] font-bold text-slate-900">Contract and delivery</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('contractMonths', 'Contract duration', undefined, 'months')}
          {num('leadTimeDays', 'Installation lead time', 'From work order release', 'days')}
          <FormField label="Valid until" htmlFor="qt-valid">
            <input id="qt-valid" type="date" className={fieldInput} value={dhakaInputValue(t.validUntil)} onChange={(e) => set('validUntil', fromDhakaInput(e.target.value, '23:59'))} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="border-t border-slate-100 pt-4">
        <legend className="mb-2 text-[12.5px] font-bold text-slate-900">Equipment ownership and return conditions</legend>
        <ul className="space-y-3">
          {t.equipment.map((e) =>
          <li key={e.id} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_200px_auto]">
              <input aria-label="Equipment item" className={fieldInput} value={e.item} onChange={(ev) => updateEquipment(e.id, { item: ev.target.value })} placeholder="Item" />
              <select aria-label="Ownership" className={fieldInput} value={e.ownership} onChange={(ev) => updateEquipment(e.id, { ownership: ev.target.value as Ownership })}>
                {OWNERSHIP_OPTIONS.map((o) =>
              <option key={o}>{o}</option>
              )}
              </select>
              <button type="button" aria-label={`Remove ${e.item || 'line'}`} onClick={() => removeEquipment(e.id)} className="justify-self-end rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-status-critical">
                <Trash2Icon className="h-4 w-4" />
              </button>
              <input aria-label="Return condition" className={`${fieldInput} sm:col-span-3`} value={e.returnCondition} onChange={(ev) => updateEquipment(e.id, { returnCondition: ev.target.value })} placeholder="Return condition" />
            </li>
          )}
        </ul>
        <button type="button" className={`${linkBtn} mt-2 inline-flex items-center gap-1`} onClick={addEquipment}>
          <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add equipment
        </button>
      </fieldset>

      <section aria-label="Approval routing" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
        <h3 className="text-[12px] font-bold text-slate-800">This version will be routed to</h3>
        <ul className="mt-1 space-y-1">
          {routes.map((r) =>
          <li key={r.kind} className="text-[12px] text-slate-700">
              <span className="font-semibold">{r.kind}</span> — {r.kind === 'Agent Commission Terms' && !commission ? redactAmounts(r.why) : r.why}
            </li>
          )}
        </ul>
      </section>

      {mode.kind !== 'revise' &&
      <div className="flex justify-end">
          <button type="button" className={linkBtn} onClick={() => submit(false)}>
            Save as draft without submitting
          </button>
        </div>
      }
    </CrmDialog>);

}