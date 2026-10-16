import { accountBalances } from '../billingCalc';
import { balances, disputedAmount, owedAmount, shortfall, unverifiedRemitted, verifiedRemitted } from '../associateRules';
import { invoiceNet, invoiceOutstanding, recordName, userName } from '../relations';
import { branchLabel } from './salesReports';
import { customerCategory, inPeriod, pass, periodInRange, sum, type ReportCtx } from './scope';
import type { BillingAccount } from '../../types/records';
import type { ReportSection } from '../../types/reports';

export const SEPARATION_NOTE = 'Billed revenue, verified collected cash and contracted MRC are separate measures and are never added together.';

export function financeReports(c: ReportCtx): ReportSection[] {
  const { db, now } = c;
  const acct = (id: string) => db.billingAccounts.find((b) => b.id === id);
  const acctRec = (b: BillingAccount | undefined, at?: string) => ({ branchId: b?.branchId, zoneId: b?.zoneId, category: customerCategory(c, b?.customerId), ownerId: db.customers.find((x) => x.id === b?.customerId)?.accountManagerId, at });
  const acctName = (b?: BillingAccount) => b?.customerId ? recordName(db, { type: 'customer', id: b.customerId }) : b?.associateId ? recordName(db, { type: 'associate', id: b.associateId }) : b?.id ?? '—';
  const branchesIn = (ids: string[]) => [...new Set(ids)].filter((b) => pass(c, { branchId: b }));

  const awaitingBilling = db.installationJobs.filter((j) => j.status === 'Verified' && !j.billingCommencedAt && pass(c, { branchId: j.branchId, zoneId: j.zoneId, category: customerCategory(c, j.customerId) }));
  const connMrc = (id: string) => db.connections.find((x) => x.id === id)?.mrc ?? 0;

  const active = db.connections.filter((x) => x.status === 'Active' && pass(c, { branchId: x.branchId, zoneId: x.zoneId, category: customerCategory(c, x.customerId) }));
  const acceptedQuotes = db.quotations.filter((q) => q.status === 'Accepted' && pass(c, { branchId: q.branchId, zoneId: q.zoneId, at: q.createdAt }));

  const invoices = db.invoices.filter((i) => pass(c, acctRec(acct(i.billingAccountId), i.issuedAt)));
  const receipts = db.receipts.filter((r) => r.purpose !== 'Security deposit' && pass(c, acctRec(acct(r.billingAccountId), r.receivedAt)));
  const verified = receipts.filter((r) => r.status === 'Verified');
  const pendingVer = receipts.filter((r) => r.status === 'Pending Verification');

  const outstanding = db.invoices.filter((i) => invoiceOutstanding(i) > 0 && pass(c, acctRec(acct(i.billingAccountId))));
  const ageDays = (due: string) => Math.floor((now.getTime() - Date.parse(due)) / 86400000);
  const bucket = (d: number) => d <= 0 ? 'current' : d <= 30 ? 'd30' : d <= 60 ? 'd60' : d <= 90 ? 'd90' : 'd90p';

  const accounts = db.billingAccounts.filter((b) => pass(c, acctRec(b)));
  const bal = accounts.map((b) => ({ b, x: accountBalances(db, b.id) }));

  const claimLines = db.expenseClaims.
  filter((cl) => (cl.status === 'Approved' || cl.status === 'Paid') && pass(c, { branchId: cl.branchId, zoneId: cl.zoneId, ownerId: cl.claimantId })).
  flatMap((cl) => cl.lines.filter((l) => inPeriod(c, `${l.date.slice(0, 10)}T12:00:00+06:00`)).map((l) => ({ category: `Field · ${l.category}`, amount: l.amount, paid: cl.status === 'Paid' })));
  const opsLines = db.opsExpenses.
  filter((e) => (e.status === 'Approved' || e.status === 'Paid') && periodInRange(c, e.period) && pass(c, { branchId: e.branchId })).
  map((e) => ({ category: e.category, amount: e.amount, paid: e.status === 'Paid' }));
  const expenseLines = [...claimLines, ...opsLines];
  const expenseCats = [...new Set(expenseLines.map((l) => l.category))];

  const settlements = db.associateSettlements.filter((s) => {
    const a = db.associates.find((x) => x.id === s.associateId);
    return periodInRange(c, s.period) && pass(c, { branchId: a?.branchId, zoneId: a?.zoneId });
  });

  const accruals = db.commissionAccruals.filter((a) => periodInRange(c, a.period) && pass(c, { branchId: db.customers.find((x) => x.id === a.customerId)?.branchId, category: customerCategory(c, a.customerId) }));
  const agents = [...new Set(accruals.map((a) => a.agentId))];
  const byStatus = (s: string, list = accruals) => sum(list.filter((a) => a.status === s).map((a) => a.amount));

  return [
  {
    id: 'billing-pending', title: 'Billing pending', description: 'Installations verified by Technical whose billing has not started yet.', basis: 'snapshot', requires: 'viewFinancials',
    kpis: [{ label: 'Awaiting billing review', value: awaitingBilling.length, kind: 'count', tone: awaitingBilling.length ? 'warning' : undefined }, { label: 'MRC waiting to start', value: sum(awaitingBilling.map((j) => connMrc(j.connectionId))), kind: 'money' }],
    columns: [{ key: 'job', label: 'Job' }, { key: 'customer', label: 'Customer' }, { key: 'connection', label: 'Service' }, { key: 'verified', label: 'Verified', kind: 'date' }, { key: 'days', label: 'Days waiting', kind: 'days' }, { key: 'mrc', label: 'MRC', kind: 'money' }],
    rows: awaitingBilling.map((j) => ({ job: j.id, customer: recordName(db, { type: 'customer', id: j.customerId }), connection: j.connectionId, verified: j.verifiedAt ?? null, days: j.verifiedAt ? Math.max(0, Math.floor((now.getTime() - Date.parse(j.verifiedAt)) / 86400000)) : null, mrc: connMrc(j.connectionId) })),
    empty: 'Nothing waiting for billing.'
  },
  {
    id: 'mrc-otc', title: 'MRC and OTC summary', description: 'Contracted MRC on active services today, and OTC on quotations accepted in the period.', basis: 'snapshot', requires: 'viewFinancials', note: SEPARATION_NOTE,
    kpis: [{ label: 'Contracted MRC', value: sum(active.map((x) => x.mrc)), kind: 'money', note: 'Active services — not billed revenue' }, { label: 'OTC accepted in period', value: sum(acceptedQuotes.map((q) => q.otc)), kind: 'money' }],
    columns: [{ key: 'branch', label: 'Branch' }, { key: 'active', label: 'Active services', kind: 'count' }, { key: 'mrc', label: 'Contracted MRC', kind: 'money' }, { key: 'otc', label: 'OTC accepted (period)', kind: 'money' }],
    rows: branchesIn([...active.map((x) => x.branchId), ...acceptedQuotes.map((q) => q.branchId)]).map((b) => ({ branch: branchLabel(b), active: active.filter((x) => x.branchId === b).length, mrc: sum(active.filter((x) => x.branchId === b).map((x) => x.mrc)), otc: sum(acceptedQuotes.filter((q) => q.branchId === b).map((q) => q.otc)) })),
    empty: 'No active services in scope.'
  },
  {
    id: 'billed', title: 'Billed revenue', description: 'Invoices issued in the period, net of credit notes. Not cash.', basis: 'period', requires: 'viewFinancials', note: SEPARATION_NOTE,
    kpis: [{ label: 'Billed revenue (net)', value: sum(invoices.map(invoiceNet)), kind: 'money' }, { label: 'Invoices', value: invoices.length, kind: 'count' }, { label: 'Credits', value: sum(invoices.map((i) => i.credits)), kind: 'money' }],
    columns: [{ key: 'branch', label: 'Branch' }, { key: 'count', label: 'Invoices', kind: 'count' }, { key: 'gross', label: 'Gross', kind: 'money' }, { key: 'credits', label: 'Credits', kind: 'money' }, { key: 'net', label: 'Net billed', kind: 'money' }],
    rows: branchesIn(invoices.map((i) => i.branchId)).map((b) => {
      const mine = invoices.filter((i) => i.branchId === b);
      return { branch: branchLabel(b), count: mine.length, gross: sum(mine.map((i) => i.amount)), credits: sum(mine.map((i) => i.credits)), net: sum(mine.map(invoiceNet)) };
    }),
    empty: 'No invoices issued in this period.'
  },
  {
    id: 'collections', title: 'Verified collections', description: 'Cash verified against the bank in the period. Unverified claims are shown separately and never counted.', basis: 'period', requires: 'viewFinancials', note: SEPARATION_NOTE,
    kpis: [{ label: 'Verified collected cash', value: sum(verified.map((r) => r.amount)), kind: 'money' }, { label: 'Awaiting verification (not counted)', value: sum(pendingVer.map((r) => r.amount)), kind: 'money', tone: 'warning' }],
    columns: [{ key: 'branch', label: 'Branch' }, { key: 'verified', label: 'Verified', kind: 'money' }, { key: 'pending', label: 'Awaiting verification', kind: 'money' }, { key: 'rejected', label: 'Rejected or reversed', kind: 'money' }],
    rows: branchesIn(receipts.map((r) => r.branchId)).map((b) => {
      const mine = receipts.filter((r) => r.branchId === b);
      return { branch: branchLabel(b), verified: sum(mine.filter((r) => r.status === 'Verified').map((r) => r.amount)), pending: sum(mine.filter((r) => r.status === 'Pending Verification').map((r) => r.amount)), rejected: sum(mine.filter((r) => r.status === 'Rejected' || r.status === 'Reversed').map((r) => r.amount)) };
    }),
    empty: 'No receipts in this period.'
  },
  {
    id: 'ageing', title: 'Receivables ageing', description: 'Outstanding invoice balances today by days past the due date.', basis: 'snapshot', requires: 'viewFinancials',
    kpis: [{ label: 'Total receivable', value: sum(outstanding.map(invoiceOutstanding)), kind: 'money' }, { label: 'Over 90 days', value: sum(outstanding.filter((i) => ageDays(i.dueDate) > 90).map(invoiceOutstanding)), kind: 'money', tone: 'critical' }],
    columns: [{ key: 'branch', label: 'Branch' }, { key: 'current', label: 'Not yet due', kind: 'money' }, { key: 'd30', label: '1–30', kind: 'money' }, { key: 'd60', label: '31–60', kind: 'money' }, { key: 'd90', label: '61–90', kind: 'money' }, { key: 'd90p', label: '90+', kind: 'money' }, { key: 'total', label: 'Total', kind: 'money' }],
    rows: branchesIn(outstanding.map((i) => i.branchId)).map((b) => {
      const row: Record<string, number | string> = { branch: branchLabel(b), current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 };
      outstanding.filter((i) => i.branchId === b).forEach((i) => {
        row[bucket(ageDays(i.dueDate))] = (row[bucket(ageDays(i.dueDate))] as number) + invoiceOutstanding(i);
        row.total = (row.total as number) + invoiceOutstanding(i);
      });
      return row;
    }),
    empty: 'No outstanding invoices.'
  },
  {
    id: 'advances', title: 'Advance balances', description: 'Verified, unallocated customer advances today. Kept separate from security deposits.', basis: 'snapshot', requires: 'viewFinancials',
    kpis: [{ label: 'Advance held', value: sum(bal.map((x) => x.x.advance)), kind: 'money' }],
    columns: [{ key: 'account', label: 'Billing account' }, { key: 'name', label: 'Account holder' }, { key: 'branch', label: 'Branch' }, { key: 'advance', label: 'Advance', kind: 'money' }, { key: 'due', label: 'Outstanding due', kind: 'money' }],
    rows: bal.filter((x) => x.x.advance > 0).map(({ b, x }) => ({ account: b.id, name: acctName(b), branch: branchLabel(b.branchId), advance: x.advance, due: x.due })),
    empty: 'No advance balances.'
  },
  {
    id: 'deposits', title: 'Security deposits', description: 'Verified security deposits held today. Never applied to invoices automatically.', basis: 'snapshot', requires: 'viewFinancials',
    kpis: [{ label: 'Deposits held', value: sum(bal.map((x) => x.x.deposit)), kind: 'money' }],
    columns: [{ key: 'account', label: 'Billing account' }, { key: 'name', label: 'Account holder' }, { key: 'branch', label: 'Branch' }, { key: 'deposit', label: 'Deposit', kind: 'money' }],
    rows: bal.filter((x) => x.x.deposit > 0).map(({ b, x }) => ({ account: b.id, name: acctName(b), branch: branchLabel(b.branchId), deposit: x.deposit })),
    empty: 'No security deposits held.'
  },
  {
    id: 'expenses', title: 'Expenses', description: 'Approved field expense claims and operational payments in the period, by category.', basis: 'period', requires: 'viewFinancials',
    kpis: [{ label: 'Paid', value: sum(expenseLines.filter((l) => l.paid).map((l) => l.amount)), kind: 'money' }, { label: 'Approved, not yet paid', value: sum(expenseLines.filter((l) => !l.paid).map((l) => l.amount)), kind: 'money', tone: 'warning' }],
    columns: [{ key: 'category', label: 'Category' }, { key: 'approved', label: 'Approved, unpaid', kind: 'money' }, { key: 'paid', label: 'Paid', kind: 'money' }, { key: 'total', label: 'Total', kind: 'money' }],
    rows: expenseCats.map((cat) => {
      const mine = expenseLines.filter((l) => l.category === cat);
      return { category: cat, approved: sum(mine.filter((l) => !l.paid).map((l) => l.amount)), paid: sum(mine.filter((l) => l.paid).map((l) => l.amount)), total: sum(mine.map((l) => l.amount)) };
    }),
    empty: 'No approved expenses in this period.',
    note: 'Salary rows are payment records only; no payroll is calculated.'
  },
  {
    id: 'associate-recon', title: 'Associate reconciliation', description: 'Associate settlements for the selected months. A declaration is not a remittance; only verified remittances count.', basis: 'period', requires: 'viewFinancials',
    kpis: [
    { label: 'Verified remitted', value: sum(settlements.map(verifiedRemitted)), kind: 'money' },
    { label: 'Shortfall', value: sum(settlements.map(shortfall)), kind: 'money', tone: 'critical' },
    { label: 'Not yet reconciled', value: settlements.filter((s) => s.status !== 'Reconciled').length, kind: 'count' }],

    columns: [{ key: 'associate', label: 'Associate' }, { key: 'period', label: 'Month' }, { key: 'status', label: 'Status' }, { key: 'owed', label: 'Payout / receivable', kind: 'money' }, { key: 'verified', label: 'Verified', kind: 'money' }, { key: 'unverified', label: 'Unverified', kind: 'money' }, { key: 'disputed', label: 'Disputed', kind: 'money' }, { key: 'shortfall', label: 'Shortfall', kind: 'money' }],
    rows: settlements.map((s) => ({ associate: recordName(db, { type: 'associate', id: s.associateId }), period: s.period, status: s.status, owed: owedAmount(s), verified: verifiedRemitted(s), unverified: unverifiedRemitted(s), disputed: disputedAmount(s), shortfall: shortfall(s) })),
    empty: 'No associate settlements for these months.'
  },
  {
    id: 'commission', title: 'Agent commission', description: 'Agent commission accruals for the selected months. Separate from Associate shares.', basis: 'period', requires: 'viewCommissions',
    kpis: [
    { label: 'Accrued', value: byStatus('Accrued'), kind: 'money' },
    { label: 'Pending approval', value: byStatus('Pending Approval'), kind: 'money' },
    { label: 'Approved', value: byStatus('Approved'), kind: 'money' },
    { label: 'Paid', value: byStatus('Paid'), kind: 'money' },
    { label: 'Reversed', value: byStatus('Reversed'), kind: 'money' }],

    columns: [{ key: 'agent', label: 'Agent' }, { key: 'accrued', label: 'Accrued', kind: 'money' }, { key: 'pending', label: 'Pending', kind: 'money' }, { key: 'approved', label: 'Approved', kind: 'money' }, { key: 'paid', label: 'Paid', kind: 'money' }, { key: 'reversed', label: 'Reversed', kind: 'money' }],
    rows: agents.map((id) => {
      const mine = accruals.filter((a) => a.agentId === id);
      return { agent: recordName(db, { type: 'salesAgent', id }), accrued: byStatus('Accrued', mine), pending: byStatus('Pending Approval', mine), approved: byStatus('Approved', mine), paid: byStatus('Paid', mine), reversed: byStatus('Reversed', mine) };
    }),
    empty: 'No commission accruals for these months.'
  }].
  map((s) => ({ ...s, rows: s.rows as ReportSection['rows'] })) as ReportSection[];
}

export const associateExposureRows = (c: ReportCtx) =>
c.db.associates.
filter((a) => pass(c, { branchId: a.branchId, zoneId: a.zoneId })).
map((a) => {
  const b = balances(c.db, a.id);
  const open = c.db.associateSettlements.filter((s) => s.associateId === a.id && s.status !== 'Reconciled');
  return { associate: a.name, branch: branchLabel(a.branchId), due: b.Due, advance: b.Advance, deposit: b['Security Deposit'], shortfall: sum(open.map(shortfall)), open: open.length, manager: userName(a.responsibleExecutiveId) };
});