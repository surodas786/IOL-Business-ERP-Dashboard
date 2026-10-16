import {
  APPROVAL_BLOCKED_NOTE,
  APPROVAL_MODULE,
  APPROVAL_REQUIRES,
  accountAdvance,
  accountOutstanding,
  customerName,
  invoiceOutstanding,
  invoiceStatus,
  recordName,
  userName } from
'./relations';
import { DEMO_NOW, formatBDT, formatDhaka } from './format';
import { daysSince, lastActivity, opportunityFlags } from './crmRules';
import { claimTotal, expenseApproverIsManager } from './fieldRules';
import { isOpen as isOpenTicket, resolutionClock } from './ticketRules';
import { approverNote, ruleForApproval } from './approvalRules';
import type { BranchId, ModuleId, Permission, RoleId, Severity } from '../types/erp';
import type { ApprovalType, DemoDatabase, EntityRef } from '../types/records';
import type { WorkflowAction } from './workflow';
import type { QuoteAction } from './quoteWorkflow';
import type { JobAction } from './installationWorkflow';
import { TECHNICIANS } from './installationRules';
import { serviceChangeTasks } from './serviceChangeTasks';
import { checklistGaps, currentVersion, quoteName, releaseChecklist, termsOf } from './quoteRules';

export interface WorkActionDef {
  label: string;
  permission: Permission;
  /** When set by an approval rule, only these roles may act (in addition to holding the permission). */
  roles?: RoleId[];
  action: WorkflowAction | QuoteAction | JobAction;
  variant?: 'primary' | 'secondary';
  disabledReason?: string;
}

export interface WorkItem {
  id: string;
  kind: 'task' | 'bottleneck';
  severity: Severity;
  title: string;
  detail: string;
  timestamp: string;
  timeLabel: string;
  branchId: BranchId | null;
  zoneId?: string;
  module: ModuleId;
  requires?: Permission[];
  actions: WorkActionDef[];
  blockedNote?: string;
  entity: EntityRef;
  subject?: EntityRef;
}

const APPROVAL_SEVERITY: Record<ApprovalType, Severity> = {
  Quotation: 'warning',
  'Credit Note': 'warning',
  Commission: 'neutral',
  'Associate Payout': 'info',
  'Special Pricing': 'warning',
  'OTC Reduction': 'warning',
  'Credit Terms': 'warning',
  'Agent Commission Terms': 'neutral',
  'Advance Exception': 'warning',
  'Work Order Change': 'warning',
  'Due Allow': 'warning',
  'Billing Adjustment': 'warning',
  'Service Change': 'warning',
  'Clearance Exception': 'warning',
  'Stock Adjustment': 'warning',
  'Agent Reassignment': 'warning'
};

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - DEMO_NOW.getTime()) / 60000);
}

