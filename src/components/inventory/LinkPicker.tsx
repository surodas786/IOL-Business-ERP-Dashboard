import React from 'react';
import { useData } from '../../contexts/DataContext';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { customerName } from '../../utils/relations';
import type { StockLinks } from '../../utils/stockOps';

interface Props {
  value: StockLinks;
  onChange: (l: StockLinks) => void;
  required?: boolean;
  help?: string;
}

const encode = (l: StockLinks) => l.jobId ? `job:${l.jobId}` : l.workOrderId ? `wo:${l.workOrderId}` : l.serviceChangeId ? `sc:${l.serviceChangeId}` : '';

/** Links a stock movement to an open job, work order or service change. Customer and service follow automatically. */
export function LinkPicker({ value, onChange, required, help }: Props) {
  const { db } = useData();
  const jobs = db.installationJobs.filter((j) => !['Closed', 'Cancelled', 'Verified'].includes(j.status));
  const wos = db.workOrders.filter((w) => w.status === 'Open' || w.status === 'In Progress');
  const scs = db.serviceChanges.filter((s) => ['Approved', 'Pending Approval', 'Requested'].includes(s.status) && s.type !== 'Temporary Stop');

  return (
    <FormField label="Linked to" htmlFor="lk" required={required} help={help ?? 'Customer and service are taken from the linked record.'}>
      <select
        id="lk"
        className={fieldInput}
        value={encode(value)}
        onChange={(e) => {
          const [k, id] = e.target.value.split(':');
          onChange(k === 'job' ? { jobId: id } : k === 'wo' ? { workOrderId: id } : k === 'sc' ? { serviceChangeId: id } : {});
        }}>
        
        <option value="">{required ? 'Choose…' : 'Not linked'}</option>
        <optgroup label="Installation jobs">
          {jobs.map((j) =>
          <option key={j.id} value={`job:${j.id}`}>
              {j.id} — {customerName(db, j.customerId)} · {j.technicianName || 'unassigned'}
            </option>
          )}
        </optgroup>
        <optgroup label="Work orders">
          {wos.map((w) =>
          <option key={w.id} value={`wo:${w.id}`}>
              {w.id} — {customerName(db, w.customerId)} · {w.type}
            </option>
          )}
        </optgroup>
        <optgroup label="Service changes">
          {scs.map((s) =>
          <option key={s.id} value={`sc:${s.id}`}>
              {s.id} — {customerName(db, s.customerId)} · {s.type}
            </option>
          )}
        </optgroup>
      </select>
    </FormField>);

}