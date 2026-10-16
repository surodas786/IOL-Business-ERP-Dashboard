import React, { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { CrmDialog } from '../crm/CrmDialog';
import { fieldInput } from '../field/fieldStyles';
import { linkBtn } from '../admin/AdminPanel';
import { useRunAction } from '../../hooks/useRunAction';
import type { InstallationJob } from '../../types/records';
import type { JobEquipment } from '../../types/installation';

const OWNERSHIP: JobEquipment['ownership'][] = ['IOL-owned (returnable)', 'Sold to customer', 'Customer-owned'];

/** Installed equipment with serial numbers. Serials are upper-cased and must be unique. */
export function EquipmentDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const seeded: JobEquipment[] = job.equipment?.length ?
  job.equipment :
  (job.materialLines ?? []).filter((m) => m.serialised && m.issued > 0).map((m, i) => ({ id: `${job.id}-e${i + 1}`, item: m.item, serial: '', ownership: 'IOL-owned (returnable)' }));
  const [rows, setRows] = useState<JobEquipment[]>(seeded.length ? seeded : [{ id: `${job.id}-e1`, item: '', serial: '', ownership: 'IOL-owned (returnable)' }]);
  const upd = (id: string, p: Partial<JobEquipment>) => setRows(rows.map((r) => r.id === id ? { ...r, ...p } : r));

  return (
    <CrmDialog title={`Equipment and serials — ${job.id}`} description="Scan or type the serial printed on each device." onClose={onClose} submitLabel="Save equipment" onSubmit={() => runAction({ type: 'JOB_SAVE_EQUIPMENT', jobId: job.id, equipment: rows }) && onClose()}>
      <ul className="space-y-3">
        {rows.map((r) =>
        <li key={r.id} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input aria-label="Item" placeholder="Item" className={fieldInput} value={r.item} onChange={(e) => upd(r.id, { item: e.target.value })} />
            <input aria-label="Serial number" placeholder="Serial number" autoCapitalize="characters" className={`${fieldInput} font-mono`} value={r.serial} onChange={(e) => upd(r.id, { serial: e.target.value })} />
            <button type="button" aria-label={`Remove ${r.item || 'line'}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))} className="justify-self-end rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-status-critical">
              <Trash2Icon className="h-4 w-4" />
            </button>
            <select aria-label="Ownership" className={`${fieldInput} sm:col-span-3`} value={r.ownership} onChange={(e) => upd(r.id, { ownership: e.target.value as JobEquipment['ownership'] })}>
              {OWNERSHIP.map((o) =>
            <option key={o}>{o}</option>
            )}
            </select>
          </li>
        )}
      </ul>
      <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={() => setRows([...rows, { id: `${job.id}-e${Date.now()}`, item: '', serial: '', ownership: 'IOL-owned (returnable)' }])}>
        <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add device
      </button>
    </CrmDialog>);

}