import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { branches } from '../../data/branches';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { dhakaInputValue, fromDhakaInput } from '../../utils/format';
import type { SalesAgent } from '../../types/records';
import type { CommissionArrangement, CommissionBasis } from '../../types/agent';

const s = (v: unknown) => v === undefined || v === null ? '' : String(v);

/** Agent identity, territory and agreement. Standard rates are defaults for proposals only. */
export function AgentFormDialog({ agent, onClose }: {agent?: SalesAgent;onClose: () => void;}) {
  const runAction = useRunAction();
  const [f, setF] = useState({
    name: s(agent?.name), nameBn: s(agent?.nameBn), phone: s(agent?.phone), email: s(agent?.email), nid: s(agent?.nid), address: s(agent?.address), territory: s(agent?.territory),
    branchId: s(agent?.branchId ?? 'dhaka-north'), zoneId: s(agent?.zoneId ?? 'uttara'), status: s(agent?.status ?? 'Active'),
    agreementStart: dhakaInputValue(agent?.agreementStart), agreementEnd: dhakaInputValue(agent?.agreementEnd),
    standardBasis: s(agent?.standardBasis ?? 'MRC'), standardArrangement: s(agent?.standardArrangement ?? 'One-time'), standardMrcPct: s(agent?.standardMrcPct), standardOtcPct: s(agent?.standardOtcPct), standardMonths: s(agent?.standardMonths ?? 12)
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v, ...(k === 'branchId' ? { zoneId: branches.find((b) => b.id === v)?.zones[0]?.id ?? '' } : {}) }));
  const branch = branches.find((b) => b.id === f.branchId);
  const ready = f.name.trim().length >= 3 && !!f.phone.trim() && !!f.territory.trim() && !!f.agreementStart && !!f.agreementEnd;

  const submit = () => {
    const a: SalesAgent = {
      ...(agent ?? { id: 'NEW', activations: 0, commissionApprovedYtd: 0, commissionRule: '' }),
      name: f.name.trim(), nameBn: f.nameBn.trim(), phone: f.phone.trim(), email: f.email.trim() || undefined, nid: f.nid.trim() || undefined, address: f.address.trim() || undefined, territory: f.territory.trim(),
      branchId: f.branchId as SalesAgent['branchId'], zoneId: f.zoneId, status: f.status as SalesAgent['status'],
      agreementStart: fromDhakaInput(f.agreementStart, '00:00'), agreementEnd: fromDhakaInput(f.agreementEnd, '23:59'),
      standardBasis: f.standardBasis as CommissionBasis, standardArrangement: f.standardArrangement as CommissionArrangement,
      standardMrcPct: Number(f.standardMrcPct) || 0, standardOtcPct: Number(f.standardOtcPct) || 0, standardMonths: Number(f.standardMonths) || 1
    };
    if (runAction({ type: 'AGT_SAVE_AGENT', agent: a, isNew: !agent })) onClose();
  };

  const text = (k: keyof typeof f, label: string, opts: {required?: boolean;type?: string;placeholder?: string;help?: string;} = {}) =>
  <FormField label={label} htmlFor={`ag-${k}`} required={opts.required} help={opts.help}>
      <input id={`ag-${k}`} type={opts.type ?? 'text'} placeholder={opts.placeholder} className={fieldInput} value={f[k]} onChange={(e) => set(k)(e.target.value)} />
    </FormField>;


  return (
    <CrmDialog size="lg" title={agent ? `Edit ${agent.name}` : 'New sales agent'} description="Payment details are added separately by Accounts." onClose={onClose} submitLabel={agent ? 'Save changes' : 'Create agent'} submitDisabled={!ready} onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        {text('name', 'Name', { required: true })}
        {text('nameBn', 'Name (বাংলা)')}
        {text('phone', 'Phone', { required: true, placeholder: '+880 17xx-xxxxxx' })}
        {text('email', 'Email', { type: 'email' })}
        {text('nid', 'NID number')}
        {text('address', 'Address')}
        {text('territory', 'Territory', { required: true })}
        <FormField label="Status" htmlFor="ag-status">
          <select id="ag-status" className={fieldInput} value={f.status} onChange={(e) => set('status')(e.target.value)}>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </FormField>
        <FormField label="Branch" htmlFor="ag-branch">
          <select id="ag-branch" className={fieldInput} value={f.branchId} onChange={(e) => set('branchId')(e.target.value)}>
            {branches.map((b) =>
            <option key={b.id} value={b.id}>
                {b.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Zone" htmlFor="ag-zone">
          <select id="ag-zone" className={fieldInput} value={f.zoneId} onChange={(e) => set('zoneId')(e.target.value)}>
            {(branch?.zones ?? []).map((z) =>
            <option key={z.id} value={z.id}>
                {z.name}
              </option>
            )}
          </select>
        </FormField>
        {text('agreementStart', 'Agreement start', { required: true, type: 'date' })}
        {text('agreementEnd', 'Agreement end', { required: true, type: 'date' })}
      </div>
      <fieldset className="border-t border-slate-100 pt-3">
        <legend className="mb-1 text-[11.5px] font-bold text-slate-900">Standard terms</legend>
        <p className="mb-2 text-[11.5px] text-slate-500">Pre-fill new proposals. Every deal’s rate is still approved separately by the Business Head.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Basis" htmlFor="ag-basis">
            <select id="ag-basis" className={fieldInput} value={f.standardBasis} onChange={(e) => set('standardBasis')(e.target.value)}>
              {['MRC', 'OTC', 'MRC + OTC'].map((b) =>
              <option key={b}>{b}</option>
              )}
            </select>
          </FormField>
          <FormField label="Arrangement" htmlFor="ag-arr">
            <select id="ag-arr" className={fieldInput} value={f.standardArrangement} onChange={(e) => set('standardArrangement')(e.target.value)}>
              <option>One-time</option>
              <option>Recurring</option>
            </select>
          </FormField>
          {text('standardMonths', 'Recurring months')}
          {text('standardMrcPct', 'MRC rate (%)')}
          {text('standardOtcPct', 'OTC rate (%)')}
        </div>
      </fieldset>
    </CrmDialog>);

}