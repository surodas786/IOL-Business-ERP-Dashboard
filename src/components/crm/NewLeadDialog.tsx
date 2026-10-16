import React from 'react';
import { AlertTriangleIcon, BanIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { ENTITY_LABEL, userName } from '../../utils/relations';
import { SERVICE_TYPES, type LeadDraft } from '../../utils/leadDraft';
import { FormField, inputClass } from '../admin/FormField';
import { CrmDialog } from './CrmDialog';
import { useLeadForm } from './useLeadForm';
import { COMMUNICATION_CHANNELS, CUSTOMER_CATEGORIES, type CommunicationChannel, type CustomerCategory, type ExpansionType } from '../../types/crm';
import { LEAD_SOURCES, type LeadSource, type ServiceType } from '../../types/records';
import type { BranchId } from '../../types/erp';

const EXPANSIONS: ExpansionType[] = ['New customer', 'Additional site', 'Additional service'];

export function NewLeadDialog({ onClose, onCreated }: {onClose: () => void;onCreated: (opportunityId: string) => void;}) {
  const f = useLeadForm((id) => {
    onCreated(id);
    onClose();
  });
  const { openRecord } = useRecordDrawer();
  const { draft: d, set, errors: e } = f;
  const branch = branches.find((b) => b.id === d.branchId);
  const text = (key: keyof LeadDraft) => ({
    id: `ld-${key}`,
    className: inputClass,
    value: d[key] as string,
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, ev.target.value as never)
  });

  return (
    <CrmDialog
      size="lg"
      title="New lead"
      description="Registers the organisation and opens an opportunity at the first pipeline stage. Bangla and English are both accepted."
      onClose={onClose}
      onSubmit={f.submit}
      submitLabel={f.matches.length ? 'Create and send for review' : 'Create lead'}
      submitDisabled={!!f.blocking || f.matches.length > 0 && !f.acknowledged}>
      
      <Section title="Customer">
        <FormField label="This lead is for" htmlFor="ld-expansion">
          <select id="ld-expansion" className={inputClass} value={d.expansion} onChange={(ev) => set('expansion', ev.target.value as ExpansionType)}>
            {EXPANSIONS.map((x) =>
            <option key={x}>{x}</option>
            )}
          </select>
        </FormField>
        {d.expansion !== 'New customer' &&
        <FormField label="Existing customer" htmlFor="ld-customer" required error={e.customerId} help="Additional sites and services stay under the same customer account.">
            <select id="ld-customer" className={inputClass} value={d.customerId} onChange={(ev) => set('customerId', ev.target.value)}>
              <option value="">Choose…</option>
              {f.db.customers.map((c) =>
            <option key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </option>
            )}
            </select>
          </FormField>
        }
        <FormField label="Organisation (English)" htmlFor="ld-company" required error={e.company}>
          <input {...text('company')} disabled={!!d.customerId} />
        </FormField>
        <FormField label="Organisation (বাংলা)" htmlFor="ld-companyBn">
          <input {...text('companyBn')} lang="bn" disabled={!!d.customerId} />
        </FormField>
        <FormField label="Customer category" htmlFor="ld-category">
          <select id="ld-category" className={inputClass} value={d.category} onChange={(ev) => set('category', ev.target.value as CustomerCategory)}>
            {CUSTOMER_CATEGORIES.map((c) =>
            <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
        <FormField label="Organisation address" htmlFor="ld-address">
          <input {...text('address')} placeholder="Road, area, city and post code" />
        </FormField>
      </Section>

      <Section title="Contact">
        <FormField label="Contact name" htmlFor="ld-contactName" required error={e.contactName}>
          <input {...text('contactName')} />
        </FormField>
        <FormField label="Designation" htmlFor="ld-contactDesignation">
          <input {...text('contactDesignation')} />
        </FormField>
        <FormField label="Mobile" htmlFor="ld-contactPhone" error={e.contactPhone}>
          <input {...text('contactPhone')} type="tel" inputMode="tel" placeholder="+880 17XX-XXXXXX" />
        </FormField>
        <FormField label="Email" htmlFor="ld-contactEmail" error={e.contactEmail}>
          <input {...text('contactEmail')} type="email" inputMode="email" />
        </FormField>
      </Section>

      <Section title="Requested service">
        <FormField label="Service site name" htmlFor="ld-siteName">
          <input {...text('siteName')} placeholder="e.g. Head office" />
        </FormField>
        <FormField label="Service site address" htmlFor="ld-siteAddress" required error={e.siteAddress}>
          <input {...text('siteAddress')} />
        </FormField>
        <FormField label="Service" htmlFor="ld-serviceType">
          <select id="ld-serviceType" className={inputClass} value={d.serviceType} onChange={(ev) => set('serviceType', ev.target.value as ServiceType)}>
            {SERVICE_TYPES.map((s) =>
            <option key={s}>{s}</option>
            )}
          </select>
        </FormField>
        <FormField label="Bandwidth (Mbps)" htmlFor="ld-bandwidthMbps" required error={e.bandwidthMbps}>
          <input {...text('bandwidthMbps')} inputMode="numeric" />
        </FormField>
        <FormField label="Expected MRC (৳ per month)" htmlFor="ld-expectedMrc" required error={e.expectedMrc}>
          <input {...text('expectedMrc')} inputMode="numeric" />
        </FormField>
        <FormField label="One-time charge (৳)" htmlFor="ld-otc">
          <input {...text('otc')} inputMode="numeric" />
        </FormField>
      </Section>

      <Section title="Source and ownership">
        <FormField label="Source" htmlFor="ld-source">
          <select id="ld-source" className={inputClass} value={d.source} onChange={(ev) => set('source', ev.target.value as LeadSource)} disabled={d.isTender}>
            {LEAD_SOURCES.map((s) =>
            <option key={s}>{s}</option>
            )}
          </select>
        </FormField>
        {d.source === 'Sales Agent' && !d.isTender &&
        <FormField label="Sales agent" htmlFor="ld-agent" required error={e.agentId}>
            <select id="ld-agent" className={inputClass} value={d.agentId} onChange={(ev) => set('agentId', ev.target.value)}>
              <option value="">Choose…</option>
              {f.db.salesAgents.map((a) =>
            <option key={a.id} value={a.id}>
                  {a.name}
                </option>
            )}
            </select>
          </FormField>
        }
        {d.source === 'Referral' && !d.isTender &&
        <FormField label="Referred by" htmlFor="ld-referral" required error={e.referral}>
            <input {...text('referral')} />
          </FormField>
        }
        <FormField label="Branch" htmlFor="ld-branch" required error={e.branchId}>
          <select id="ld-branch" className={inputClass} value={d.branchId} onChange={(ev) => set('branchId', ev.target.value as BranchId)} disabled={!!d.customerId}>
            <option value="">Choose…</option>
            {branches.map((b) =>
            <option key={b.id} value={b.id}>
                {b.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Zone" htmlFor="ld-zone" required error={e.zoneId}>
          <select id="ld-zone" className={inputClass} value={d.zoneId} onChange={(ev) => set('zoneId', ev.target.value)} disabled={!branch || !!d.customerId}>
            <option value="">Choose…</option>
            {branch?.zones.map((z) =>
            <option key={z.id} value={z.id}>
                {z.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Sales owner" htmlFor="ld-owner" required error={e.ownerId} help={f.manager ? undefined : 'Leads you register are assigned to you.'}>
          <select id="ld-owner" className={inputClass} value={d.ownerId} onChange={(ev) => set('ownerId', ev.target.value)} disabled={!f.manager}>
            {f.owners.map((u) =>
            <option key={u.id} value={u.id}>
                {u.name}
              </option>
            )}
          </select>
        </FormField>
      </Section>

      <Section title="Next steps">
        <FormField label="Expected decision date" htmlFor="ld-decision" required error={e.expectedDecisionDate}>
          <input id="ld-decision" type="date" className={inputClass} value={d.expectedDecisionDate} onChange={(ev) => set('expectedDecisionDate', ev.target.value)} />
        </FormField>
        <FormField label="Next action due" htmlFor="ld-due" required error={e.nextActionDue}>
          <input id="ld-due" type="datetime-local" className={inputClass} value={d.nextActionDue} onChange={(ev) => set('nextActionDue', ev.target.value)} />
        </FormField>
        <FormField label="Next action" htmlFor="ld-nextAction" required error={e.nextAction} className="sm:col-span-2">
          <input {...text('nextAction')} placeholder="e.g. Call to confirm site visit" />
        </FormField>
        <FormField label="First communication (optional)" htmlFor="ld-firstNote" className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select aria-label="Channel" className={`${inputClass} sm:w-32`} value={d.firstNoteChannel} onChange={(ev) => set('firstNoteChannel', ev.target.value as CommunicationChannel)}>
              {COMMUNICATION_CHANNELS.map((c) =>
              <option key={c}>{c}</option>
              )}
            </select>
            <input {...text('firstNote')} placeholder="What was discussed" />
          </div>
        </FormField>
        <label className="flex items-center gap-2 text-[12.5px] text-slate-700 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={d.interest} onChange={(ev) => set('interest', ev.target.checked)} />
          The customer expressed interest
        </label>
      </Section>

      <Section title="Tender">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={d.isTender} onChange={(ev) => set('isTender', ev.target.checked)} />
          This is a tender
        </label>
        {d.isTender &&
        <>
            <FormField label="Tender reference" htmlFor="ld-tenderReference" required error={e.tenderReference}>
              <input {...text('tenderReference')} />
            </FormField>
            <FormField label="Tender title" htmlFor="ld-tenderTitle">
              <input {...text('tenderTitle')} />
            </FormField>
            <FormField label="Clarification deadline" htmlFor="ld-clar" error={e.clarificationDeadline}>
              <input id="ld-clar" type="date" className={inputClass} value={d.clarificationDeadline} onChange={(ev) => set('clarificationDeadline', ev.target.value)} />
            </FormField>
            <FormField label="Submission deadline" htmlFor="ld-sub" required error={e.submissionDeadline}>
              <input id="ld-sub" type="date" className={inputClass} value={d.submissionDeadline} onChange={(ev) => set('submissionDeadline', ev.target.value)} />
            </FormField>
            <p className="text-[11px] text-slate-500 sm:col-span-2">A standard document checklist is added; edit it, competitors and win probability on the tender screen.</p>
          </>
        }
      </Section>

      {f.blocking &&
      <div role="alert" className="flex gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-slate-700">
          <BanIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-critical" aria-hidden />
          <div>
            <p className="font-semibold text-status-critical">Blocked — conflicting assignment</p>
            <p className="mt-0.5">
              {f.blocking.reason} Owner: {userName(f.blocking.opportunity.ownerId)}. Choose a different site or service, or ask a sales manager to review.
            </p>
          </div>
        </div>
      }

      {!f.blocking && f.matches.length > 0 &&
      <div role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-slate-700">
          <p className="flex items-center gap-1.5 font-semibold text-status-warning">
            <AlertTriangleIcon className="h-4 w-4" aria-hidden /> Possible matches — please review
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {f.matches.map((m) =>
          <li key={`${m.ref.type}-${m.ref.id}`}>
                <button type="button" onClick={() => openRecord(m.ref)} className="font-semibold text-primary hover:text-primary-hover">
                  {ENTITY_LABEL[m.ref.type]} {m.ref.id} · {m.name}
                </button>
                {m.owner && <span className="text-slate-500"> · {userName(m.owner)}</span>}
                <span className="block text-[11px] text-slate-600">{m.reasons.join(' · ')}</span>
              </li>
          )}
          </ul>
          <label className="mt-2 flex items-start gap-2 border-t border-amber-200 pt-2">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={f.acknowledged} onChange={(ev) => f.setAcknowledged(ev.target.checked)} />
            <span>
              I’ve checked these and this is a separate lead. It will be created and flagged for a sales manager to review. Nothing is merged automatically.
            </span>
          </label>
        </div>
      }
    </CrmDialog>);

}

function Section({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <fieldset className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-3 text-[12.5px] font-bold text-slate-900">{title}</legend>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </fieldset>);

}