import { clearanceDone } from '../serviceChangeRules';
import { recordName } from '../relations';
import { branchLabel } from './salesReports';
import { customerCategory, inPeriod, pass, pct, sum, type ReportCtx } from './scope';
import type { InstallationJob } from '../../types/records';
import type { ReportSection } from '../../types/reports';

export const COMPLETION_TIP =
'Installation completion rate = jobs whose target date falls in the period and that are Work Completed, Verified or Closed ÷ all jobs with a target date in the period (cancelled jobs excluded). On time = completed by the end of the target day.';

const DONE: InstallationJob['status'][] = ['Work Completed', 'Verified', 'Closed'];
export const jobDone = (j: InstallationJob) => DONE.includes(j.status);

export function completionStats(c: ReportCtx) {
  const jobs = c.db.installationJobs.filter((j) => j.status !== 'Cancelled' && pass(c, { branchId: j.branchId, zoneId: j.zoneId, at: j.scheduledAt, ownerId: j.technicianUserId, category: customerCategory(c, j.customerId) }));
  const done = jobs.filter(jobDone);
  const endOfDay = (iso: string) => Date.parse(`${iso.slice(0, 10)}T23:59:59+06:00`);
  const onTime = done.filter((j) => j.completedAt && Date.parse(j.completedAt) <= endOfDay(j.scheduledAt));
  return { jobs, done, onTime, rate: pct(done.length, jobs.length) };
}

