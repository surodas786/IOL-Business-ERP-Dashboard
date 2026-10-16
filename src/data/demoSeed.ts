import type { DemoDatabase, Quotation, WorkOrder } from '../types/records';
import type { ChecklistItem, WorkOrderSnapshot } from '../types/quotation';
import { newQuotations, quotationDetails, quoteApprovalRules, quoteApprovals, quoteAudit, quoteNotifications, quotePolicy, taxTreatments } from './seed/quotations';
import type { CustomerSnapshot } from '../types/customer';
import { billingAccounts, connections, customers, preCorrectionSnapshot, profileCorrections, sites } from './seed/customers';
import { crmConflicts, crmStages, leads, opportunities, tenders } from './seed/sales';
import { installationJobs, inventoryMovements, quotations, workOrders } from './seed/operations';
import { dutyRoster, tickets } from './seed/tickets';
import { opsExpenses, recurringPayments } from './seed/opsFinance';
import { connectionStatusOverrides, serviceChangeApprovalRules, serviceChangeApprovals, serviceChanges } from './seed/serviceChanges';
import { stockItems, surveyBypasses, surveys } from './seed/surveys';
import { invoices, receipts } from './seed/finance';
import { agentApprovalRules, agentApprovals, agentAttributions, agentList, agentSettlements, attributionReassignments, commissionAccruals, commissionProposals } from './seed/agents';
import type { CommissionLock } from '../types/agent';
import { associateLedger, associateList, associateSettlements, settlementRules } from './seed/associates';
import { approvals, auditEvents, notifications } from './seed/workflow';
import { adminAreas, approvalRules, masterData, operationalZones, orgLevels, orgNodes, policies } from './seed/admin';
import { demoUsers } from './users';
import { expenseClaims, fieldVisits, salesTargets } from './seed/field';
import {
  accountTerms,
  billingAdjustments,
  billingApprovalRules,
  billingApprovals,
  billingPolicy,
  billingRuns,
  dueAllows,
  extraReceipts,
  invoiceExtras,
  receiptExtras } from
'./seed/billing';

import {
  equipmentUnits,
  extraMovements,
  extraStockItems,
  inventoryApprovalRules,
  inventoryApprovals,
  inventoryItems,
  movementExtras,
  stockAdjustments,
  stockExtras,
  stockReservations,
  stockReturns,
  vendorPrices,
  vendors } from
'./seed/inventory';

/** Bump when the seed shape changes so stale browser copies are replaced. */
export const DEMO_DATA_VERSION = 18;

/** Approved commission (or Self-Sale) locked into seeded work orders. */
function lockFor(woId: string): CommissionLock | undefined {
  const p = commissionProposals.find((x) => x.workOrderId === woId && (x.status === 'Approved' || x.status === 'Self-Sale'));
  if (!p) return undefined;
  return {
    proposalId: p.id, agentId: p.agentId, selfSale: p.selfSale, basis: p.basis, arrangement: p.arrangement, months: p.months,
    mrcPct: p.approvedMrcPct ?? 0, otcPct: p.approvedOtcPct ?? 0, lockedAt: p.decidedAt ?? p.preparedAt, lockedById: p.decidedById ?? p.preparedById
  };
}

const sepUttara = associateSettlements.find((s) => s.id === 'ASM-2026-0009')!;

const allQuotations: Quotation[] = [...quotations, ...newQuotations].map((q) => {
  const extra = quotationDetails[q.id] ?? {};
  const merged: Quotation = { ...q, ...extra, customerSnapshot: snapshotFor(q.customerId, q.createdAt) };
  const t = merged.versions?.find((v) => v.version === merged.version)?.terms;
  if (t) Object.assign(merged, { description: t.description, mrc: t.mrc, otc: t.otc, marginPct: t.marginPct, validUntil: t.validUntil });
  return merged;
});

/** Released work orders carry the locked snapshot of the approved version plus survey parameters and BOM. */
function withSnapshot(w: WorkOrder): WorkOrder {
  const q = allQuotations.find((x) => x.id === w.quotationId);
  const v = q?.versions?.find((x) => x.version === q.version);
  if (!q || !v) return w;
  const s = surveys.find((x) => x.id === q.surveyId);
  const deadline = new Date(new Date(w.createdAt).getTime() + v.terms.leadTimeDays * 86400000).toISOString();
  const done = (label: string, key: ChecklistItem['key'], detail: string): ChecklistItem => ({ key, label, ok: true, applicable: true, detail });
  const snapshot: WorkOrderSnapshot = {
    version: 1, quotationId: q.id, quotationVersion: v.version, terms: v.terms, surveyId: s?.id, technical: s?.tech, bom: s?.bom ?? [], deadline, commissioningDate: deadline,
    checklist: [
    done('Customer and site validated', 'customerSite', 'Validated by Back Office'),
    done('Survey approved or authorised bypass approved', 'survey', `${s?.id ?? '—'} approved`),
    done('Commercial terms approved', 'commercial', `Version ${v.version} — Approved`),
    done('Customer acceptance recorded', 'acceptance', q.acceptance ? `${q.acceptance.method} · ${q.acceptance.reference}` : 'Recorded'),
    { key: 'advance', label: 'Required advance verified or exception approved', ok: true, applicable: v.terms.advanceRequired > 0, detail: v.terms.advanceRequired > 0 ? 'Verified' : 'No advance required' },
    done('Materials identified', 'materials', `${s?.bom?.length ?? 0} BOM line(s)`),
    { key: 'commission', label: 'Agent commission approved where applicable', ok: true, applicable: !!v.terms.agentId, detail: v.terms.agentId ? 'Commission terms approved' : 'Not agent-sourced' }],

    lockedAt: w.createdAt, lockedById: w.createdById, reason: 'Initial release'
  };
  const ack = w.id === 'WO-2026-0149' ? { Technical: { acknowledgedById: 'u-06', acknowledgedAt: '2026-10-03T15:00:00+06:00' }, Accounts: {} } : { Technical: { acknowledgedById: 'u-06', acknowledgedAt: w.createdAt }, Accounts: { acknowledgedById: 'u-09', acknowledgedAt: w.createdAt } };
  return {
    ...w,
    snapshots: [snapshot],
    handovers: (['Technical', 'Accounts'] as const).map((department) => ({ department, snapshotVersion: 1, sentAt: w.createdAt, ...ack[department] }))
  };
}