function duration(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Every open task and bottleneck derived from the shared demo records. */
export function deriveWorkItems(db: DemoDatabase): WorkItem[] {
  const items: WorkItem[] = [];

  db.approvals.
  filter((a) => a.status === 'Pending').
  forEach((a) => {
    const rule = ruleForApproval(db, a);
    const roles = a.type === 'Agent Commission Terms' || a.type === 'Agent Reassignment' ? ['businessHead'] as RoleId[] : rule?.approverRoles;
    items.push({
      id: `approval-${a.id}`,
      kind: 'task',
      severity: APPROVAL_SEVERITY[a.type],
      title: a.title,
      detail: a.detail,
      timestamp: a.requestedAt,
      timeLabel: 'Requested',
      branchId: a.branchId,
      zoneId: a.zoneId,
      module: APPROVAL_MODULE[a.type],
      requires: APPROVAL_REQUIRES[a.type],
      actions: [
      { label: 'Approve', permission: a.requiredPermission, roles, action: { type: 'DECIDE_APPROVAL', approvalId: a.id, decision: 'Approved', comment: '' } },
      { label: 'Return', permission: a.requiredPermission, roles, variant: 'secondary', action: { type: 'DECIDE_APPROVAL', approvalId: a.id, decision: 'Returned', comment: '' } },
      { label: 'Reject', permission: a.requiredPermission, roles, variant: 'secondary', action: { type: 'DECIDE_APPROVAL', approvalId: a.id, decision: 'Rejected', comment: '' } }],

      blockedNote: rule ? approverNote(rule) : APPROVAL_BLOCKED_NOTE[a.type],
      entity: { type: 'approval', id: a.id },
      subject: a.entity
    });
  });

  db.quotations.
  filter((q) => q.status === 'Approved' && !q.workOrderId).
  forEach((q) => {
    const name = quoteName(db, q);
    const t = termsOf(q);
    const gaps = checklistGaps(releaseChecklist(db, q));
    const base = { branchId: q.branchId, zoneId: q.zoneId, entity: { type: 'quotation' as const, id: q.id } };
    items.push({
      ...base,
      id: `release-${q.id}`,
      kind: gaps.length ? 'bottleneck' : 'task',
      severity: gaps.length ? 'warning' : 'info',
      title: `Release work order — ${name}`,
      detail: gaps.length ? `${q.id} v${q.version ?? 1} · blocked: ${gaps.map((g) => g.label.toLowerCase()).join('; ')}` : `${q.id} v${q.version ?? 1} · all release conditions met`,
      timestamp: currentVersion(q)?.approvedAt ?? q.createdAt,
      timeLabel: 'Approved',
      module: 'quotations',
      actions: [{ label: 'Release work order', permission: 'manageWorkOrders', action: { type: 'CONVERT_QUOTATION', quotationId: q.id }, disabledReason: gaps.length ? `${gaps.length} checklist item(s) open` : undefined }],
      blockedNote: 'Back Office releases the work order'
    });
    if (!q.validation) {
      items.push({
        ...base, id: `validate-${q.id}`, kind: 'task', severity: 'info', title: `Validate customer and site — ${name}`, detail: `${q.id} · ${t?.siteName ?? ''}, ${t?.siteAddress ?? ''}`,
        timestamp: q.createdAt, timeLabel: 'Quoted', module: 'quotations', requires: ['manageWorkOrders'],
        actions: [{ label: 'Mark validated', permission: 'manageWorkOrders', action: { type: 'QUOTE_VALIDATE_SITE', quotationId: q.id, note: '' } }]
      });
    }
  });

  db.quotations.
  filter((q) => q.advance?.state === 'Awaiting verification' && !q.workOrderId && (q.status === 'Approved' || q.status === 'Pending Approval')).
  forEach((q) => {
    const t = termsOf(q);
    items.push({
      id: `advance-${q.id}`, kind: 'task', severity: q.acceptance ? 'warning' : 'info', title: `Verify advance — ${quoteName(db, q)}`,
      detail: `${q.id} · ${formatBDT(t?.advanceRequired ?? 0)} required before work order release`, timestamp: q.acceptance?.recordedAt ?? q.createdAt, timeLabel: q.acceptance ? 'Accepted' : 'Quoted',
      branchId: q.branchId, zoneId: q.zoneId, module: 'billing', requires: ['viewFinancials'], entity: { type: 'quotation', id: q.id },
      actions: [{ label: 'Verify against bank statement', permission: 'recordCollection', action: { type: 'QUOTE_VERIFY_ADVANCE', quotationId: q.id, reference: 'Matched to bank statement (demo)' } }],
      blockedNote: 'Accounts verifies the advance'
    });
  });

  db.workOrders.forEach((w) => {
    (w.handovers ?? []).
    filter((h) => !h.acknowledgedAt && w.status !== 'Cancelled').
    forEach((h) => {
      const tech = h.department === 'Technical';
      const snap = w.snapshots?.find((s) => s.version === h.snapshotVersion);
      items.push({
        id: `handover-${w.id}-${h.department}`, kind: 'task', severity: 'info', title: `${h.department} handover — ${customerName(db, w.customerId)}`,
        detail: `${w.id} snapshot v${h.snapshotVersion}${snap ? ` · ${tech ? `deadline ${formatDhaka(snap.deadline)}` : `commissioning ${formatDhaka(snap.commissioningDate)}`}` : ''}`,
        timestamp: h.sentAt, timeLabel: 'Sent', branchId: w.branchId, zoneId: w.zoneId, module: tech ? 'installations' : 'billing',
        requires: tech ? ['technicalConfig'] : ['viewFinancials'], entity: { type: 'workOrder', id: w.id },
        actions: [{ label: 'Acknowledge', permission: tech ? 'technicalConfig' : 'recordCollection', action: { type: 'WO_ACK_HANDOVER', workOrderId: w.id, department: h.department } }]
      });
    });
  });

  db.installationJobs.forEach((j) => {
    const name = customerName(db, j.customerId);
    const base = { branchId: j.branchId, zoneId: j.zoneId, entity: { type: 'installationJob' as const, id: j.id } };
    if (j.status === 'Pending Assignment') {
      const tech = TECHNICIANS.find((t) => t.branchId === j.branchId);
      items.push({
        ...base, id: `job-assign-${j.id}`, kind: 'task', severity: 'warning', title: `Assign installation ${j.id} — ${name}`, detail: `Target ${formatDhaka(j.scheduledAt)} · ${j.materials}`,
        timestamp: j.history?.[0]?.at ?? j.scheduledAt, timeLabel: 'Created', module: 'installations',
        actions: tech ? [{ label: `Assign ${tech.name}`, permission: 'assignTickets', action: { type: 'JOB_ASSIGN', jobId: j.id, technicianName: tech.name } }] : [],
        blockedNote: 'Technical Supervisor assigns'
      });
    }
    if (j.status === 'Scheduled' || j.status === 'In Progress') {
      items.push({
        ...base, id: `job-${j.id}`, kind: 'task', severity: 'info', title: `Installation ${j.id} — ${name}`, detail: `${j.technicianName || 'Unassigned'} · ${j.status}`,
        timestamp: j.scheduledAt, timeLabel: 'Scheduled', module: 'installations', requires: ['technicalConfig'], actions: []
      });
    }
    if (j.status === 'On Hold' && j.hold) {
      items.push({
        ...base, id: `job-hold-${j.id}`, kind: 'bottleneck', severity: j.hold.nextReviewAt < DEMO_NOW.toISOString() ? 'critical' : 'warning', title: `Installation on hold — ${name}`,
        detail: `${j.id} · ${j.hold.party}: ${j.hold.reason} · review ${formatDhaka(j.hold.nextReviewAt)}`, timestamp: j.hold.since, timeLabel: 'On hold since', module: 'installations', actions: []
      });
    }
    if (j.status === 'Work Completed') {
      items.push({
        ...base, id: `job-verify-${j.id}`, kind: 'task', severity: 'warning', title: `Verify installation ${j.id} — ${name}`, detail: `Marked done by ${userName(j.handoverById)} · tests ${j.completion?.tests.result ?? '—'}`,
        timestamp: j.handoverAt ?? j.scheduledAt, timeLabel: 'Handed over', module: 'installations', requires: ['assignTickets'], actions: [],
        blockedNote: 'Technical Supervisor verifies on the job page'
      });
    }
    if (j.status === 'Verified') {
      items.push({
        ...base, id: `billing-${j.id}`, kind: 'bottleneck', severity: 'warning', title: `Verified, billing not commenced — ${name}`,
        detail: `${j.id} · Accounts to review the approved commencement rule`, timestamp: j.verifiedAt ?? j.scheduledAt, timeLabel: 'Verified', module: 'billing', requires: ['viewFinancials'], actions: [],
        blockedNote: 'Accounts Officer reviews on the job page'
      });
    }
  });

  db.receipts.
  filter((r) => r.status === 'Pending Verification').
  forEach((r) => {
    const ba = db.billingAccounts.find((b) => b.id === r.billingAccountId);
    items.push({
      id: `receipt-${r.id}`,
      kind: 'task',
      severity: 'warning',
      title: `Verify receipt ${r.id} — ${ba?.name ?? ''}`,
      detail: `${formatBDT(r.amount)} · ${r.method} · ${r.reference}`,
      timestamp: r.receivedAt,
      timeLabel: 'Received',
      branchId: r.branchId,
      zoneId: r.zoneId,
      module: 'billing',
      requires: ['viewFinancials'],
      actions: [],
      blockedNote: 'Accounts Officer verifies evidence and allocation in Billing → Payment Verification',
      entity: { type: 'receipt', id: r.id }
    });
  });

  db.billingAccounts.forEach((ba) => {
    const advance = accountAdvance(db, ba.id);
    const outstanding = accountOutstanding(db, ba.id);
    if (advance > 0 && outstanding > 0) {
      items.push({
        id: `advance-${ba.id}`,
        kind: 'task',
        severity: 'warning',
        title: `Unallocated advance with unpaid invoices — ${ba.name}`,
        detail: `${formatBDT(advance)} advance · ${formatBDT(outstanding)} outstanding`,
        timestamp: '2026-10-09T11:00:00+06:00',
        timeLabel: 'Advance held since',
        branchId: ba.branchId,
        zoneId: ba.zoneId,
        module: 'billing',
        requires: ['viewFinancials'],
        actions: [{ label: 'Allocate advance', permission: 'recordCollection', action: { type: 'ALLOCATE_ADVANCE', billingAccountId: ba.id } }],
        blockedNote: 'Accounts Officer allocates advances',
        entity: { type: 'billingAccount', id: ba.id }
      });
    }
  });

  db.invoices.
  filter((i) => invoiceStatus(i) === 'Overdue').
  forEach((i) => {
    const days = Math.round((DEMO_NOW.getTime() - new Date(i.dueDate).getTime()) / 86400000);
    items.push({
      id: `overdue-${i.id}`,
      kind: 'bottleneck',
      severity: 'critical',
      title: `Overdue invoice ${i.id} — ${recordName(db, { type: 'invoice', id: i.id }).split(' — ')[1]}`,
      detail: `${formatBDT(invoiceOutstanding(i))} outstanding · ${days} days overdue`,
      timestamp: i.dueDate,
      timeLabel: 'Due',
      branchId: i.branchId,
      zoneId: i.zoneId,
      module: 'billing',
      requires: ['viewFinancials'],
      actions: [],
      entity: { type: 'invoice', id: i.id }
    });
  });

  serviceChangeTasks(db).forEach((t) => {
    const sc = db.serviceChanges.find((x) => x.id === t.changeId)!;
    items.push({
      id: t.id,
      kind: t.severity === 'critical' ? 'bottleneck' : 'task',
      severity: t.severity,
      title: `${t.title} — ${customerName(db, sc.customerId)}`,
      detail: `${sc.id} · ${sc.connectionId} · ${t.detail}`,
      timestamp: t.at,
      timeLabel: t.timeLabel,
      branchId: sc.branchId,
      zoneId: sc.zoneId,
      module: 'serviceChanges',
      requires: t.requires,
      actions: [],
      entity: { type: 'serviceChange', id: sc.id }
    });
  });

  db.tickets.
  filter((t) => isOpenTicket(t) && (t.priority === 'Urgent' || t.priority === 'High')).
  forEach((t) => {
    const clock = resolutionClock(t);
    const due = new Date(clock.dueMs).toISOString();
    const left = minutesUntil(due);
    items.push({
      id: `ticket-${t.id}`,
      kind: 'task',
      severity: left <= 240 ? 'critical' : 'warning',
      title: `${t.priority} ticket ${t.id} — ${t.subject}`,
      detail: `${customerName(db, t.customerId)} · ${t.status}${t.assigneeName ? ` · ${t.assigneeName}` : ' · unassigned'} · ${clock.state === 'paused' ? 'SLA paused' : left >= 0 ? `${duration(left)} to resolution target` : `resolution target breached ${duration(left)} ago`}`,
      timestamp: due,
      timeLabel: 'SLA due',
      branchId: t.branchId,
      zoneId: t.zoneId,
      module: 'tickets',
      actions: [],
      entity: { type: 'ticket', id: t.id }
    });
  });

  // Sales CRM: overdue follow-ups, stale opportunities and duplicate/assignment reviews.
  db.opportunities.forEach((o) => {
    const flags = opportunityFlags(db, o);
    const org = recordName(db, { type: 'lead', id: o.leadId });
    if (flags.overdueFollowUp) {
      items.push({
        id: `followup-${o.id}`,
        kind: 'task',
        severity: 'warning',
        title: `Overdue follow-up — ${org}`,
        detail: `${o.nextAction} · ${userName(o.ownerId)}`,
        timestamp: o.nextActionDue,
        timeLabel: 'Was due',
        branchId: o.branchId,
        zoneId: o.zoneId,
        module: 'crm',
        actions: [],
        blockedNote: 'Open the opportunity to log the follow-up',
        entity: { type: 'opportunity', id: o.id }
      });
    } else if (flags.stale) {
      items.push({
        id: `stale-${o.id}`,
        kind: 'bottleneck',
        severity: 'neutral',
        title: `Stale opportunity — ${org}`,
        detail: `No activity for ${daysSince(lastActivity(o))} days · ${userName(o.ownerId)}`,
        timestamp: lastActivity(o),
        timeLabel: 'Last activity',
        branchId: o.branchId,
        zoneId: o.zoneId,
        module: 'crm',
        actions: [],
        entity: { type: 'opportunity', id: o.id }
      });
    }
  });

  // Survey workflow hand-offs.
  db.surveys.forEach((s) => {
    const opp = db.opportunities.find((o) => o.id === s.opportunityId);
    const name = s.customerId && customerName(db, s.customerId) || db.leads.find((l) => l.id === opp?.leadId)?.company || s.id;
    const base = { branchId: s.branchId, zoneId: s.zoneId, module: 'surveys' as const, actions: [], entity: { type: 'survey' as const, id: s.id } };
    if (s.status === 'Submitted' || s.status === 'Back Office Review' && !s.boClearedAt) {
      items.push({ ...base, id: `survey-bo-${s.id}`, kind: 'task', severity: 'info', title: `Review survey request — ${name}`, detail: `${s.id} · ${s.address} · check site contact and access before assignment`, timestamp: s.requestedAt, timeLabel: 'Requested', requires: ['manageWorkOrders'], blockedNote: 'Back Office reviews survey requests' });
    } else if (s.status === 'Back Office Review') {
      items.push({ ...base, id: `survey-assign-${s.id}`, kind: 'task', severity: 'warning', title: `Assign survey technician — ${name}`, detail: `${s.id} · cleared by Back Office · ${s.address}`, timestamp: s.boClearedAt ?? s.requestedAt, timeLabel: 'Cleared', requires: ['assignTickets', 'technicalConfig'], blockedNote: 'Technical Supervisor assigns surveys' });
    } else if (s.status === 'Submitted for Technical Review') {
      items.push({ ...base, id: `survey-review-${s.id}`, kind: 'task', severity: 'warning', title: `Technical review — ${name}`, detail: `${s.id} · surveyed by ${s.technicianName} · proposed ${s.tech?.outcome ?? '—'}`, timestamp: s.completedAt ?? s.requestedAt, timeLabel: 'Submitted', requires: ['assignTickets', 'technicalConfig'], blockedNote: 'Technical Supervisor reviews surveys' });
    } else if (s.status === 'Returned') {
      items.push({ ...base, id: `survey-returned-${s.id}`, kind: 'bottleneck', severity: 'warning', title: `Survey returned for correction — ${name}`, detail: `${s.id} · ${s.technicianName} · ${s.reviewNote ?? ''}`, timestamp: s.reviewedAt ?? s.requestedAt, timeLabel: 'Returned', requires: ['technicalConfig'], blockedNote: 'Assigned technician corrects and resubmits' });
    }
  });
  db.surveyBypasses.
  filter((b) => b.status === 'Pending').
  forEach((b) => {
    const opp = db.opportunities.find((o) => o.id === b.opportunityId);
    items.push({
      id: `bypass-${b.id}`, kind: 'task', severity: 'warning', title: `Survey bypass request — ${opp?.title ?? b.opportunityId}`,
      detail: `${b.id} · ${b.reason} · requested by ${userName(b.requestedById)}`, timestamp: b.requestedAt, timeLabel: 'Requested',
      branchId: b.branchId, zoneId: b.zoneId, module: 'surveys', requires: ['assignTickets', 'technicalConfig'], actions: [], blockedNote: 'Decide in Surveys and Feasibility → Bypass requests', entity: { type: 'opportunity', id: b.opportunityId }
    });
  });

  // Customer profile corrections awaiting approval.
  db.profileCorrections.
  filter((p) => p.status === 'Pending').
  forEach((p) => {
    items.push({
      id: `correction-${p.id}`,
      kind: 'task',
      severity: 'warning',
      title: `Approve profile correction — ${customerName(db, p.customerId)}`,
      detail: `${p.id} · requested by ${userName(p.requestedById)} · old and proposed values on the customer profile`,
      timestamp: p.requestedAt,
      timeLabel: 'Requested',
      branchId: p.branchId,
      zoneId: p.zoneId,
      module: 'customers',
      requires: ['manageSalesTeam'],
      actions: [],
      blockedNote: 'Review on the customer’s Overview tab',
      entity: { type: 'customer', id: p.customerId }
    });
  });

  // Field expense claims awaiting a decision or payment.
  db.expenseClaims.forEach((c) => {
    const total = claimTotal(c);
    if (c.status === 'Submitted') {
      const byManager = expenseApproverIsManager(db, c.claimantId);
      const manager = db.users.find((u) => u.id === db.users.find((x) => x.id === c.claimantId)?.managerId);
      items.push({
        id: `claim-${c.id}`,
        kind: 'task',
        severity: 'neutral',
        title: `Expense claim ${c.id} — ${userName(c.claimantId)}`,
        detail: `${formatBDT(total)} · ${c.lines.length} line${c.lines.length === 1 ? '' : 's'} · awaiting ${byManager && manager ? manager.name : 'Finance Approver'}`,
        timestamp: c.submittedAt ?? c.createdAt,
        timeLabel: 'Submitted',
        branchId: c.branchId,
        module: 'field',
        requires: [byManager ? 'approveExpense' : 'approveFinancial'],
        actions: [],
        blockedNote: 'Decide in Field Activities › Expenses (claimants can’t approve their own)',
        entity: { type: 'expenseClaim', id: c.id }
      });
    }
    if (c.status === 'Approved') {
      items.push({
        id: `claimpay-${c.id}`,
        kind: 'task',
        severity: 'info',
        title: `Pay expense claim ${c.id} — ${userName(c.claimantId)}`,
        detail: `${formatBDT(total)} approved by ${userName(c.decidedById)}`,
        timestamp: c.decidedAt ?? c.createdAt,
        timeLabel: 'Approved',
        branchId: c.branchId,
        module: 'field',
        requires: ['payExpense'],
        actions: [],
        blockedNote: 'Record payment in Field Activities › Expenses',
        entity: { type: 'expenseClaim', id: c.id }
      });
    }
  });

  db.crmConflicts.
  filter((c) => c.status === 'Open').
  forEach((c) => {
    const o = db.opportunities.find((x) => x.id === c.opportunityId);
    if (!o) return;
    items.push({
      id: `conflict-${c.id}`,
      kind: 'task',
      severity: 'warning',
      title: `${c.kind} — ${recordName(db, { type: 'lead', id: o.leadId })}`,
      detail: c.reasons[0] ?? '',
      timestamp: c.raisedAt,
      timeLabel: 'Raised',
      branchId: o.branchId,
      zoneId: o.zoneId,
      module: 'crm',
      requires: ['manageSalesTeam'],
      actions: [],
      blockedNote: 'Resolve in Sales CRM › Duplicate review',
      entity: { type: 'opportunity', id: o.id }
    });
  });

  return items;
}