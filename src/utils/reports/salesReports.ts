import { dhakaInputValue } from '../format';
import { STALE_DAYS, daysSince, lastActivity } from '../crmRules';
import { recordName, userName } from '../relations';
import { customerCategory, inPeriod, pass, pct, periodInRange, sum, type ReportCtx } from './scope';
import type { Opportunity } from '../../types/records';
import type { ReportSection } from '../../types/reports';

export const CAC_TIP =
'Customer acquisition cost = (approved or paid field expenses tagged “Customer acquisition” + agent commission accrued, excluding reversals) ÷ new customers won in the period. Account-servicing expenses are excluded.';

function oppCategory(c: ReportCtx, o: Opportunity) {
  return customerCategory(c, o.customerId) ?? c.db.leads.find((l) => l.id === o.leadId)?.category;
}

export function salesReports(c: ReportCtx): ReportSection[] {
  const { db, now } = c;
  const visits = db.fieldVisits.filter((v) => pass(c, { branchId: v.branchId, zoneId: v.zoneId, at: v.at, ownerId: v.userId }));
  const byDay = new Map<string, {date: string;person: string;visits: number;positive: number;}>();
  visits.forEach((v) => {
    const k = `${dhakaInputValue(v.at)}|${v.userId}`;
    const row = byDay.get(k) ?? { date: dhakaInputValue(v.at), person: userName(v.userId), visits: 0, positive: 0 };
    row.visits += 1;
    if (v.outcome === 'Positive') row.positive += 1;
    byDay.set(k, row);
  });
  const days = new Set(visits.map((v) => dhakaInputValue(v.at))).size;

  const opps = db.opportunities.filter((o) => o.status !== 'Merged' && pass(c, { branchId: o.branchId, zoneId: o.zoneId, ownerId: o.ownerId, category: oppCategory(c, o) }));
  const open = opps.filter((o) => o.status === 'Open' || o.status === 'Stalled');
  const cohort = opps.filter((o) => inPeriod(c, o.createdAt));
  const leads = db.leads.filter((l) => l.status !== 'Merged' && pass(c, { branchId: l.branchId, zoneId: l.zoneId, ownerId: l.ownerId, at: l.createdAt, category: l.category }));
  const stageRows = db.crmStages.map((s) => {
    const inStage = open.filter((o) => o.stage === s.id);
    return { stage: s.label, open: inStage.length, mrc: sum(inStage.map((o) => o.expectedMrc)), otc: sum(inStage.map((o) => o.otc)) };
  });

  const tenders = db.tenders.filter((t) => t.outcome === 'Pending' && t.submissionStatus === 'Preparing' && pass(c, { branchId: t.branchId, zoneId: t.zoneId, ownerId: t.ownerId }));
  const daysLeft = (iso: string) => Math.ceil((Date.parse(iso) - now.getTime()) / 86400000);

  const stale = open.
  map((o) => ({ o, idle: daysSince(lastActivity(o)), late: Date.parse(o.expectedDecisionDate) < now.getTime() })).
  filter((x) => x.idle >= STALE_DAYS || x.late || x.o.status === 'Stalled').
  sort((a, b) => b.idle - a.idle);

  const targets = db.salesTargets.filter((t) => periodInRange(c, t.period) && pass(c, { branchId: db.users.find((u) => u.id === t.userId)?.branch ?? null, ownerId: t.userId }));
  const inMonth = (iso: string | undefined, ym: string) => !!iso && dhakaInputValue(iso).slice(0, 7) === ym;
  const achieved = (t: (typeof targets)[number]) => {
    if (t.measure === 'visits') return db.fieldVisits.filter((v) => v.userId === t.userId && inMonth(v.at, t.period)).length;
    const won = db.opportunities.filter((o) => o.ownerId === t.userId && o.status === 'Won' && inMonth(o.wonAt, t.period));
    if (t.measure === 'wonDeals') return won.length;
    if (t.measure === 'newMrc') return sum(won.map((o) => o.expectedMrc));
    const accounts = new Set(db.billingAccounts.filter((b) => db.customers.find((cu) => cu.id === b.customerId)?.accountManagerId === t.userId).map((b) => b.id));
    return sum(db.receipts.filter((r) => accounts.has(r.billingAccountId) && r.status === 'Verified' && r.purpose !== 'Security deposit' && inMonth(r.receivedAt, t.period)).map((r) => r.amount));
  };
  const money = (m: string) => m === 'newMrc' || m === 'collectedCash';
  const targetRows = targets.
  filter((t) => !money(t.measure) || (t.measure === 'newMrc' ? c.role.permissions.includes('viewPipeline') : c.role.permissions.includes('viewFinancials'))).
  map((t) => {
    const a = achieved(t);
    return { person: userName(t.userId), period: t.period, measure: { visits: 'Visits', wonDeals: 'Won deals', newMrc: 'New MRC (BDT)', collectedCash: 'Verified collections (BDT)' }[t.measure], target: t.target, achieved: a, pct: pct(a, t.target) };
  });

  // Customer acquisition cost
  const branchIds = [...new Set(db.opportunities.map((o) => o.branchId))];
  const canComm = c.role.permissions.includes('viewCommissions');
  const cacRows = branchIds.
  filter((b) => pass(c, { branchId: b })).
  map((b) => {
    const expense = sum(
      db.expenseClaims.
      filter((cl) => cl.branchId === b && (cl.status === 'Approved' || cl.status === 'Paid') && pass(c, { branchId: cl.branchId, zoneId: cl.zoneId, ownerId: cl.claimantId })).
      flatMap((cl) => cl.lines.filter((l) => l.relation === 'Customer acquisition' && inPeriod(c, `${l.date.slice(0, 10)}T12:00:00+06:00`)).map((l) => l.amount))
    );
    const commission = sum(
      db.commissionAccruals.
      filter((a) => a.status !== 'Reversed' && periodInRange(c, a.period) && db.customers.find((cu) => cu.id === a.customerId)?.branchId === b).
      map((a) => a.amount)
    );
    const won = opps.filter((o) => o.branchId === b && o.status === 'Won' && inPeriod(c, o.wonAt)).length;
    const cost = expense + (canComm ? commission : 0);
    return { branch: branchLabel(b), expense, commission, won, cac: won ? Math.round(cost / won) : null };
  });
  const totalWon = sum(cacRows.map((r) => r.won));
  const totalCost = sum(cacRows.map((r) => r.expense + (canComm ? r.commission : 0)));

  return [
  {
    id: 'visits', title: 'Daily visits', description: 'Logged customer and prospect visits by day and person.', basis: 'period',
    kpis: [
    { label: 'Visits', value: visits.length, kind: 'count' },
    { label: 'Average per active day', value: days ? Math.round(visits.length / days * 10) / 10 : null, kind: 'count' },
    { label: 'Positive outcome', value: pct(visits.filter((v) => v.outcome === 'Positive').length, visits.length), kind: 'pct' }],

    columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'person', label: 'Person' }, { key: 'visits', label: 'Visits', kind: 'count' }, { key: 'positive', label: 'Positive', kind: 'count' }],
    rows: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date) || a.person.localeCompare(b.person)),
    empty: 'No visits logged in this period.'
  },
  {
    id: 'pipeline', title: 'Pipeline and conversion', description: 'Open opportunities by stage today, and conversion of opportunities and leads created in the period.', basis: 'snapshot',
    tip: 'Opportunity conversion = opportunities created in the period that are now Won ÷ all opportunities created in the period (merged excluded). Lead conversion uses leads created in the period that are now Converted.',
    kpis: [
    { label: 'Open opportunities', value: open.length, kind: 'count' },
    { label: 'Open pipeline (expected MRC)', value: sum(open.map((o) => o.expectedMrc)), kind: 'money', requires: 'viewPipeline', note: 'Not contracted, not billed' },
    { label: 'Opportunity conversion', value: pct(cohort.filter((o) => o.status === 'Won').length, cohort.length), kind: 'pct', note: `${cohort.length} created in period` },
    { label: 'Lead conversion', value: pct(leads.filter((l) => l.status === 'Converted').length, leads.length), kind: 'pct', note: `${leads.length} leads in period` }],

    columns: [{ key: 'stage', label: 'Stage' }, { key: 'open', label: 'Open', kind: 'count' }, { key: 'mrc', label: 'Expected MRC', kind: 'money', requires: 'viewPipeline' }, { key: 'otc', label: 'Expected OTC', kind: 'money', requires: 'viewPipeline' }],
    rows: stageRows.filter((r) => r.open > 0),
    empty: 'No open opportunities in scope.'
  },
  {
    id: 'tenders', title: 'Tender deadlines', description: 'Tenders still in preparation, nearest submission deadline first.', basis: 'snapshot',
    kpis: [
    { label: 'In preparation', value: tenders.length, kind: 'count' },
    { label: 'Due within 7 days', value: tenders.filter((t) => daysLeft(t.submissionDeadline) >= 0 && daysLeft(t.submissionDeadline) <= 7).length, kind: 'count', tone: 'warning' },
    { label: 'Past deadline', value: tenders.filter((t) => daysLeft(t.submissionDeadline) < 0).length, kind: 'count', tone: 'critical' }],

    columns: [{ key: 'id', label: 'Tender' }, { key: 'title', label: 'Title' }, { key: 'owner', label: 'Owner' }, { key: 'deadline', label: 'Submission deadline', kind: 'date' }, { key: 'days', label: 'Days left', kind: 'days' }, { key: 'value', label: 'Estimated value', kind: 'money', requires: 'viewPipeline' }],
    rows: [...tenders].sort((a, b) => a.submissionDeadline.localeCompare(b.submissionDeadline)).map((t) => ({ id: t.id, title: t.title, owner: userName(t.ownerId), deadline: t.submissionDeadline, days: daysLeft(t.submissionDeadline), value: t.estimatedValue })),
    empty: 'No tenders in preparation.'
  },
  {
    id: 'stale', title: 'Stale opportunities', description: `Open opportunities with no activity for ${STALE_DAYS}+ days, a passed decision date, or marked Stalled.`, basis: 'snapshot',
    kpis: [{ label: 'Stale or overdue', value: stale.length, kind: 'count', tone: stale.length ? 'warning' : undefined }, { label: 'Expected MRC at risk', value: sum(stale.map((s) => s.o.expectedMrc)), kind: 'money', requires: 'viewPipeline' }],
    columns: [{ key: 'id', label: 'Opportunity' }, { key: 'title', label: 'Title' }, { key: 'owner', label: 'Owner' }, { key: 'idle', label: 'Days idle', kind: 'days' }, { key: 'decision', label: 'Decision date', kind: 'date' }, { key: 'status', label: 'Status' }, { key: 'mrc', label: 'Expected MRC', kind: 'money', requires: 'viewPipeline' }],
    rows: stale.map(({ o, idle }) => ({ id: o.id, title: recordName(db, { type: 'opportunity', id: o.id }), owner: userName(o.ownerId), idle, decision: o.expectedDecisionDate, status: o.status, mrc: o.expectedMrc })),
    empty: 'No stale opportunities.'
  },
  {
    id: 'targets', title: 'Targets versus achievement', description: 'Monthly targets in the selected months against shared records: visits, won deals, new MRC and verified collections.', basis: 'period',
    kpis: [{ label: 'Targets met', value: targetRows.filter((r) => (r.pct ?? 0) >= 100).length, kind: 'count', note: `of ${targetRows.length}` }],
    columns: [{ key: 'person', label: 'Person' }, { key: 'period', label: 'Month' }, { key: 'measure', label: 'Measure' }, { key: 'target', label: 'Target', kind: 'count' }, { key: 'achieved', label: 'Achieved', kind: 'count' }, { key: 'pct', label: 'Achievement', kind: 'pct' }],
    rows: targetRows,
    empty: 'No targets set for these months.',
    note: 'Money targets are listed only for roles that may see those figures.'
  },
  {
    id: 'cac', title: 'Customer acquisition cost', description: 'Acquisition spend per new customer won, by branch.', basis: 'period', requires: 'viewFinancials', tip: CAC_TIP,
    kpis: [{ label: 'Customer acquisition cost', value: totalWon ? Math.round(totalCost / totalWon) : null, kind: 'money', tip: CAC_TIP, note: `${totalWon} new customers` }],
    columns: [{ key: 'branch', label: 'Branch' }, { key: 'expense', label: 'Acquisition expenses', kind: 'money' }, { key: 'commission', label: 'Agent commission', kind: 'money', requires: 'viewCommissions' }, { key: 'won', label: 'New customers', kind: 'count' }, { key: 'cac', label: 'CAC', kind: 'money' }],
    rows: cacRows,
    empty: 'No acquisition data in scope.',
    note: canComm ? undefined : 'Agent commission is restricted for your role and is not included in CAC.'
  }];

}

const BRANCH: Record<string, string> = { 'dhaka-north': 'Dhaka North', 'dhaka-south': 'Dhaka South', chattogram: 'Chattogram', sylhet: 'Sylhet' };
export const branchLabel = (id: string) => BRANCH[id] ?? id;