/** Identity of a customer as it stood when a document was issued (seeded docs only). */
function snapshotFor(customerId: string | undefined, capturedAt: string): CustomerSnapshot | undefined {
  const c = customers.find((x) => x.id === customerId);
  if (!c) return undefined;
  const before = preCorrectionSnapshot[c.id] ?? {};
  return {
    name: before.name ?? c.name,
    nameBn: c.nameBn,
    category: c.category ?? c.segment,
    registeredAddress: before.registeredAddress ?? c.registeredAddress ?? '',
    capturedAt
  };
}


/** FICTIONAL DEMO DATA for IOL Business ERP. Not connected to any live system. */
export const demoSeed: DemoDatabase = {
  version: DEMO_DATA_VERSION,
  leads,
  // QT-2026-0421 is approved, so its opportunity sits in Negotiation.
  opportunities: opportunities.map((o) => o.id === 'OP-2026-0162' ? { ...o, stage: 'negotiation', nextAction: 'Release work order once survey and advance clear', nextActionDue: '2026-10-17T17:00:00+06:00' } : o),
  customers,
  sites,
  connections: connections.map((c) => connectionStatusOverrides[c.id] ? { ...c, status: connectionStatusOverrides[c.id] } : c),
  billingAccounts: billingAccounts.map((b) => ({ ...b, ...accountTerms[b.id] })),
  surveys,
  quotations: allQuotations,
  workOrders: workOrders.map((w) => withSnapshot({ ...w, customerSnapshot: snapshotFor(w.customerId, w.createdAt), commissionLock: lockFor(w.id) })),
  installationJobs,
  inventoryMovements: [...inventoryMovements.map((m) => ({ ...m, ...movementExtras[m.id] })), ...extraMovements],
  invoices: invoices.map((i) => ({ ...i, ...invoiceExtras[i.id], postedById: 'u-09', customerSnapshot: snapshotFor(i.customerId, i.issuedAt) })),
  receipts: [...receipts.map((r) => ({ ...r, ...receiptExtras[r.id] })), ...extraReceipts],
  serviceChanges,
  tickets,
  associates: associateList,
  associateSettlements,
  associateLedger,
  settlementRules,
  salesAgents: agentList,
  agentAttributions,
  attributionReassignments,
  commissionProposals,
  commissionAccruals,
  agentSettlements,
  approvals: [
  ...approvals.map((a) =>
  a.id === 'AP-2026-0101' ?
  { ...a, title: 'Quotation — QT-2026-0418 v2 · Meghna Textiles Ltd', detail: 'Commercial approval of MRC and terms', quotationVersion: 2 } :
  a.id === 'AP-2026-0098' ?
  { ...a, quotationVersion: 1 } :
  a.id === 'AP-2026-0102' ?
  { ...a, title: 'Credit note ADJ-2026-0071 — Rahman Steel Works', adjustmentId: 'ADJ-2026-0071' } :
  a.id === 'AP-2026-0105' ?
  { ...a, title: 'Associate settlement ASM-2026-0009 — Uttara Net Point (Sep 2026)', detail: `Payout ${sepUttara.payout.toLocaleString('en-IN')} BDT · 30% of revenue after defined deductions`, amount: sepUttara.payout, settlementId: sepUttara.id, related: [] } :
  a.id === 'AP-2026-0104' ?
  { ...a, title: 'Agent commission settlement AGS-2026-0007 — Karim Molla', detail: '1 accrual · 80% of first-month MRC on CN-50176 (Mirpur Diagnostic Centre) · ৳ 18,000', entity: { type: 'salesAgent' as const, id: 'SA-301' }, requestedById: 'u-09', agentSettlementId: 'AGS-2026-0007' } :
  a
  ),
  ...agentApprovals,
  ...quoteApprovals,
  ...billingApprovals,
  ...serviceChangeApprovals,
  ...inventoryApprovals],

  notifications: [...quoteNotifications, ...notifications],
  auditEvents: [...quoteAudit, ...auditEvents],
  users: demoUsers,
  orgLevels,
  orgNodes,
  adminAreas,
  operationalZones,
  approvalRules: [...approvalRules, ...quoteApprovalRules, ...billingApprovalRules, ...serviceChangeApprovalRules, ...inventoryApprovalRules, ...agentApprovalRules],
  masterData,
  policies,
  ownershipChanges: [],
  crmStages,
  tenders,
  crmConflicts,
  fieldVisits,
  expenseClaims,
  salesTargets,
  profileCorrections,
  surveyBypasses,
  stockItems: [...stockItems.map((s) => ({ ...s, ...stockExtras[s.id] })), ...extraStockItems],
  inventoryItems,
  equipmentUnits,
  stockReservations,
  stockReturns,
  stockAdjustments,
  vendors,
  vendorPrices,
  taxTreatments,
  quotePolicy,
  changeRequests: [],
  billingAdjustments,
  dueAllows,
  billingRuns,
  suspensionReviews: [],
  billingPolicy,
  dutyRoster,
  opsExpenses,
  recurringPayments
};