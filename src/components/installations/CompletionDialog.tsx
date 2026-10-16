import React, { useState } from 'react';
import { CameraIcon, PaperclipIcon } from 'lucide-react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { FilePickButton } from '../field/FilePickButton';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { ACK_METHODS, type AckMethod } from '../../types/installation';
import type { FileRef } from '../../types/field';
import type { InstallationJob } from '../../types/records';

const num = (v: string) => v.trim() === '' ? undefined : Number(v);

/** Short completion form. Marking done hands over to the supervisor; it never starts billing. */
export function CompletionDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const now = dhakaInputValue(demoNow().toISOString(), true);
  const site = job.equipment ?? [];
  const [work, setWork] = useState('');
  const [installedAt, setInstalledAt] = useState(now);
  const [consumed, setConsumed] = useState<Record<string, string>>(() => Object.fromEntries((job.materialLines ?? []).map((m) => [m.id, String(m.issued - m.returned)])));
  const [power, setPower] = useState('');
  const [speed, setSpeed] = useState('');
  const [latency, setLatency] = useState('');
  const [loss, setLoss] = useState('0');
  const [result, setResult] = useState<'Pass' | 'Fail'>('Pass');
  const [photos, setPhotos] = useState<FileRef[]>([]);
  const [ackName, setAckName] = useState('');
  const [ackRole, setAckRole] = useState('');
  const [ackMethod, setAckMethod] = useState<AckMethod>('Signed job sheet');
  const [ackAt, setAckAt] = useState(now);
  const [issues, setIssues] = useState('');
  const [touched, setTouched] = useState(false);

  return (
    <CrmDialog
      size="lg"
      title={`Mark job done — ${job.id}`}
      description="Hands the job to the supervisor for technical verification and notifies the Account Manager and Accounts. Billing does not start here."
      onClose={onClose}
      submitLabel="Mark job done"
      onSubmit={() => {
        setTouched(true);
        const ok = runAction({
          type: 'JOB_MARK_DONE',
          jobId: job.id,
          completion: {
            workPerformed: work,
            installedAt: installedAt ? fromDhakaInput(installedAt) : '',
            consumed: (job.materialLines ?? []).map((m) => ({ materialId: m.id, quantity: Number(consumed[m.id]) || 0 })),
            tests: { opticalPowerDbm: num(power), throughputMbps: num(speed), latencyMs: num(latency), packetLossPct: num(loss), result },
            photos,
            acknowledgement: ackName.trim() ? { name: ackName.trim(), designation: ackRole.trim() || undefined, method: ackMethod, at: fromDhakaInput(ackAt) } : undefined,
            outstandingIssues: issues
          }
        });
        if (ok) onClose();
      }}>
      
      <FormField label="Work performed" htmlFor="cp-work" required error={touched && work.trim().length < 10 ? 'Describe the work (10+ characters).' : undefined}>
        <textarea id="cp-work" rows={3} className={fieldTextarea} value={work} onChange={(e) => setWork(e.target.value)} placeholder="Bangla or English / বাংলা বা ইংরেজি" />
      </FormField>
      <FormField label="Installation timestamp (Asia/Dhaka)" htmlFor="cp-at" required>
        <input id="cp-at" type="datetime-local" className={fieldInput} value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} />
      </FormField>

      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Installed equipment</legend>
        {site.length ?
        <ul className="space-y-1 text-[13px]">
            {site.map((e) =>
          <li key={e.id}>
                {e.item} · <span className="font-mono">{e.serial}</span> <span className="text-[11px] text-slate-500">{e.ownership}</span>
              </li>
          )}
          </ul> :

        <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-slate-700">No serials recorded yet — close this and use “Equipment” first.</p>
        }
      </fieldset>

      {(job.materialLines?.length ?? 0) > 0 &&
      <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Materials consumed</legend>
          <ul className="space-y-2">
            {job.materialLines!.map((m) =>
          <li key={m.id} className="grid grid-cols-[1fr_110px] items-center gap-3">
                <label htmlFor={`cp-m-${m.id}`} className="text-[13px] text-slate-800">
                  {m.item}
                  <span className="block text-[11px] text-slate-500">
                    issued {m.issued - m.returned} {m.unit}
                  </span>
                </label>
                <input id={`cp-m-${m.id}`} inputMode="numeric" className={`${fieldInput} text-right tabular-nums`} value={consumed[m.id] ?? ''} onChange={(e) => setConsumed({ ...consumed, [m.id]: e.target.value.replace(/[^\d]/g, '') })} />
              </li>
          )}
          </ul>
          <p className="mt-1 text-[11px] text-slate-500">Anything not consumed should be returned to the warehouse afterwards.</p>
        </fieldset>
      }

      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Test results</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormField label="Optical power (dBm)" htmlFor="cp-pw">
            <input id="cp-pw" inputMode="decimal" className={fieldInput} value={power} onChange={(e) => setPower(e.target.value.replace(/[^\d.-]/g, ''))} />
          </FormField>
          <FormField label="Throughput (Mbps)" htmlFor="cp-sp">
            <input id="cp-sp" inputMode="decimal" className={fieldInput} value={speed} onChange={(e) => setSpeed(e.target.value.replace(/[^\d.]/g, ''))} />
          </FormField>
          <FormField label="Latency (ms)" htmlFor="cp-lt">
            <input id="cp-lt" inputMode="decimal" className={fieldInput} value={latency} onChange={(e) => setLatency(e.target.value.replace(/[^\d.]/g, ''))} />
          </FormField>
          <FormField label="Packet loss (%)" htmlFor="cp-ls">
            <input id="cp-ls" inputMode="decimal" className={fieldInput} value={loss} onChange={(e) => setLoss(e.target.value.replace(/[^\d.]/g, ''))} />
          </FormField>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['Pass', 'Fail'] as const).map((r) =>
          <label key={r} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-[13px] font-semibold transition-colors duration-150 sm:h-9 ${result === r ? r === 'Pass' ? 'border-primary bg-primary-soft text-slate-900' : 'border-rose-300 bg-rose-50 text-status-critical' : 'border-slate-200 text-slate-600'}`}>
              <input type="radio" name="cp-result" className="sr-only" checked={result === r} onChange={() => setResult(r)} />
              {r}
            </label>
          )}
        </div>
      </fieldset>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Photos <span className="text-status-critical">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <FilePickButton label="Take photo" capture accept="image/*" onPick={(f) => setPhotos([...photos, ...f])} icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden />} />
          <FilePickButton label="Attach file" multiple accept="image/*,.pdf" onPick={(f) => setPhotos([...photos, ...f])} icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} />
        </div>
        {photos.length > 0 && <p className="mt-1 text-[11.5px] text-slate-600">{photos.map((p) => p.name).join(', ')} — names only; nothing is uploaded in this demo.</p>}
      </div>

      <fieldset className="space-y-3 border-t border-slate-100 pt-3">
        <legend className="text-[12px] font-semibold text-slate-700">Customer acknowledgement</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" htmlFor="cp-an">
            <input id="cp-an" className={fieldInput} value={ackName} onChange={(e) => setAckName(e.target.value)} />
          </FormField>
          <FormField label="Designation" htmlFor="cp-ad">
            <input id="cp-ad" className={fieldInput} value={ackRole} onChange={(e) => setAckRole(e.target.value)} />
          </FormField>
          <FormField label="Method" htmlFor="cp-am">
            <select id="cp-am" className={fieldInput} value={ackMethod} onChange={(e) => setAckMethod(e.target.value as AckMethod)}>
              {ACK_METHODS.map((m) =>
              <option key={m}>{m}</option>
              )}
            </select>
          </FormField>
          <FormField label="Acknowledged at" htmlFor="cp-aa">
            <input id="cp-aa" type="datetime-local" className={fieldInput} value={ackAt} onChange={(e) => setAckAt(e.target.value)} />
          </FormField>
        </div>
        <p className="text-[11px] text-slate-500">Leave the name blank if the customer was not available — Accounts cannot commence billing until acceptance is recorded.</p>
      </fieldset>

      <FormField label="Outstanding issues" htmlFor="cp-iss" help="Anything the supervisor or customer must follow up.">
        <textarea id="cp-iss" rows={2} className={fieldTextarea} value={issues} onChange={(e) => setIssues(e.target.value)} />
      </FormField>
    </CrmDialog>);

}