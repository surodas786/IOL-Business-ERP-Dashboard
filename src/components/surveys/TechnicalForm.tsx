import React, { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { FormField } from '../admin/FormField';
import { StatusBadge } from '../records/StatusBadge';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { canEditTechnical, componentLabels, submissionGaps } from '../../utils/surveyRules';
import { DELIVERY_MEDIA } from '../../types/customer';
import {
  CAPACITY_STATES,
  LAST_MILE_OWNERS,
  NTTN_DEPENDENCIES,
  REDUNDANCY_OPTIONS,
  SURVEY_OUTCOMES,
  type SurveyTechnical } from
'../../types/survey';
import type { Survey } from '../../types/records';

type Tech = Partial<SurveyTechnical>;

/** Mobile-friendly technical survey form. Read-only outside In Progress / Returned. */
export function TechnicalForm({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const labels = componentLabels(db);
  const editable = canEditTechnical(s, user, role);
  const [t, setT] = useState<Tech>(s.tech ?? {});
  const set = <K extends keyof SurveyTechnical,>(k: K, v: SurveyTechnical[K]) => setT((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(t) !== JSON.stringify(s.tech ?? {});
  const gaps = submissionGaps({ ...s, tech: t });

  if (!editable) return <TechnicalSummary survey={s} />;

  const text = (k: keyof SurveyTechnical, label: string, opts: {placeholder?: string;numeric?: boolean;required?: boolean;area?: boolean;className?: string;} = {}) =>
  <FormField label={label} htmlFor={`t-${k}`} required={opts.required} className={opts.className}>
      {opts.area ?
    <textarea id={`t-${k}`} rows={2} className={fieldTextarea} value={t[k] as string ?? ''} onChange={(e) => set(k, e.target.value as never)} placeholder={opts.placeholder} /> :

    <input id={`t-${k}`} inputMode={opts.numeric ? 'numeric' : undefined} className={fieldInput} value={t[k] as string ?? ''} onChange={(e) => set(k, (opts.numeric ? e.target.value.replace(/[^\d.]/g, '') : e.target.value) as never)} placeholder={opts.placeholder} />
    }
    </FormField>;

  const select = <K extends keyof SurveyTechnical,>(k: K, label: string, options: readonly string[]) =>
  <FormField label={label} htmlFor={`t-${k}`} required>
      <select id={`t-${k}`} className={fieldInput} value={t[k] as string ?? ''} onChange={(e) => set(k, e.target.value as SurveyTechnical[K])}>
        <option value="">Choose…</option>
        {options.map((o) =>
      <option key={o}>{o}</option>
      )}
      </select>
    </FormField>;


  return (
    <div className="space-y-3 pb-20 sm:pb-0">
      {gaps.length > 0 &&
      <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">
          <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" aria-hidden />
          <span>Needed before submitting for review: {gaps.join(', ')}.</span>
        </p>
      }

      <AdminPanel title="Connection and route">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
              Connection medium<span className="ml-0.5 text-status-critical">*</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY_MEDIA.map((m) =>
              <label key={m} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-[13px] font-semibold transition-colors duration-150 sm:h-9 ${t.medium === m ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="t-medium" className="sr-only" checked={t.medium === m} onChange={() => set('medium', m)} />
                  {m}
                </label>
              )}
            </div>
          </fieldset>
          {text('nearbyPop', 'Nearby PoP', { required: true, placeholder: 'e.g. Agrabad PoP' })}
          {text('popDistanceM', 'Distance from PoP (m)', { numeric: true })}
          {text('route', 'Route', { required: true, area: true, className: 'sm:col-span-2', placeholder: 'Poles, ducts, risers, crossings' })}
          {select('lastMile', 'Last-mile responsibility', LAST_MILE_OWNERS)}
          {select('nttn', 'NTTN / upstream dependency', NTTN_DEPENDENCIES)}
          {text('nttnNotes', 'Dependency notes', { area: true, className: 'sm:col-span-2', placeholder: 'Partner, lead time, handover point' })}
        </div>
      </AdminPanel>

      <AdminPanel title="Capacity and network components">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          {select('capacity', 'Capacity availability', CAPACITY_STATES)}
          {text('capacityNotes', 'Capacity notes', { placeholder: 'Uplink utilisation, upgrade needed' })}
          <Component label={labels.ggc} confirmed={labels.ggcConfirmed} checked={!!t.ggcRequired} onCheck={(v) => set('ggcRequired', v)} notes={t.ggcNotes ?? ''} onNotes={(v) => set('ggcNotes', v)} id="ggc" />
          <Component label={labels.fnn} confirmed={labels.fnnConfirmed} checked={!!t.fnnRequired} onCheck={(v) => set('fnnRequired', v)} notes={t.fnnNotes ?? ''} onNotes={(v) => set('fnnNotes', v)} id="fnn" />
        </div>
      </AdminPanel>

      <AdminPanel title="Service requirements">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {text('latencyMs', 'Latency target (ms)', { numeric: true, required: true })}
          {text('mtu', 'MTU', { numeric: true, required: true, placeholder: '1500' })}
          {select('redundancy', 'Redundancy', REDUNDANCY_OPTIONS)}
          {text('ipRequirement', 'IP requirements', { required: true, placeholder: 'e.g. /29 IPv4, /64 IPv6' })}
        </div>
      </AdminPanel>

      <AdminPanel title="Site readiness">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
          {text('power', 'Power', { required: true, area: true, placeholder: 'UPS, generator, socket' })}
          {text('grounding', 'Grounding', { required: true, area: true, placeholder: 'Earth bar, pit, rod needed' })}
          {text('rack', 'Rack', { required: true, area: true, placeholder: 'Customer rack, free U, IOL to supply' })}
          {text('constraints', 'Installation constraints', { area: true, className: 'sm:col-span-3', placeholder: 'Permissions, working hours, safety (বাংলা বা English)' })}
        </div>
      </AdminPanel>

      <AdminPanel title="Feasibility outcome">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-[200px_1fr]">
          {text('deliveryDays', 'Estimated delivery (working days)', { numeric: true, required: true })}
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
              Proposed outcome<span className="ml-0.5 text-status-critical">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SURVEY_OUTCOMES.map((o) =>
              <label key={o} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-[12.5px] font-semibold transition-colors duration-150 sm:h-9 ${t.outcome === o ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="t-outcome" className="sr-only" checked={t.outcome === o} onChange={() => set('outcome', o)} />
                  {o}
                </label>
              )}
            </div>
          </fieldset>
          {text('outcomeNotes', t.outcome === 'Not feasible' ? 'Why it is not feasible' : 'Outcome notes and conditions', { area: true, required: t.outcome === 'Not feasible', className: 'sm:col-span-2' })}
        </div>
      </AdminPanel>

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <button type="button" className={`${secondaryBtn} h-11 flex-1 sm:h-8 sm:flex-none`} disabled={!dirty} onClick={() => setT(s.tech ?? {})}>
          Discard
        </button>
        <button type="button" className={`${primaryBtn} h-11 flex-1 sm:h-8 sm:flex-none`} disabled={!dirty} onClick={() => runAction({ type: 'SURVEY_SAVE_TECH', surveyId: s.id, tech: t, bom: s.bom ?? [] })}>
          Save survey form
        </button>
      </div>
    </div>);

}

function Component({ id, label, confirmed, checked, onCheck, notes, onNotes }: {id: string;label: string;confirmed: boolean;checked: boolean;onCheck: (v: boolean) => void;notes: string;onNotes: (v: string) => void;}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
        {label} required
      </label>
      {!confirmed &&
      <span className="mt-1 inline-block">
          <StatusBadge status="Awaiting IOL confirmation" />
        </span>
      }
      {checked && <textarea aria-label={`${label} notes`} rows={2} className={`${fieldTextarea} mt-2`} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="What is needed and where" />}
      <span className="sr-only" id={`${id}-hint`}>Label configurable in Surveys → Labels and formula</span>
    </div>);

}

/** Read-only view of the technical survey. */
export function TechnicalSummary({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const labels = componentLabels(db);
  const t = s.tech;
  if (!t || Object.keys(t).length === 0) {
    return (
      <AdminPanel title="Technical survey">
        <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">The technician fills this in on site once the survey is in progress.</p>
      </AdminPanel>);

  }
  const yes = (v?: boolean, n?: string) => v ? `Required${n ? ` — ${n}` : ''}` : 'Not required';
  const groups: {title: string;rows: [string, React.ReactNode][];}[] = [
  { title: 'Connection and route', rows: [['Medium', t.medium], ['Nearby PoP', t.nearbyPop], ['Distance from PoP', t.popDistanceM ? `${Number(t.popDistanceM).toLocaleString('en-IN')} m` : ''], ['Route', t.route], ['Last mile', t.lastMile], ['NTTN / upstream', t.nttn], ['Dependency notes', t.nttnNotes]] },
  {
    title: 'Capacity and components',
    rows: [
    ['Capacity', t.capacity],
    ['Capacity notes', t.capacityNotes],
    [labels.ggc, <>{yes(t.ggcRequired, t.ggcNotes)}{!labels.ggcConfirmed && <span className="ml-1.5 text-[10.5px] text-status-warning">(label awaiting IOL confirmation)</span>}</>],
    [labels.fnn, <>{yes(t.fnnRequired, t.fnnNotes)}{!labels.fnnConfirmed && <span className="ml-1.5 text-[10.5px] text-status-warning">(label awaiting IOL confirmation)</span>}</>]]

  },
  { title: 'Service requirements', rows: [['Latency', t.latencyMs ? `${t.latencyMs} ms` : ''], ['MTU', t.mtu], ['Redundancy', t.redundancy], ['IP', t.ipRequirement]] },
  { title: 'Site readiness', rows: [['Power', t.power], ['Grounding', t.grounding], ['Rack', t.rack], ['Constraints', t.constraints]] },
  { title: 'Outcome', rows: [['Estimated delivery', t.deliveryDays ? `${t.deliveryDays} working days` : ''], ['Proposed outcome', t.outcome ? <StatusBadge status={t.outcome === 'Not feasible' ? 'Not Feasible' : t.outcome} /> : ''], ['Notes', t.outcomeNotes]] }];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {groups.map((g) =>
      <AdminPanel key={g.title} title={g.title}>
          <dl className="divide-y divide-slate-100">
            {g.rows.map(([k, v]) =>
          <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2 text-[12.5px]">
                <dt className="text-slate-500">{k}</dt>
                <dd className={v ? 'text-slate-900' : 'italic text-slate-400'}>{v || 'Not recorded'}</dd>
              </div>
          )}
          </dl>
        </AdminPanel>
      )}
    </div>);

}