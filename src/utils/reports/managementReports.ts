import { canSeeItem, centreItems, isOverdue } from '../approvalCentre';
import { invoiceNet } from '../relations';
import { associateExposureRows, SEPARATION_NOTE } from './financeReports';
import { branchLabel } from './salesReports';
import { COMPLETION_TIP, jobDone } from './technicalReports';
import { customerCategory, pass, pct, sum, type ReportCtx } from './scope';
import type { ReportSection } from '../../types/reports';

export function managementReports(c: ReportCtx): ReportSection[] {
  const { db, now } = c;
  const active = db.connections.filter((x) => x.status === 'Active' && pass(c, { branchId: x.branchId, zoneId: x.zoneId, category: customerCategory(c, x.customerId) }));
  const open = db.opportunities.filter((o) => (o.status === 'Open' || o.status === 'Stalled') && pass(c, { branchId: o.branchId, zoneId: o.zoneId, ownerId: o.ownerId }));
  const jobs = db.installationJobs.filter((j) => j.status !== 'Cancelled' && pass(c, { branchId: j.branchId, zoneId: j.zoneId, at: j.scheduledAt }));
  const invoices = db.invoices.filter((i) => pass(c, { branchId: i.branchId, zoneId: i.zoneId, at: i.issuedAt }));
  const receipts = db.receipts.filter((r) => r.status === 'Verified' && r.purpose !== 'Security deposit' && pass(c, { branchId: r.branchId, zoneId: r.zoneId, at: r.receivedAt }));
  const branches = [...new Set([...active, ...open, ...jobs, ...invoices].map((x) => x.branchId))].filter((b) => pass(c, { branchId: b })).sort();

  const pending = centreItems(db).filter((i) => i.status === 'Pending' && canSeeItem(db, i, c.user, c.role) && pass(c, { branchId: i.branchId }));
  const cats = [...new Set(pending.map((i) => i.category))];
  const exposure = associateExposureRows(c);

  return [
  {
    id: 'position', title: 'Company position', description: 'Headline measures. Contracted MRC, billed revenue and verified cash are separate and never combined.', basis: 'snapshot', note: SEPARATION_NOTE,
    kpis: [
    { label: 'Active connections', value: active.length, kind: 'count' },
    { label: 'Contracted MRC', value: sum(active.map((x) => x.mrc)), kind: 'money', requires: 'viewFinancials', note: 'Active services' },
    { label: 'Pipeline value', value: sum(open.map((o) => o.expectedMrc)), kind: 'money', requires: 'viewPipeline', note: 'Expected MRC, open' },
    { label: 'Installation completion', value: pct(jobs.filter(jobDone).length, jobs.length), kind: 'pct', tip: COMPLETION_TIP, note: 'Jobs due in period' },
    { label: 'Pending approvals', value: pending.length, kind: 'count', note: `${pending.filter((i) => isOverdue(i, now)).length} overdue` }],

    columns: [], rows: [], empty: ''
  },
  {
    id: 'regional', title: 'Regional performance', description: 'Branch comparison. Billed and collected follow the date filter; active services and pipeline are as of today.', basis: 'period', tip: COMPLETION_TIP,
    kpis: [],
    columns: [
    { key: 'branch', label: 'Branch' },
    { key: 'active', label: 'Active connections', kind: 'count' },
    { key: 'mrc', label: 'Contracted MRC', kind: 'money', requires: 'viewFinancials' },
    { key: 'billed', label: 'Billed (period)', kind: 'money', requires: 'viewFinancials' },
    { key: 'collected', label: 'Verified cash (period)', kind: 'money', requires: 'viewFinancials' },
    { key: 'pipeline', label: 'Pipeline', kind: 'money', requires: 'viewPipeline' },
    { key: 'completion', label: 'Installation completion', kind: 'pct' }],

    rows: branches.map((b) => {
      const j = jobs.filter((x) => x.branchId === b);
      return {
        branch: branchLabel(b), active: active.filter((x) => x.branchId === b).length, mrc: sum(active.filter((x) => x.branchId === b).map((x) => x.mrc)),
        billed: sum(invoices.filter((i) => i.branchId === b).map(invoiceNet)), collected: sum(receipts.filter((r) => r.branchId === b).map((r) => r.amount)),
        pipeline: sum(open.filter((o) => o.branchId === b).map((o) => o.expectedMrc)), completion: pct(j.filter(jobDone).length, j.length)
      };
    }),
    empty: 'No branch activity in scope.'
  },
  {
    id: 'associate-exposure', title: 'Associate exposure', description: 'What each associate owes or holds today. Advance, Due and Security Deposit are separate balances.', basis: 'snapshot', requires: 'viewFinancials',
    kpis: [
    { label: 'Associate dues', value: sum(exposure.map((r) => r.due)), kind: 'money' },
    { label: 'Unverified shortfall', value: sum(exposure.map((r) => r.shortfall)), kind: 'money', tone: 'critical' },
    { label: 'Deposits held', value: sum(exposure.map((r) => r.deposit)), kind: 'money' }],

    columns: [{ key: 'associate', label: 'Associate' }, { key: 'branch', label: 'Branch' }, { key: 'due', label: 'Due', kind: 'money' }, { key: 'advance', label: 'Advance', kind: 'money' }, { key: 'deposit', label: 'Security deposit', kind: 'money' }, { key: 'shortfall', label: 'Shortfall', kind: 'money' }, { key: 'open', label: 'Open settlements', kind: 'count' }],
    rows: exposure,
    empty: 'No associates in scope.'
  },
  {
    id: 'approvals', title: 'Pending approvals', description: 'Waiting decisions by type, from the shared Approvals centre.', basis: 'snapshot',
    kpis: [{ label: 'Pending', value: pending.length, kind: 'count' }, { label: 'Overdue', value: pending.filter((i) => isOverdue(i, now)).length, kind: 'count', tone: 'critical' }],
    columns: [{ key: 'category', label: 'Type' }, { key: 'pending', label: 'Pending', kind: 'count' }, { key: 'overdue', label: 'Overdue', kind: 'count' }, { key: 'oldest', label: 'Oldest (days)', kind: 'days' }],
    rows: cats.map((cat) => {
      const mine = pending.filter((i) => i.category === cat);
      return { category: cat, pending: mine.length, overdue: mine.filter((i) => isOverdue(i, now)).length, oldest: Math.max(...mine.map((i) => Math.floor((now.getTime() - Date.parse(i.requestedAt)) / 86400000))) };
    }),
    empty: 'No pending approvals.'
  }] as
  ReportSection[];
}