/** Technical reports carry no customer financial fields at all. */
export function technicalReports(c: ReportCtx): ReportSection[] {
  const { db, now } = c;
  const branchesIn = (ids: string[]) => [...new Set(ids)].filter((b) => pass(c, { branchId: b }));

  const surveys = db.surveys.filter((s) => pass(c, { branchId: s.branchId, zoneId: s.zoneId, at: s.requestedAt }));
  const hours = (s: (typeof surveys)[number]) => s.completedAt ? (Date.parse(s.completedAt) - Date.parse(s.requestedAt)) / 3600000 : null;
  const done = surveys.filter((s) => s.completedAt);
  const openOld = surveys.filter((s) => !s.completedAt && !['Approved', 'Not Feasible'].includes(s.status) && now.getTime() - Date.parse(s.requestedAt) > 72 * 3600000);
  const avg = (xs: number[]) => xs.length ? Math.round(sum(xs) / xs.length * 10) / 10 : null;

  const openJobs = db.installationJobs.filter((j) => !['Closed', 'Cancelled', 'Verified'].includes(j.status) && pass(c, { branchId: j.branchId, zoneId: j.zoneId, ownerId: j.technicianUserId, category: customerCategory(c, j.customerId) }));
  const delayed = openJobs.filter((j) => j.status === 'On Hold' || !jobDone(j) && Date.parse(j.scheduledAt) < now.getTime());
  const comp = completionStats(c);

  const units = db.equipmentUnits.filter((u) => (u.status === 'Installed' || u.status === 'Receivable') && pass(c, { branchId: db.customers.find((x) => x.id === u.customerId)?.branchId ?? u.branchId, category: customerCategory(c, u.customerId) }));
  const owners = [...new Set(units.map((u) => u.ownership))];

  const moves = db.inventoryMovements.filter((m) => ['Issue', 'Return', 'Installation', 'Transfer'].includes(m.type) && pass(c, { branchId: m.branchId, zoneId: m.zoneId, at: m.at }));
  const moveKeys = [...new Set(moves.map((m) => `${m.type}|${m.branchId}`))];

  const changes = db.serviceChanges.filter((s) => pass(c, { branchId: s.branchId, zoneId: s.zoneId, category: customerCategory(c, s.customerId) }));
  const openChanges = changes.filter((s) => !['Implemented', 'Resumed', 'Closed', 'Rejected', 'Cancelled'].includes(s.status));
  const pendingClear = changes.filter((s) => s.type === 'Discontinuation' && s.clearances && s.status !== 'Closed' && (!clearanceDone(s.clearances.technical) || !clearanceDone(s.clearances.accounts)));
  const types = [...new Set(changes.map((s) => s.type))];

  return [
  {
    id: 'survey-turnaround', title: 'Survey turnaround', description: 'Time from survey request to submission for technical review, for surveys requested in the period.', basis: 'period',
    tip: 'Turnaround = hours from request to the surveyor’s submission. Surveys open more than 72 hours are flagged.',
    kpis: [
    { label: 'Average turnaround', value: avg(done.map((s) => hours(s)!)), kind: 'hours' },
    { label: 'Requested', value: surveys.length, kind: 'count' },
    { label: 'Open over 72 h', value: openOld.length, kind: 'count', tone: openOld.length ? 'warning' : undefined }],

    columns: [{ key: 'branch', label: 'Branch' }, { key: 'requested', label: 'Requested', kind: 'count' }, { key: 'completed', label: 'Submitted', kind: 'count' }, { key: 'avg', label: 'Avg turnaround', kind: 'hours' }, { key: 'late', label: 'Open > 72 h', kind: 'count' }],
    rows: branchesIn(surveys.map((s) => s.branchId)).map((b) => {
      const mine = surveys.filter((s) => s.branchId === b);
      return { branch: branchLabel(b), requested: mine.length, completed: mine.filter((s) => s.completedAt).length, avg: avg(mine.filter((s) => s.completedAt).map((s) => hours(s)!)), late: openOld.filter((s) => s.branchId === b).length };
    }),
    empty: 'No surveys requested in this period.'
  },
  {
    id: 'install-delays', title: 'Installation progress and delays', description: 'Open jobs today. Delayed = past the target date and not completed, or on hold.', basis: 'snapshot',
    kpis: [
    { label: 'Open jobs', value: openJobs.length, kind: 'count' },
    { label: 'Delayed or on hold', value: delayed.length, kind: 'count', tone: delayed.length ? 'critical' : undefined },
    { label: 'Awaiting verification', value: openJobs.filter((j) => j.status === 'Work Completed').length, kind: 'count' }],

    columns: [{ key: 'id', label: 'Job' }, { key: 'customer', label: 'Customer' }, { key: 'technician', label: 'Technician' }, { key: 'target', label: 'Target', kind: 'date' }, { key: 'status', label: 'Status' }, { key: 'late', label: 'Days late', kind: 'days' }, { key: 'reason', label: 'Hold reason' }],
    rows: delayed.map((j) => ({ id: j.id, customer: recordName(db, { type: 'customer', id: j.customerId }), technician: j.technicianName || 'Unassigned', target: j.scheduledAt, status: j.status, late: Math.max(0, Math.floor((now.getTime() - Date.parse(j.scheduledAt)) / 86400000)), reason: j.hold?.reason ?? '' })),
    empty: 'No delayed jobs.'
  },
  {
    id: 'job-completion', title: 'Job completion', description: 'Jobs with a target date in the period.', basis: 'period', tip: COMPLETION_TIP,
    kpis: [
    { label: 'Installation completion rate', value: comp.rate, kind: 'pct', tip: COMPLETION_TIP, note: `${comp.done.length} of ${comp.jobs.length}` },
    { label: 'Completed on time', value: pct(comp.onTime.length, comp.done.length), kind: 'pct' }],

    columns: [{ key: 'branch', label: 'Branch' }, { key: 'scheduled', label: 'Due in period', kind: 'count' }, { key: 'done', label: 'Completed', kind: 'count' }, { key: 'ontime', label: 'On time', kind: 'count' }, { key: 'rate', label: 'Completion rate', kind: 'pct' }],
    rows: branchesIn(comp.jobs.map((j) => j.branchId)).map((b) => {
      const jobs = comp.jobs.filter((j) => j.branchId === b);
      const d = jobs.filter(jobDone);
      return { branch: branchLabel(b), scheduled: jobs.length, done: d.length, ontime: comp.onTime.filter((j) => j.branchId === b).length, rate: pct(d.length, jobs.length) };
    }),
    empty: 'No jobs due in this period.'
  },
  {
    id: 'equipment', title: 'Equipment at customer sites', description: 'Serial-tracked units installed at customer sites, and IOL equipment receivable after discontinuation.', basis: 'snapshot',
    kpis: [
    { label: 'Units at customer sites', value: units.filter((u) => u.status === 'Installed').length, kind: 'count' },
    { label: 'Receivable (to return)', value: units.filter((u) => u.status === 'Receivable').length, kind: 'count', tone: 'warning' }],

    columns: [{ key: 'ownership', label: 'Ownership' }, { key: 'installed', label: 'Installed', kind: 'count' }, { key: 'receivable', label: 'Receivable', kind: 'count' }],
    rows: owners.map((o) => ({ ownership: o, installed: units.filter((u) => u.ownership === o && u.status === 'Installed').length, receivable: units.filter((u) => u.ownership === o && u.status === 'Receivable').length })),
    empty: 'No equipment recorded at customer sites.'
  },
  {
    id: 'movements', title: 'Issue and return movements', description: 'Stock issued to technicians, installed, returned and transferred in the period.', basis: 'period',
    kpis: [
    { label: 'Issues', value: moves.filter((m) => m.type === 'Issue').length, kind: 'count' },
    { label: 'Returns', value: moves.filter((m) => m.type === 'Return').length, kind: 'count' },
    { label: 'Installations', value: moves.filter((m) => m.type === 'Installation').length, kind: 'count' }],

    columns: [{ key: 'type', label: 'Movement' }, { key: 'branch', label: 'Branch' }, { key: 'count', label: 'Movements', kind: 'count' }, { key: 'qty', label: 'Quantity', kind: 'count' }],
    rows: moveKeys.map((k) => {
      const [type, b] = k.split('|');
      const mine = moves.filter((m) => m.type === type && m.branchId === b);
      return { type, branch: branchLabel(b), count: mine.length, qty: sum(mine.map((m) => m.quantity)) };
    }),
    empty: 'No stock movements in this period.'
  },
  {
    id: 'service-changes', title: 'Service changes and pending clearance', description: 'Open service changes by type today, and discontinuations still waiting on technical or accounts clearance.', basis: 'snapshot',
    kpis: [
    { label: 'Open service changes', value: openChanges.length, kind: 'count' },
    { label: 'Pending clearance', value: pendingClear.length, kind: 'count', tone: pendingClear.length ? 'warning' : undefined },
    { label: 'Technical clearance pending', value: pendingClear.filter((s) => !clearanceDone(s.clearances!.technical)).length, kind: 'count' }],

    columns: [{ key: 'type', label: 'Type' }, { key: 'open', label: 'Open', kind: 'count' }, { key: 'approval', label: 'Awaiting approval', kind: 'count' }, { key: 'implement', label: 'Approved, not done', kind: 'count' }, { key: 'clearance', label: 'Pending clearance', kind: 'count' }, { key: 'period', label: 'Requested in period', kind: 'count' }],
    rows: types.map((t) => {
      const mine = changes.filter((s) => s.type === t);
      return {
        type: t, open: openChanges.filter((s) => s.type === t).length, approval: mine.filter((s) => s.status === 'Pending Approval').length, implement: mine.filter((s) => s.status === 'Approved').length,
        clearance: pendingClear.filter((s) => s.type === t).length, period: mine.filter((s) => inPeriod(c, s.requestedAt)).length
      };
    }),
    empty: 'No service changes in scope.'
  }];

}