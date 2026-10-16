import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { useRunAction } from '../../hooks/useRunAction';
import { dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { TECHNICIANS } from '../../utils/installationRules';
import type { InstallationJob } from '../../types/records';

/** Assign a technician and, optionally, confirm the visit date in one step. */
export function AssignDialog({ job, onClose }: {job: InstallationJob;onClose: () => void;}) {
  const runAction = useRunAction();
  const options = TECHNICIANS.filter((t) => t.branchId === job.branchId);
  const [tech, setTech] = useState(job.technicianName || options[0]?.name || '');
  const [when, setWhen] = useState(dhakaInputValue(job.scheduledAt, true));
  const [schedule, setSchedule] = useState(true);

  return (
    <CrmDialog
      title={job.technicianName ? `Reassign or reschedule ${job.id}` : `Assign ${job.id}`}
      description="Only technicians in this job's branch can be assigned. Assignment changes the job owner; the customer's branch and zone stay as they are."
      onClose={onClose}
      submitLabel={schedule ? 'Assign and schedule' : 'Assign'}
      submitDisabled={!tech || schedule && !when}
      onSubmit={() => {
        if (tech !== job.technicianName && !runAction({ type: 'JOB_ASSIGN', jobId: job.id, technicianName: tech })) return;
        if (schedule && !runAction({ type: 'JOB_SCHEDULE', jobId: job.id, scheduledAt: fromDhakaInput(when) })) return;
        onClose();
      }}>
      
      <FormField label="Technician" htmlFor="as-tech" required>
        <select id="as-tech" className={fieldInput} value={tech} onChange={(e) => setTech(e.target.value)}>
          {options.map((t) =>
          <option key={t.name} value={t.name}>
              {t.name}
              {t.userId ? '' : ' (no demo login — you update for them)'}
            </option>
          )}
        </select>
      </FormField>
      <label className="flex items-center gap-2 text-[13px] text-slate-700">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
        Confirm the visit date now
      </label>
      {schedule &&
      <FormField label="Visit date and time (Asia/Dhaka)" htmlFor="as-when" required>
          <input id="as-when" type="datetime-local" className={fieldInput} value={when} onChange={(e) => setWhen(e.target.value)} />
        </FormField>
      }
    </CrmDialog>);

}