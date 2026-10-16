import React, { useState } from 'react';
import { PaperclipIcon, XIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { inUserScope } from '../../utils/access';
import { policyFor } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { FilePickButton } from '../field/FilePickButton';
import { ISSUE_CATEGORIES, TICKET_PRIORITIES, TICKET_SOURCES, type IssueCategory, type TicketPriority, type TicketSource } from '../../types/ticket';
import type { FileRef } from '../../types/field';

const hrs = (m: number) => m < 60 ? `${m} min` : `${m / 60} h`;

/** Manual ticket creation by the support desk (or an Account Manager). */
export function NewTicketDialog({ onClose, customerId: initialCustomer = '' }: {onClose: () => void;customerId?: string;}) {
  const { db } = useData();
  const { user } = useSession();
  const runAction = useRunAction();
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [siteId, setSiteId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [source, setSource] = useState<TicketSource>('Phone call');
  const [category, setCategory] = useState<IssueCategory>('Link down');
  const [priority, setPriority] = useState<TicketPriority>('High');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerContact, setCallerContact] = useState('');
  const [files, setFiles] = useState<FileRef[]>([]);

  const customers = db.customers.filter((c) => c.status !== 'Prospect' && inUserScope(user, c.branchId)).sort((a, b) => a.name.localeCompare(b.name));
  const sites = db.sites.filter((s) => s.customerId === customerId);
  const services = db.connections.filter((c) => c.customerId === customerId && (!siteId || c.siteId === siteId));
  const p = policyFor(priority);
  const ready = !!customerId && !!siteId && subject.trim().length >= 6 && description.trim().length >= 15;

  const chooseCustomer = (id: string) => {
    setCustomerId(id);
    const s = db.sites.filter((x) => x.customerId === id);
    setSiteId(s.length === 1 ? s[0].id : '');
    const c = db.connections.filter((x) => x.customerId === id);
    setConnectionId(c.length === 1 ? c[0].id : '');
  };
  const chooseService = (id: string) => {
    setConnectionId(id);
    const c = db.connections.find((x) => x.id === id);
    if (c) setSiteId(c.siteId);
  };

  const submit = () => {
    if (runAction({ type: 'TKT_CREATE', input: { customerId, siteId, connectionId: connectionId || undefined, source, category, priority, subject, description, callerName, callerContact, attachments: files } })) onClose();
  };

  return (
    <CrmDialog size="lg" title="New support ticket" description="Internal ticket. Customers do not see it — there is no customer portal in this demo." onClose={onClose} submitLabel="Create ticket" submitDisabled={!ready} onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Customer" htmlFor="nt-cust" required className="sm:col-span-1">
          <select id="nt-cust" className={fieldInput} value={customerId} onChange={(e) => chooseCustomer(e.target.value)}>
            <option value="">Choose…</option>
            {customers.map((c) =>
            <option key={c.id} value={c.id}>
                {c.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Service" htmlFor="nt-svc" help={customerId && !services.length ? 'No services on file — link a site only.' : undefined}>
          <select id="nt-svc" className={fieldInput} value={connectionId} disabled={!customerId} onChange={(e) => chooseService(e.target.value)}>
            <option value="">Not service-specific</option>
            {services.map((c) =>
            <option key={c.id} value={c.id}>
                {c.id} · {c.serviceType} {c.bandwidthMbps} Mbps
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Site" htmlFor="nt-site" required>
          <select id="nt-site" className={fieldInput} value={siteId} disabled={!customerId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Choose…</option>
            {sites.map((s) =>
            <option key={s.id} value={s.id}>
                {s.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Source" htmlFor="nt-src" required>
          <select id="nt-src" className={fieldInput} value={source} onChange={(e) => setSource(e.target.value as TicketSource)}>
            {TICKET_SOURCES.map((s) =>
            <option key={s}>{s}</option>
            )}
          </select>
        </FormField>
        <FormField label="Issue category" htmlFor="nt-cat" required>
          <select id="nt-cat" className={fieldInput} value={category} onChange={(e) => setCategory(e.target.value as IssueCategory)}>
            {ISSUE_CATEGORIES.map((s) =>
            <option key={s}>{s}</option>
            )}
          </select>
        </FormField>
        <FormField label="Priority" htmlFor="nt-pri" required help={`Respond within ${hrs(p.responseMinutes)} · resolve within ${hrs(p.resolutionMinutes)}`}>
          <select id="nt-pri" className={fieldInput} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {TICKET_PRIORITIES.map((s) =>
            <option key={s}>{s}</option>
            )}
          </select>
        </FormField>
      </div>
      <FormField label="Subject" htmlFor="nt-subj" required>
        <input id="nt-subj" className={fieldInput} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Link down — Head Office" />
      </FormField>
      <FormField label="Description" htmlFor="nt-desc" required help="What the customer reported and anything already checked. At least 15 characters.">
        <textarea id="nt-desc" rows={4} className={fieldTextarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Reported by" htmlFor="nt-caller">
          <input id="nt-caller" className={fieldInput} value={callerName} onChange={(e) => setCallerName(e.target.value)} />
        </FormField>
        <FormField label="Phone or email" htmlFor="nt-contact">
          <input id="nt-contact" className={fieldInput} value={callerContact} onChange={(e) => setCallerContact(e.target.value)} />
        </FormField>
      </div>
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Attachments</p>
        <div className="flex flex-wrap items-center gap-2">
          <FilePickButton label="Add files" multiple icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} onPick={(f) => setFiles((x) => [...x, ...f])} />
          {files.map((f, i) =>
          <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-700">
              {f.name}
              <button type="button" aria-label={`Remove ${f.name}`} className="text-slate-400 hover:text-slate-700" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                <XIcon className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Only file names and sizes are kept in this demo.</p>
      </div>
    </CrmDialog>);

}