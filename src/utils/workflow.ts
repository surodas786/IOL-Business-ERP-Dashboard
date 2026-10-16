import { branches } from '../data/branches';
import { dhakaDayAt, formatBDT, formatDhaka } from './format';
import { approverNote, ruleForApproval, snapshotRule } from './approvalRules';
import { categoryFromLead, currentSnapshot, segmentFor } from './customerProfile';
import {
  APPROVAL_MODULE,
  APPROVAL_REQUIRES,
  accountOutstanding,
  invoiceOutstanding,
  nextId,
  receiptUnallocated } from
'./relations';
import { roles } from '../data/roles';
import { checklistGaps, quoteBypass, quoteSurvey, releaseChecklist, termsOf } from './quoteRules';
import { afterApprovalDecided } from './quoteWorkflow';
import { afterBillingApproval } from './billingWorkflow';
import { afterServiceChangeApproval } from './serviceChangeWorkflow';
import { afterInventoryApproval } from './inventoryWorkflow';
import { afterAssociateApproval } from './associateWorkflow';
import { afterAgentApproval } from './agentWorkflow';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { ApprovalType, AuditEvent, DemoDatabase, EntityRef, Receipt, StoredNotification } from '../types/records';

export type WorkflowAction =
{type: 'DECIDE_APPROVAL';approvalId: string;decision: 'Approved' | 'Rejected' | 'Returned';comment: string;} |
{type: 'RESUBMIT_APPROVAL';approvalId: string;comment: string;} |
{type: 'CONVERT_QUOTATION';quotationId: string;} |
{type: 'VERIFY_RECEIPT';receiptId: string;} |
{type: 'ALLOCATE_ADVANCE';billingAccountId: string;};

export interface Actor {
  id: string;
  name: string;
}

export interface WorkflowResult {
  db: DemoDatabase;
  message: string;
  ok: boolean;
}

interface Ctx {
  d: DemoDatabase;
  actor: Actor;
  at: string;
}


function audit(ctx: Ctx, action: string, summary: string, entity: EntityRef, related: EntityRef[] = [], changes?: AuditEvent['changes']) {
  ctx.d.auditEvents.unshift({
    id: nextId(ctx.d.auditEvents, 'AE-', 5),
    at: ctx.at,
    actorName: ctx.actor.name,
    actorId: ctx.actor.id,
    action,
    summary,
    entity,
    related,
    changes
  });
}

function notify(
ctx: Ctx,
n: {title: string;detail: string;module: ModuleId;branchId: BranchId | null;entity: EntityRef;requires?: Permission[];forUserIds?: string[];priority?: StoredNotification['priority'];kind?: StoredNotification['kind'];})
{
  // Duplicate prevention: the same unread notice about the same record is not repeated.
  const dup = ctx.d.notifications.find((x) => x.title === n.title && x.entity.type === n.entity.type && x.entity.id === n.entity.id && x.readBy.length <= 1 && Date.parse(ctx.at) - Date.parse(x.at) < 3600000);
  if (dup) return;
  ctx.d.notifications.unshift({ id: nextId(ctx.d.notifications, 'NT-', 4), at: ctx.at, readBy: [ctx.actor.id], ...n });
}

/** Commission terms and agent reassignment stay exclusive to the Business Head (Sales Head). */
const EXCLUSIVE_SALES_HEAD: ApprovalType[] = ['Agent Commission Terms', 'Agent Reassignment'];

function fail(db: DemoDatabase, message: string): WorkflowResult {
  return { db, message, ok: false };
}

/** Allocates a verified receipt's free balance to the account's oldest open invoices. */
function allocateReceipt(d: DemoDatabase, r: Receipt): {allocated: number;invoiceIds: string[];} {
  if (r.purpose === 'Security deposit' || r.status !== 'Verified') return { allocated: 0, invoiceIds: [] };
  let available = receiptUnallocated(r);
  const touched: string[] = [];
  const open = d.invoices.
  filter((i) => i.billingAccountId === r.billingAccountId && invoiceOutstanding(i) > 0).
  sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  let allocated = 0;
  for (const inv of open) {
    if (available <= 0) break;
    const take = Math.min(available, invoiceOutstanding(inv));
    inv.paidAmount += take;
    const existing = r.allocations.find((a) => a.invoiceId === inv.id);
    if (existing) existing.amount += take;else
    r.allocations.push({ invoiceId: inv.id, amount: take });
    available -= take;
    allocated += take;
    touched.push(inv.id);
  }
  return { allocated, invoiceIds: touched };
}

