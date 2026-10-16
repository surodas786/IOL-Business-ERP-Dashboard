import React, { useState } from 'react';
import { CameraIcon, LocateFixedIcon, MapPinIcon, PaperclipIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { linkBtn } from '../admin/AdminPanel';
import { FilePickButton } from './FilePickButton';
import { ExpenseLineFields } from './ExpenseLineFields';
import { fieldInput, fieldTextarea } from './fieldStyles';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { useVisitSubjects } from '../../hooks/useVisitSubjects';
import { hasPermission } from '../../utils/access';
import { demoNow } from '../../utils/format';
import { emptyExpenseLine, emptyVisitDraft, validateExpenseLine, validateVisit, type DraftErrors, type ExpenseLineDraft, type VisitDraft } from '../../utils/fieldRules';
import { VISIT_OUTCOMES, VISIT_PURPOSES, type GeoStamp, type VisitOutcome, type VisitPurpose } from '../../types/field';

/** Approximate branch-office coordinates used for the demo location stamp. */
const DEMO_COORDS: Record<string, [number, number]> = {
  'dhaka-north': [23.8759, 90.3795],
  'dhaka-south': [23.7330, 90.4172],
  chattogram: [22.3256, 91.8123],
  sylhet: [24.8949, 91.8687]
};

/** Mobile-first daily visit form with optional expense lines. */
export function LogVisitDialog({ onClose }: {onClose: () => void;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const { leads, customers } = useVisitSubjects();
  const [d, setD] = useState<VisitDraft>(() => ({ ...emptyVisitDraft(), subjectType: hasPermission(role, 'createQuotation') ? 'lead' : 'customer' }));
  const [expenses, setExpenses] = useState<ExpenseLineDraft[]>([]);
  const [tried, setTried] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const set = <K extends keyof VisitDraft,>(k: K, v: VisitDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const errors: DraftErrors<VisitDraft> = tried ? validateVisit(d) : {};
  const lineErrors = expenses.map((l) => tried ? validateExpenseLine({ ...l, date: d.at.slice(0, 10) }) : {});
  const options = d.subjectType === 'lead' ? leads : customers;

  const chooseSubject = (id: string) => {
    const o = options.find((x) => x.id === id);
    setD((p) => ({ ...p, subjectId: id, location: p.location || o?.address || '' }));
  };

  const demoStamp = () => {
    const [lat, lng] = DEMO_COORDS[user.branch ?? user.stationBranchId] ?? DEMO_COORDS['dhaka-north'];
    const geo: GeoStamp = { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01, accuracyM: 30, capturedAt: demoNow().toISOString(), source: 'Demo' };
    set('geo', geo);
    setGeoMsg(null);
  };

  const deviceStamp = () => {
    if (!('geolocation' in navigator)) return setGeoMsg('This browser has no location service. Use the demo stamp instead.');
    setGeoMsg('Waiting for the browser permission prompt…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        set('geo', { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy), capturedAt: demoNow().toISOString(), source: 'Device' });
        setGeoMsg(null);
      },
      () => setGeoMsg('Location wasn’t shared. The visit can be saved without it.'),
      { timeout: 10000 }
    );
  };

  const submit = () => {
    setTried(true);
    const withDate = expenses.map((l) => ({ ...l, date: d.at.slice(0, 10) }));
    if (Object.keys(validateVisit(d)).length || withDate.some((l) => Object.keys(validateExpenseLine(l)).length)) return;
    if (runAction({ type: 'FIELD_LOG_VISIT', draft: d, expenses: withDate })) onClose();
  };

  return (
    <CrmDialog title="Log visit" description="Bangla or English. Saved to the shared demo records." onClose={onClose} onSubmit={submit} submitLabel={expenses.length ? `Save visit + ${expenses.length} expense${expenses.length > 1 ? 's' : ''}` : 'Save visit'} size="lg">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <FormField label="Date and time (Asia/Dhaka)" htmlFor="v-at" required error={errors.at}>
          <input id="v-at" type="datetime-local" className={fieldInput} value={d.at} onChange={(e) => set('at', e.target.value)} />
        </FormField>
        <FormField label="Duration (min)" htmlFor="v-dur" required error={errors.durationMin}>
          <input id="v-dur" inputMode="numeric" className={fieldInput} value={d.durationMin} onChange={(e) => set('durationMin', e.target.value.replace(/\D/g, ''))} />
        </FormField>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Linked record<span className="ml-0.5 text-status-critical">*</span>
        </legend>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(['lead', 'customer'] as const).map((t) =>
          <button
            key={t}
            type="button"
            aria-pressed={d.subjectType === t}
            onClick={() => setD((p) => ({ ...p, subjectType: t, subjectId: '' }))}
            className={`h-10 rounded-md border text-[12.5px] font-semibold transition-colors duration-150 ${d.subjectType === t ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            
              {t === 'lead' ? `Lead (${leads.length})` : `Customer (${customers.length})`}
            </button>
          )}
        </div>
        <select aria-label={`Choose ${d.subjectType}`} className={fieldInput} value={d.subjectId} onChange={(e) => chooseSubject(e.target.value)}>
          <option value="">Choose a {d.subjectType}…</option>
          {options.map((o) =>
          <option key={o.id} value={o.id}>
              {o.label} — {o.sub}
            </option>
          )}
        </select>
        {errors.subjectId && <p role="alert" className="mt-1.5 text-[11.5px] text-status-critical">{errors.subjectId}</p>}
      </fieldset>

      <FormField label="Location" htmlFor="v-loc" required error={errors.location}>
        <input id="v-loc" className={fieldInput} value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="Address or landmark" />
      </FormField>

      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
          <MapPinIcon className="h-3.5 w-3.5" aria-hidden /> Location stamp <span className="font-normal text-slate-500">(optional)</span>
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">For reference only. A location stamp does not prove a visit took place, and visits are never approved or rejected on it.</p>
        {d.geo ?
        <p className="mt-2 flex items-center gap-2 text-[12px] text-slate-800">
            {d.geo.lat.toFixed(4)}, {d.geo.lng.toFixed(4)} · ±{d.geo.accuracyM} m · {d.geo.source}
            <button type="button" aria-label="Remove location stamp" onClick={() => set('geo', undefined)} className="rounded p-1 text-slate-500 hover:bg-slate-200">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </p> :

        <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={demoStamp} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 sm:h-8 sm:text-[12px]">
              <MapPinIcon className="h-3.5 w-3.5" aria-hidden /> Add demo stamp
            </button>
            <button type="button" onClick={deviceStamp} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 sm:h-8 sm:text-[12px]">
              <LocateFixedIcon className="h-3.5 w-3.5" aria-hidden /> Use device location
            </button>
          </div>
        }
        {geoMsg && <p className="mt-1.5 text-[11px] text-slate-600">{geoMsg}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Purpose" htmlFor="v-purpose">
          <select id="v-purpose" className={fieldInput} value={d.purpose} onChange={(e) => set('purpose', e.target.value as VisitPurpose)}>
            {VISIT_PURPOSES.map((p) =>
            <option key={p}>{p}</option>
            )}
          </select>
        </FormField>
        <FormField label="Outcome" htmlFor="v-outcome">
          <select id="v-outcome" className={fieldInput} value={d.outcome} onChange={(e) => set('outcome', e.target.value as VisitOutcome)}>
            {VISIT_OUTCOMES.map((o) =>
            <option key={o}>{o}</option>
            )}
          </select>
        </FormField>
      </div>

      <FormField label="People met" htmlFor="v-people" required error={errors.peopleMet}>
        <input id="v-people" className={fieldInput} value={d.peopleMet} onChange={(e) => set('peopleMet', e.target.value)} placeholder="Name and designation" />
      </FormField>

      <FormField label="Notes" htmlFor="v-notes" required error={errors.notes}>
        <textarea id="v-notes" rows={4} className={fieldTextarea} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="What was discussed, agreed or observed" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <FormField label="Next action" htmlFor="v-next" error={errors.nextAction}>
          <input id="v-next" className={fieldInput} value={d.nextAction} onChange={(e) => set('nextAction', e.target.value)} placeholder="e.g. Send revised proposal" />
        </FormField>
        <FormField label="Due" htmlFor="v-due" error={errors.nextActionDue}>
          <input id="v-due" type="datetime-local" className={fieldInput} value={d.nextActionDue} onChange={(e) => set('nextActionDue', e.target.value)} />
        </FormField>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Attachments and photos</p>
        {d.attachments.length > 0 &&
        <ul className="mb-2 space-y-1">
            {d.attachments.map((a, i) =>
          <li key={`${a.name}-${i}`} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-[12.5px] text-slate-800">
                <PaperclipIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => set('attachments', d.attachments.filter((_, j) => j !== i))} className="rounded p-1 text-slate-500 hover:bg-slate-200">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </li>
          )}
          </ul>
        }
        <div className="flex flex-wrap gap-2">
          <FilePickButton label="Attach file" multiple icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} onPick={(f) => set('attachments', [...d.attachments, ...f])} />
          <FilePickButton label="Take photo" accept="image/*" capture icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden />} onPick={(f) => setD((p) => ({ ...p, attachments: [...p.attachments, ...f], photos: p.photos + f.length }))} />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">The camera opens only when you tap “Take photo”. Demo: only file names are kept.</p>
      </div>

      <section aria-label="Related expenses" className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold text-slate-900">Related expenses</h3>
          <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={() => setExpenses((p) => [...p, emptyExpenseLine(d.at.slice(0, 10), d.purpose === 'Account servicing' || d.subjectType === 'customer' ? 'Account servicing' : 'Customer acquisition')])}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add expense line
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">Lines go into your draft claim, dated the visit day. Submit the claim from Expenses.</p>
        {expenses.map((l, i) =>
        <div key={i} className="mt-3 rounded-md border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-800">Expense {i + 1}</p>
              <button type="button" aria-label={`Remove expense ${i + 1}`} onClick={() => setExpenses((p) => p.filter((_, j) => j !== i))} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
            <ExpenseLineFields idPrefix={`vx-${i}`} hideDate value={l} errors={lineErrors[i]} onChange={(n) => setExpenses((p) => p.map((x, j) => j === i ? n : x))} />
          </div>
        )}
      </section>
    </CrmDialog>);

}