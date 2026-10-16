import React from 'react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canDispatch, canWorkJob } from '../../utils/installationRules';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import type { JobDialog } from './useJobDialogs';
import type { InstallationJob } from '../../types/records';

interface Props {
  job: InstallationJob;
  open: (d: JobDialog) => void;
  /** Larger touch targets for the technician view. */
  touch?: boolean;
}

/** Status-appropriate actions for the active role. Renders nothing when the role cannot act. */
export function JobActions({ job, open, touch }: Props) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const dispatch = canDispatch(role);
  const work = canWorkJob(role, user, job);
  const size = touch ? 'h-11 px-4 text-[14px] sm:h-8 sm:text-[12px]' : '';
  const btns: React.ReactNode[] = [];
  const s = job.status;
  const p = (label: string, onClick: () => void) =>
  <button key={label} type="button" className={`${primaryBtn} ${size}`} onClick={onClick}>
      {label}
    </button>;

  const sec = (label: string, onClick: () => void) =>
  <button key={label} type="button" className={`${secondaryBtn} ${size}`} onClick={onClick}>
      {label}
    </button>;


  if (dispatch && ['Pending Assignment', 'Assigned', 'Scheduled'].includes(s)) btns.push((s === 'Pending Assignment' ? p : sec)(s === 'Pending Assignment' ? 'Assign technician' : s === 'Assigned' ? 'Schedule visit' : 'Reassign / reschedule', () => open('assign')));
  if (work && s === 'Scheduled') btns.push(p('Start job', () => runAction({ type: 'JOB_START', jobId: job.id })));
  if (work && s === 'In Progress') btns.push(p('Mark job done', () => open('complete')));
  if (work && ['Scheduled', 'In Progress', 'Work Completed'].includes(s)) btns.push(sec('Equipment', () => open('equipment')));
  if ((work || dispatch) && !['Closed', 'Cancelled', 'Pending Assignment'].includes(s)) btns.push(sec('Add note', () => open('note')));
  if ((work || dispatch) && ['Assigned', 'Scheduled', 'In Progress'].includes(s)) btns.push(sec('Put on hold', () => open('hold')));
  if ((work || dispatch) && s === 'On Hold') btns.push(p('Lift hold', () => open('hold')));
  if (dispatch && s === 'Work Completed') {
    if (job.handoverById !== user.id) btns.push(p('Verify', () => open('verify')));
    btns.push(sec('Return to technician', () => open('return')));
  }
  if ((work || dispatch) && ['Work Completed', 'Verified'].includes(s) && !job.customerAcceptedAt) btns.push(sec('Record customer acceptance', () => open('accept')));

  if (!btns.length) return null;
  return <div className="flex flex-wrap gap-2">{btns}</div>;
}