export function applyWorkflow(db: DemoDatabase, action: WorkflowAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ctx: Ctx = { d, actor, at };

  switch (action.type) {
    case 'RESUBMIT_APPROVAL':{
        const ap = d.approvals.find((a) => a.id === action.approvalId);
        if (!ap || ap.status !== 'Returned') return fail(db, 'Only returned approvals can be resubmitted.');
        if (ap.requestedById !== actor.id) return fail(db, 'Only the requester can resubmit.');
        if ((action.comment ?? '').trim().length < 10) return fail(db, 'Explain what changed (at least 10 characters).');
        ap.status = 'Pending';
        ap.returned = undefined;
        ap.history = [...(ap.history ?? []), { at, byId: actor.id, byName: actor.name, action: 'Resubmitted', comment: action.comment.trim() }];
        audit(ctx, 'Approval resubmitted', `${ap.title} — ${action.comment.trim()}`, { type: 'approval', id: ap.id }, [ap.entity], [{ field: 'Status', from: 'Returned', to: 'Pending' }]);
        notify(ctx, { title: `${ap.type} resubmitted`, detail: `${ap.title} · ${action.comment.trim()}`, module: 'approvals', branchId: ap.branchId, requires: [ap.requiredPermission], entity: { type: 'approval', id: ap.id }, kind: 'Handover' });
        return { db: d, ok: true, message: 'Resubmitted to the approver.' };
      }

    case 'DECIDE_APPROVAL':{
        const ap = d.approvals.find((a) => a.id === action.approvalId);
        if (!ap || ap.status !== 'Pending' && ap.status !== 'Returned') return fail(db, 'This approval has already been decided.');
        if (ap.status === 'Returned') return fail(db, 'Returned to the requester — waiting for resubmission.');
        const comment = (action.comment ?? '').trim();
        if (comment.length < 10) return fail(db, 'A comment of at least 10 characters is required for every decision.');
        const rule = ruleForApproval(d, ap);
        const actorRole = d.users.find((u) => u.id === actor.id)?.role;
        const role = roles.find((r) => r.id === actorRole);
        if (EXCLUSIVE_SALES_HEAD.includes(ap.type) && actorRole !== 'businessHead') return fail(db, 'Only the Business Head (Sales Head) can decide agent commission terms. Management, Chairman, Operations, Accounts and System Admin do not hold this authority.');
        if (!role || !role.permissions.includes(ap.requiredPermission)) return fail(db, rule ? approverNote(rule) : 'Your role does not hold this approval authority.');
        if (rule && actorRole && !rule.approverRoles.includes(actorRole)) return fail(db, approverNote(rule));
        if (ap.requestedById === actor.id) return fail(db, 'Separation of duties: you can’t decide an approval you requested.');
        const snap = snapshotRule(rule, { permission: ap.requiredPermission, roles: roles.filter((r) => r.permissions.includes(ap.requiredPermission)).map((r) => r.id) }, at);
        if (action.decision === 'Returned') {
          ap.status = 'Returned';
          ap.returned = { at, byId: actor.id, comment };
          ap.history = [...(ap.history ?? []), { at, byId: actor.id, byName: actor.name, action: 'Returned', comment, rule: snap }];
          audit(ctx, 'Approval returned', `${ap.title} returned to requester — ${comment}`, { type: 'approval', id: ap.id }, [ap.entity], [{ field: 'Status', from: 'Pending', to: 'Returned' }]);
          notify(ctx, { title: `${ap.type} returned for more information`, detail: `${ap.title} · ${comment}`, module: 'approvals', branchId: ap.branchId, forUserIds: [ap.requestedById], entity: { type: 'approval', id: ap.id }, priority: 'High', kind: 'Handover' });
          return { db: d, ok: true, message: 'Returned to the requester. Nothing else has changed.' };
        }
        const approved = action.decision === 'Approved';
        const verb = approved ? 'approved' : 'rejected';
        ap.status = action.decision;
        ap.decidedById = actor.id;
        ap.decidedAt = at;
        ap.ruleSnapshot = snap;
        ap.history = [...(ap.history ?? []), { at, byId: actor.id, byName: actor.name, action: action.decision, comment, rule: snap }];
        const extra = afterApprovalDecided(d, ap, actor, at);
        if (ap.type === 'Quotation' && ap.quotationVersion !== undefined && approved) {
          const q = d.quotations.find((x) => x.id === ap.entity.id);
          const opp = q && d.opportunities.find((o) => o.id === q.opportunityId);
          const neg = d.crmStages.find((s) => s.id === 'negotiation');
          const idx = (id: string) => d.crmStages.findIndex((s) => s.id === id);
          if (q?.status === 'Approved' && opp && neg && idx(opp.stage) < idx(neg.id)) {
            opp.history.push({ at, byId: actor.id, kind: 'Stage', detail: `${d.crmStages[idx(opp.stage)]?.label} → ${neg.label} (quotation approved)` });
            opp.stage = neg.id;
          }
        }

        if (ap.type === 'Quotation' && ap.quotationVersion === undefined) {
          const q = d.quotations.find((x) => x.id === ap.entity.id);
          if (q) {
            q.status = approved ? 'Approved' : 'Rejected';
            const opp = d.opportunities.find((o) => o.id === q.opportunityId);
            const neg = d.crmStages.find((s) => s.id === 'negotiation');
            const idx = (id: string) => d.crmStages.findIndex((s) => s.id === id);
            if (opp && approved && neg && idx(opp.stage) < idx(neg.id)) {
              opp.history.push({ at, byId: actor.id, kind: 'Stage', detail: `${d.crmStages[idx(opp.stage)]?.label} → ${neg.label} (quotation approved)` });
              opp.stage = neg.id;
            }
          }
        }
        if (ap.commissionProposalId || ap.reassignmentId || ap.agentSettlementId) {
          const err = afterAgentApproval(d, ap, approved, actor, at);
          if (err) return fail(db, err);
        } else if (ap.settlementId) {
          const err = afterAssociateApproval(d, ap, approved, actor, at);
          if (err) return fail(db, err);
        } else if (ap.stockAdjustmentId) {
          const err = afterInventoryApproval(d, ap, approved, actor, at);
          if (err) return fail(db, err);
        } else if (ap.serviceChangeId) {
          const err = afterServiceChangeApproval(d, ap, approved, actor, at);
          if (err) return fail(db, err);
        } else if (ap.adjustmentId || ap.dueAllowId) {
          const err = afterBillingApproval(d, ap, approved, actor, at);
          if (err) return fail(db, err);
        } else if (ap.type === 'Credit Note' && approved) {
          const inv = d.invoices.find((i) => i.id === ap.entity.id);
          if (inv) inv.credits += ap.amount;
        }
        if (ap.type === 'Commission' && approved) {
          const agentRef = ap.related.find((r) => r.type === 'salesAgent');
          const agent = d.salesAgents.find((s) => s.id === agentRef?.id);
          if (agent) agent.commissionApprovedYtd += ap.amount;
        }
        if (ap.type === 'Associate Payout' && approved && !ap.settlementId) {
          const assoc = d.associates.find((a) => a.id === ap.entity.id);
          if (assoc) assoc.lastPayout = { amount: ap.amount, at };
        }
        audit(ctx, `Approval ${verb}`, `${ap.title} ${verb} — ${comment}`, { type: 'approval', id: ap.id }, [ap.entity, ...ap.related], [{ field: 'Status', from: 'Pending', to: action.decision }, { field: 'Rule applied', to: `${snap.name} (${snap.condition})` }]);
        if (ap.requestedById !== actor.id) notify(ctx, { title: `Your ${ap.type.toLowerCase()} request was ${verb}`, detail: `${ap.title} · ${comment}`, module: 'approvals', branchId: ap.branchId, forUserIds: [ap.requestedById], entity: { type: 'approval', id: ap.id }, kind: 'Update' });
        notify(ctx, {
          title: `${ap.type} ${verb}`,
          detail: `${ap.title} · by ${actor.name}`,
          module: APPROVAL_MODULE[ap.type],
          branchId: ap.branchId,
          requires: APPROVAL_REQUIRES[ap.type],
          entity: { type: 'approval', id: ap.id }
        });
        return { db: d, ok: true, message: `${ap.title} ${verb}.${extra}` };
      }

    case 'CONVERT_QUOTATION':{
        const q = d.quotations.find((x) => x.id === action.quotationId);
        if (!q || q.status !== 'Approved') return fail(db, 'Only approved quotations can be released as work orders.');
        if (q.workOrderId) return fail(db, `${q.workOrderId} has already been released.`);
        const actorRole = d.users.find((u) => u.id === actor.id)?.role;
        if (!roles.find((r) => r.id === actorRole)?.permissions.includes('manageWorkOrders')) return fail(db, 'Only Back Office or the Business Head release work orders.');
        const checklist = releaseChecklist(d, q);
        const gaps = checklistGaps(checklist);
        if (gaps.length) return fail(db, `Release blocked — missing: ${gaps.map((g) => g.label).join('; ')}.`);
        const terms = termsOf(q)!;
        const survey = quoteSurvey(d, q);
        const bypass = quoteBypass(d, q);
        const opp = d.opportunities.find((o) => o.id === q.opportunityId)!;
        const lead = d.leads.find((l) => l.id === opp.leadId)!;
        const branch = branches.find((b) => b.id === q.branchId)!;
        const loc = { branchId: q.branchId, zoneId: q.zoneId };

        // An opportunity for an existing customer adds a site/service under that customer instead of a new one.
        const existing = d.customers.find((c) => c.id === opp.customerId);
        const customerId = existing?.id ?? nextId(d.customers, 'CU-', 4);
        const existingSite = terms.siteId ?
        d.sites.find((s) => s.id === terms.siteId) :
        existing && opp.expansion === 'Additional service' ?
        d.sites.find((s) => s.customerId === existing.id && s.address === terms.siteAddress) :
        undefined;
        const siteId = existingSite?.id ?? nextId(d.sites, 'ST-', 4);
        const existingBa = existing ? d.billingAccounts.find((b) => b.customerId === existing.id && b.collectionMode === 'Direct') : undefined;
        const baId = existingBa?.id ?? nextId(d.billingAccounts, 'BA-', 4);
        const cnId = nextId(d.connections, 'CN-', 5);
        const woId = nextId(d.workOrders, 'WO-2026-', 4);
        const ijId = nextId(d.installationJobs, 'IJ-2026-', 4);
        const scheduledAt = dhakaDayAt(at, Math.min(3, terms.leadTimeDays), '10:00');
        const deadline = dhakaDayAt(at, terms.leadTimeDays, '17:00');

        if (!existing) {
          const category = categoryFromLead(lead.category);
          d.customers.push({
            id: customerId, name: lead.company, nameBn: lead.companyBn, segment: segmentFor(category), category, accountManagerId: opp.ownerId, leadId: lead.id, status: 'Onboarding', since: at,
            profileStage: 'Negotiation', submittedAt: at, registeredAddress: lead.address,
            contacts: [{ id: `${customerId}-c1`, role: 'Primary', name: lead.contactName, designation: lead.contactDesignation, phone: lead.contactPhone, email: lead.contactEmail }],
            ...loc
          });
        }
        const snapshotCustomer = d.customers.find((c) => c.id === customerId)!;
        q.customerSnapshot = q.customerSnapshot ?? currentSnapshot(snapshotCustomer, at);
        if (!existingSite) d.sites.push({ id: siteId, customerId, name: terms.siteName || 'Main site', address: terms.siteAddress || lead.address, contactName: lead.contactName, contactPhone: lead.contactPhone, ...loc });
        if (!existingBa) d.billingAccounts.push({ id: baId, name: lead.company, customerId, collectionMode: 'Direct', billingContact: lead.contactName, billingAddress: lead.address, ...loc });
        d.connections.push({ id: cnId, customerId, siteId, billingAccountId: baId, serviceType: terms.serviceType, bandwidthMbps: terms.bandwidthMbps, mrc: terms.mrc, status: 'Pending Activation', ...loc });
        const bom = survey?.status === 'Approved' ? survey.bom ?? [] : [];
        d.workOrders.push({
          id: woId, type: 'New Connection', customerId, siteId, quotationId: q.id, status: 'In Progress', createdAt: at, createdById: actor.id, customerSnapshot: currentSnapshot(snapshotCustomer, at), ...loc,
          snapshots: [{
            version: 1, quotationId: q.id, quotationVersion: q.version ?? 1, terms: structuredClone(terms), surveyId: survey?.status === 'Approved' ? survey.id : undefined, bypassId: bypass?.id,
            technical: survey?.status === 'Approved' ? structuredClone(survey.tech) : undefined, bom: structuredClone(bom), deadline, commissioningDate: deadline, checklist, lockedAt: at, lockedById: actor.id, reason: 'Initial release'
          }],
          handovers: [{ department: 'Technical', snapshotVersion: 1, sentAt: at }, { department: 'Accounts', snapshotVersion: 1, sentAt: at }]
        });
        const materials = bom.length ? bom.map((l) => `${l.item} ×${l.quantity}${l.unit === 'pc' ? '' : ` ${l.unit}`}`).join(', ') : terms.equipment.map((e) => e.item).join(', ');
        const ontEquipment = terms.equipment.find((e) => /ONT|ONU/i.test(e.item));
        const materialLines = bom.length ?
        bom.map((l, i) => ({ id: `${ijId}-m${i + 1}`, item: l.item, sku: l.sku ?? l.item, unit: l.unit, planned: l.quantity, reserved: 0, issued: 0, consumed: 0, returned: 0, serialised: l.unit === 'pc' })) :
        [{ id: `${ijId}-m1`, item: ontEquipment?.item ?? 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', unit: 'pc', planned: 1, reserved: 0, issued: 0, consumed: 0, returned: 0, serialised: true }];
        d.installationJobs.push({
          id: ijId, workOrderId: woId, customerId, siteId, connectionId: cnId, technicianName: '', scheduledAt, status: 'Pending Assignment', materials, materialLines,
          billingBasis: 'Later of technical verification and customer acceptance',
          history: [{ at, byId: actor.id, kind: 'Status', detail: `Created from ${woId} — awaiting assignment (target ${formatDhaka(scheduledAt)}; ${branch.fieldTeamLead} leads ${branch.name})` }],
          ...loc
        });

        q.status = 'Accepted';
        q.workOrderId = woId;
        q.customerId = customerId;
        const woStage = d.crmStages.find((s) => s.role === 'workOrder');
        const fromLabel = d.crmStages.find((s) => s.id === opp.stage)?.label ?? opp.stage;
        if (woStage) {
          opp.stage = woStage.id;
          opp.history.push({ at, byId: actor.id, kind: 'Stage', detail: `${fromLabel} → ${woStage.label} (${woId})` });
        }
        opp.status = 'Open';
        opp.customerId = customerId;
        opp.contractedAt = at;
        opp.nextAction = `Track installation ${ijId}`;
        opp.nextActionDue = scheduledAt;
        lead.status = 'Converted';

        const created: EntityRef[] = [
        { type: 'customer', id: customerId },
        { type: 'site', id: siteId },
        { type: 'billingAccount', id: baId },
        { type: 'connection', id: cnId },
        { type: 'workOrder', id: woId },
        { type: 'installationJob', id: ijId }];

        audit(ctx, 'Work order released', `${q.id} v${q.version ?? 1} released as ${woId}; all ${checklist.length} checklist items met; terms locked as snapshot v1; created ${customerId} and ${ijId}`, { type: 'quotation', id: q.id }, [
        { type: 'opportunity', id: opp.id },
        { type: 'lead', id: lead.id },
        ...created]
        );
        notify(ctx, { title: 'New installation job — assign a technician', detail: `${ijId} · ${lead.company} · target ${formatDhaka(scheduledAt)}`, module: 'installations', branchId: q.branchId, requires: ['assignTickets'], entity: { type: 'installationJob', id: ijId } });
        notify(ctx, { title: 'New customer onboarding', detail: `${customerId} · ${lead.company}`, module: 'customers', branchId: q.branchId, entity: { type: 'customer', id: customerId } });
        notify(ctx, { title: `Technical handover — ${woId}`, detail: `${lead.company} · deadline ${formatDhaka(deadline)}`, module: 'installations', branchId: q.branchId, requires: ['technicalConfig'], entity: { type: 'workOrder', id: woId } });
        notify(ctx, { title: `Accounts handover — ${woId}`, detail: `${lead.company} · commissioning ${formatDhaka(deadline)}`, module: 'billing', branchId: q.branchId, requires: ['viewFinancials'], entity: { type: 'workOrder', id: woId } });
        return { db: d, ok: true, message: `${woId} released with installation ${ijId}. Technical and Accounts handovers sent.` };
      }

    case 'VERIFY_RECEIPT':{
        const r = d.receipts.find((x) => x.id === action.receiptId);
        if (!r || r.status !== 'Pending Verification') return fail(db, 'This receipt is already verified.');
        r.status = 'Verified';
        r.verifiedAt = at;
        const { allocated, invoiceIds } = allocateReceipt(d, r);
        const left = receiptUnallocated(r);
        const holder = d.billingAccounts.find((b) => b.id === r.billingAccountId)?.name ?? '';
        const summary = `${r.id} (${formatBDT(r.amount)}) verified for ${holder}; ${formatBDT(allocated)} allocated${left ? `, ${formatBDT(left)} held as advance` : ''}`;
        audit(ctx, 'Receipt verified', summary, { type: 'receipt', id: r.id }, [
        { type: 'billingAccount', id: r.billingAccountId },
        ...invoiceIds.map((id) => ({ type: 'invoice' as const, id }))]
        );
        notify(ctx, { title: `Receipt ${r.id} verified`, detail: `${holder} · ${formatBDT(r.amount)}`, module: 'billing', branchId: r.branchId, requires: ['viewFinancials'], entity: { type: 'receipt', id: r.id } });
        return { db: d, ok: true, message: summary };
      }

    case 'ALLOCATE_ADVANCE':{
        const ba = d.billingAccounts.find((b) => b.id === action.billingAccountId);
        if (!ba) return fail(db, 'Billing account not found.');
        let total = 0;
        const invoiceIds = new Set<string>();
        d.receipts.
        filter((r) => r.billingAccountId === ba.id && r.status === 'Verified' && receiptUnallocated(r) > 0).
        forEach((r) => {
          const res = allocateReceipt(d, r);
          total += res.allocated;
          res.invoiceIds.forEach((id) => invoiceIds.add(id));
        });
        if (total === 0) return fail(db, 'Nothing to allocate.');
        audit(ctx, 'Advance allocated', `${formatBDT(total)} advance applied to ${Array.from(invoiceIds).join(', ')}`, { type: 'billingAccount', id: ba.id }, Array.from(invoiceIds).map((id) => ({ type: 'invoice' as const, id })));
        notify(ctx, { title: 'Advance allocated', detail: `${ba.name} · ${formatBDT(total)}`, module: 'billing', branchId: ba.branchId, requires: ['viewFinancials'], entity: { type: 'billingAccount', id: ba.id } });
        return { db: d, ok: true, message: `${formatBDT(total)} allocated for ${ba.name}.` };
      }

  }
}