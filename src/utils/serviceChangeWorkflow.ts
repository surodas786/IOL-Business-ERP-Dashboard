import { roles } from '../data/roles';
import { hasPermission } from './access';
import { dhakaDayAt, formatBDT, formatDhakaDate } from './format';
import { accountOutstanding, nextId } from './relations';
import { accountBalances, dueDateFor, existingRecurring, periodKeyOf, periodLabel, taxFor, termsOf } from './billingCalc';
import { postDraft } from './billingWorkflow';
import { StockError, flagReceivable, returnReceivables } from './stockOps';
import { warehouseForBranch } from './inventoryRules';
import {
  ACCOUNTS_CHECKS,
  TECH_CHECKS,
  assessmentGaps,
  changePayback,
  clearanceDone,
  closureGaps,
  currentService,
  needsApproval } from
'./serviceChangeRules';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { Approval, DemoDatabase, EntityRef, ServiceChange } from '../types/records';
import type { CostBearer, Feasibility, ServiceChangeType, ShiftDestination } from '../types/serviceChange';
import type { InvoiceLine } from '../types/billing';
import type { Actor, WorkflowResult } from './workflow';

export interface ChangeRequestInput {
  customerId: string;
  connectionId: string;
  type: ServiceChangeType;
  reason: string;
  requestedDate: string;
  toBandwidth?: number;
  toMrc?: number;
  costBearer?: CostBearer;
  equipmentCost?: number;
  upgradeCharge?: number;
  recurringCostDelta?: number;
  destination?: ShiftDestination;
  relocationCharge?: number;
  equipmentMovement?: string;
  interruptionHours?: number;
  expectedResumption?: string;
  continuingCharge?: number;
  commercialSummary?: string;
  stopChangeId?: string;
}

export interface CommercialInput {
  summary: string;
  toMrc?: number;
  costBearer?: CostBearer;
  equipmentCost?: number;
  upgradeCharge?: number;
  recurringCostDelta?: number;
  relocationCharge?: number;
  continuingCharge?: number;
}

export type ServiceChangeAction =
({type: 'SC_REQUEST';} & ChangeRequestInput) |
{type: 'SC_TECH_ASSESS';id: string;impact: string;capacityValidated?: boolean;capacityNote?: string;feasibility?: Feasibility;} |
({type: 'SC_COMMERCIAL';id: string;} & CommercialInput) |
{type: 'SC_DECIDE';id: string;decision: 'Approved' | 'Rejected';effectiveDate?: string;note: string;} |
{type: 'SC_IMPLEMENT';id: string;doneAt: string;notes: string;files: string[];} |
{type: 'SC_CLEAR';id: string;side: 'technical' | 'accounts';checks: Record<string, boolean>;notes: string;recoveryCharge?: number;} |
{type: 'SC_REQUEST_EXCEPTION';id: string;side: 'technical' | 'accounts';reason: string;} |
{type: 'SC_CLOSE';id: string;} |
{type: 'SC_CANCEL';id: string;reason: string;} |
{type: 'SC_INVOICE_RELOCATION';id: string;};

export function isServiceChangeAction(a: {type: string;}): a is ServiceChangeAction {
  return a.type.startsWith('SC_');
}

const MIN_TEXT = 10;
const roleOf = (d: DemoDatabase, id: string) => roles.find((r) => r.id === d.users.find((u) => u.id === id)?.role);
const can = (d: DemoDatabase, id: string, p: Permission) => {
  const r = roleOf(d, id);
  return !!r && hasPermission(r, p);
};
const inModule = (d: DemoDatabase, id: string) => !!roleOf(d, id)?.modules.includes('serviceChanges');

function pushAudit(d: DemoDatabase, actor: Actor, at: string, action: string, summary: string, entity: EntityRef, related: EntityRef[] = []) {
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action, summary, entity, related });
}
function pushNotice(d: DemoDatabase, actor: Actor, at: string, n: {title: string;detail: string;module?: ModuleId;branchId: BranchId | null;entity: EntityRef;requires?: Permission[];forUserIds?: string[];}) {
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], module: 'serviceChanges', ...n });
}

const relatedOf = (s: ServiceChange): EntityRef[] => [
{ type: 'customer', id: s.customerId },
{ type: 'connection', id: s.connectionId }];


/** Creates the approval once technical and commercial assessments are complete. */
function routeForApproval(d: DemoDatabase, s: ServiceChange, actor: Actor, at: string): string {
  if (s.status !== 'Requested' || !needsApproval(s.type)) return '';
  const gaps = assessmentGaps(s);
  if (gaps.length) return ` Still needed before approval: ${gaps.join('; ')}.`;
  const apId = nextId(d.approvals, 'AP-2026-', 4);
  const pb = changePayback(s);
  const customer = d.customers.find((c) => c.id === s.customerId);
  const amount = s.toMrc !== undefined && s.fromMrc !== undefined ? Math.abs(s.toMrc - s.fromMrc) : s.relocationCharge ?? s.continuingCharge ?? 0;
  const ap: Approval = {
    id: apId, type: 'Service Change', title: `${s.type} ${s.id} — ${customer?.name ?? s.customerId}`,
    detail: `${s.fromValue} → ${s.toValue} · requested ${formatDhakaDate(s.requestedDate)}${pb.applies ? ` · proposed payback ${pb.label}` : ''}`,
    amount, entity: { type: 'serviceChange', id: s.id }, related: relatedOf(s), requestedById: s.requestedById, requestedAt: at,
    requiredPermission: 'approveQuotation', status: 'Pending', serviceChangeId: s.id, branchId: s.branchId, zoneId: s.zoneId
  };
  d.approvals.unshift(ap);
  s.approvalId = apId;
  s.status = 'Pending Approval';
  pushAudit(d, actor, at, 'Sent for approval', `${s.id} assessments complete — routed to Business Head / Management (${apId})`, { type: 'serviceChange', id: s.id }, [{ type: 'approval', id: apId }]);
  pushNotice(d, actor, at, { title: `Service change awaiting approval`, detail: `${customer?.name ?? ''} · ${s.type} · ${s.fromValue} → ${s.toValue}`, branchId: s.branchId, requires: ['approveQuotation'], entity: { type: 'approval', id: apId } });
  return ' Assessments complete — sent for approval.';
}

/** Applies an approval decision to the change. Shared by SC_DECIDE and the generic approvals queue. */
function applyDecision(d: DemoDatabase, s: ServiceChange, approved: boolean, actor: Actor, at: string, effectiveDate?: string, note?: string): string | undefined {
  if (s.status !== 'Pending Approval') return 'This change is not awaiting approval.';
  s.decidedById = actor.id;
  s.decidedAt = at;
  s.decisionNote = note?.trim() || undefined;
  if (!approved) {
    s.status = 'Rejected';
    pushAudit(d, actor, at, 'Service change rejected', `${s.id} rejected${note ? ` — ${note.trim()}` : ''}. Service and billing unchanged.`, { type: 'serviceChange', id: s.id }, relatedOf(s));
    pushNotice(d, actor, at, { title: `Service change ${s.id} rejected`, detail: note?.trim() || s.type, branchId: s.branchId, entity: { type: 'serviceChange', id: s.id }, forUserIds: [s.requestedById] });
    return undefined;
  }
  s.effectiveDate = effectiveDate || s.requestedDate;
  s.status = 'Approved';
  const conn = d.connections.find((c) => c.id === s.connectionId);
  if (s.type === 'Temporary Stop' && s.expectedResumption) s.reminderAt = dhakaDayAt(s.expectedResumption, -2, '10:00');
  if (s.type === 'Discontinuation') {
    if (conn) conn.status = 'Disconnection Pending';
    s.clearances = { technical: { status: 'Pending', checks: {} }, accounts: { status: 'Pending', checks: {} } };
    const due = conn ? flagReceivable(d, conn.id, s.id, actor, at) : [];
    if (due.length)
    pushNotice(d, actor, at, { title: `Equipment receivable — ${s.id}`, detail: `${due.length} IOL item(s) due back: ${due.map((u) => u.serial).join(', ')}`, branchId: s.branchId, requires: ['manageStock'], entity: { type: 'serviceChange', id: s.id } });
    pushNotice(d, actor, at, { title: `Technical clearance needed — ${s.id}`, detail: `Retrieve equipment and release resources · service stop ${formatDhakaDate(s.effectiveDate)}`, branchId: s.branchId, requires: ['technicalConfig'], entity: { type: 'serviceChange', id: s.id } });
    pushNotice(d, actor, at, { title: `Accounts clearance needed — ${s.id}`, detail: `Final invoice, dues, advance and deposit · service stop ${formatDhakaDate(s.effectiveDate)}`, branchId: s.branchId, requires: ['recordCollection'], entity: { type: 'serviceChange', id: s.id } });
  } else {
    pushNotice(d, actor, at, { title: `Implement ${s.type.toLowerCase()} ${s.id}`, detail: `${s.fromValue} → ${s.toValue} · effective ${formatDhakaDate(s.effectiveDate)}`, branchId: s.branchId, requires: ['technicalConfig'], entity: { type: 'serviceChange', id: s.id } });
  }
  pushAudit(
    d, actor, at, 'Service change approved',
    `${s.id} approved — effective ${formatDhakaDate(s.effectiveDate)}${s.effectiveDate.slice(0, 10) !== s.requestedDate.slice(0, 10) ? ` (requested ${formatDhakaDate(s.requestedDate)})` : ''}${s.type === 'Discontinuation' ? '. Technical and Accounts clearance tasks opened in parallel' : ''}`,
    { type: 'serviceChange', id: s.id }, relatedOf(s)
  );
  pushNotice(d, actor, at, { title: `Service change ${s.id} approved`, detail: `Effective ${formatDhakaDate(s.effectiveDate)}`, branchId: s.branchId, entity: { type: 'serviceChange', id: s.id }, forUserIds: [s.requestedById] });
  return undefined;
}

/** Called from DECIDE_APPROVAL for service change and clearance exception approvals. */
export function afterServiceChangeApproval(d: DemoDatabase, ap: Approval, approved: boolean, actor: Actor, at: string): string | undefined {
  const s = d.serviceChanges.find((x) => x.id === ap.serviceChangeId);
  if (!s) return undefined;
  if (ap.type === 'Clearance Exception' && ap.clearanceSide && s.clearances) {
    const c = s.clearances[ap.clearanceSide];
    c.status = approved ? 'Exception Approved' : 'Exception Rejected';
    c.byId = actor.id;
    c.at = at;
    pushAudit(d, actor, at, `Clearance exception ${approved ? 'approved' : 'rejected'}`, `${s.id} ${ap.clearanceSide} — ${c.exceptionReason ?? ''}`, { type: 'serviceChange', id: s.id }, [{ type: 'approval', id: ap.id }]);
    return undefined;
  }
  return applyDecision(d, s, approved, actor, at);
}

export function applyServiceChangeAction(db: DemoDatabase, action: ServiceChangeAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const role = roleOf(d, actor.id);
  if (!role || !inModule(d, actor.id)) return fail('Your role has no access to Service Changes.');

  if (action.type === 'SC_REQUEST') {
    if (!(hasPermission(role, 'createQuotation') || hasPermission(role, 'manageWorkOrders') || hasPermission(role, 'assignTickets'))) return fail('Your role cannot raise service change requests.');
    const customer = d.customers.find((c) => c.id === action.customerId);
    if (!customer) return fail('Choose an existing customer. Service changes never create a new customer profile.');
    const conn = d.connections.find((c) => c.id === action.connectionId);
    if (!conn || conn.customerId !== customer.id) return fail('Choose a service that belongs to this customer.');
    if (action.reason.trim().length < MIN_TEXT) return fail(`Give a reason of at least ${MIN_TEXT} characters.`);
    if (!action.requestedDate) return fail('Enter the requested date.');
    const open = d.serviceChanges.find((s) => s.connectionId === conn.id && ['Requested', 'Pending Approval', 'Approved'].includes(s.status) && (s.type === action.type || s.type === 'Discontinuation'));
    if (open) return fail(`${open.id} (${open.type}, ${open.status}) is already open on ${conn.id}. Finish or cancel it first.`);
    const t = action.type;
    if (t === 'Resumption') {
      if (conn.status !== 'Temporarily Stopped') return fail('Only a temporarily stopped service can be resumed.');
    } else if (t === 'Discontinuation') {
      if (conn.status !== 'Active' && conn.status !== 'Temporarily Stopped') return fail(`${conn.id} is ${conn.status} and cannot be discontinued.`);
    } else if (conn.status !== 'Active') return fail(`${conn.id} is ${conn.status}. ${t} needs an active service.`);

    const fin = hasPermission(role, 'viewFinancials');
    const id = nextId(d.serviceChanges, 'SC-2026-', 4);
    const site = d.sites.find((x) => x.id === conn.siteId);
    const s: ServiceChange = {
      id, customerId: customer.id, connectionId: conn.id, type: t, fromValue: currentService(d, conn), toValue: '', reason: action.reason.trim(),
      requestedAt: at, requestedById: actor.id, requestedDate: action.requestedDate, status: 'Requested', branchId: conn.branchId, zoneId: conn.zoneId, fromMrc: conn.mrc
    };
    if (t === 'Upgrade' || t === 'Downgrade') {
      if (!action.toBandwidth || action.toBandwidth <= 0) return fail('Enter the revised bandwidth.');
      if (t === 'Upgrade' && action.toBandwidth <= conn.bandwidthMbps) return fail(`An upgrade must exceed the current ${conn.bandwidthMbps} Mbps.`);
      if (t === 'Downgrade' && action.toBandwidth >= conn.bandwidthMbps) return fail(`A downgrade must be below the current ${conn.bandwidthMbps} Mbps.`);
      s.fromBandwidth = conn.bandwidthMbps;
      s.toBandwidth = action.toBandwidth;
      s.toValue = `${action.toBandwidth} Mbps`;
      s.fromValue = `${conn.bandwidthMbps} Mbps ${conn.product ?? conn.serviceType}`;
    }
    if (t === 'Shifting') {
      const dest = action.destination;
      if (!dest || !dest.siteId && (!dest.name.trim() || !dest.address.trim())) return fail('Choose a destination site or enter the new site name and address.');
      if (dest.siteId === conn.siteId) return fail('The destination must differ from the current site.');
      const existing = dest.siteId ? d.sites.find((x) => x.id === dest.siteId && x.customerId === customer.id) : undefined;
      if (dest.siteId && !existing) return fail('The destination site must belong to the same customer.');
      s.destination = existing ? { siteId: existing.id, name: existing.name, address: existing.address, contactName: existing.contactName, contactPhone: existing.contactPhone } : { ...dest, name: dest.name.trim(), address: dest.address.trim() };
      s.fromSiteId = conn.siteId;
      s.fromValue = site ? `${site.name}, ${site.address}` : conn.siteId;
      s.toValue = `${s.destination.name}, ${s.destination.address}`;
      s.equipmentMovement = action.equipmentMovement?.trim() || undefined;
      s.interruptionHours = action.interruptionHours;
    }
    if (t === 'Temporary Stop') {
      if (!action.expectedResumption) return fail('Enter the expected resumption date.');
      if (action.expectedResumption <= action.requestedDate) return fail('Expected resumption must be after the stop date.');
      s.expectedResumption = action.expectedResumption;
      s.toValue = `Stopped ${formatDhakaDate(action.requestedDate)} – expected ${formatDhakaDate(action.expectedResumption)}`;
    }
    if (t === 'Resumption') {
      const stop = d.serviceChanges.find((x) => x.id === action.stopChangeId && x.connectionId === conn.id && x.status === 'Stopped');
      if (!stop) return fail('Link the resumption to the active temporary stop.');
      s.stopChangeId = stop.id;
      stop.resumptionId = id;
      s.fromValue = 'Temporarily stopped';
      s.toValue = 'Service restored (pending verification)';
    }
    if (t === 'Discontinuation') s.toValue = 'Service ended';
    if (fin) {
      if (t === 'Upgrade' || t === 'Downgrade') s.toMrc = action.toMrc;
      if (t === 'Upgrade' || t === 'Downgrade' || t === 'Shifting') {
        s.costBearer = action.costBearer;
        s.equipmentCost = action.costBearer === 'IOL' ? action.equipmentCost : undefined;
        s.upgradeCharge = action.upgradeCharge;
        s.recurringCostDelta = action.recurringCostDelta;
      }
      if (t === 'Shifting') s.relocationCharge = action.relocationCharge;
      if (t === 'Temporary Stop') s.continuingCharge = action.continuingCharge ?? 0;
      if (action.commercialSummary?.trim()) s.commercialImpact = { byId: actor.id, at, summary: action.commercialSummary.trim() };
    } else if (t === 'Upgrade' || t === 'Downgrade' || t === 'Shifting') {
      s.costBearer = action.costBearer;
    }
    d.serviceChanges.unshift(s);
    pushAudit(d, actor, at, 'Service change requested', `${id}: ${t} for ${customer.name} (${conn.id}) — ${s.fromValue} → ${s.toValue}. Linked to existing customer ${customer.id}; no new profile created.`, { type: 'serviceChange', id }, relatedOf(s));
    pushNotice(d, actor, at, { title: t === 'Resumption' ? `Verify resumption — ${customer.name}` : `Assess ${t.toLowerCase()} — ${customer.name}`, detail: `${id} · ${conn.id}`, branchId: s.branchId, requires: ['technicalConfig'], entity: { type: 'serviceChange', id } });
    return ok(`${id} raised for ${customer.name}. ${t === 'Resumption' ? 'Technical must verify the service before it is reactivated.' : 'Technical assessment is next.'}`);
  }

  const s = d.serviceChanges.find((x) => x.id === action.id);
  if (!s) return fail('Service change not found.');
  const conn = d.connections.find((c) => c.id === s.connectionId)!;
  const customer = d.customers.find((c) => c.id === s.customerId)!;
  const ref: EntityRef = { type: 'serviceChange', id: s.id };

  switch (action.type) {
    case 'SC_TECH_ASSESS':{
        if (!hasPermission(role, 'technicalConfig')) return fail('Only Technical can assess technical impact.');
        if (s.status !== 'Requested') return fail('Technical assessment is only possible before approval.');
        if (s.type === 'Resumption') return fail('Resumptions are verified at implementation, not assessed.');
        if (action.impact.trim().length < MIN_TEXT) return fail(`Describe the technical impact in at least ${MIN_TEXT} characters.`);
        if ((s.type === 'Upgrade' || s.type === 'Downgrade') && action.capacityValidated === undefined) return fail('State whether capacity is validated.');
        if (s.type === 'Shifting' && !action.feasibility) return fail('Record the mini-feasibility outcome.');
        s.technicalImpact = { byId: actor.id, at, impact: action.impact.trim(), capacityValidated: action.capacityValidated, capacityNote: action.capacityNote?.trim() || undefined, feasibility: action.feasibility };
        pushAudit(d, actor, at, 'Technical impact assessed', `${s.id}: ${action.impact.trim()}${action.feasibility ? ` · mini-feasibility ${action.feasibility}` : ''}${action.capacityValidated !== undefined ? ` · capacity ${action.capacityValidated ? 'validated' : 'NOT available'}` : ''}`, ref, relatedOf(s));
        return ok(`Technical assessment recorded.${routeForApproval(d, s, actor, at)}`);
      }

    case 'SC_COMMERCIAL':{
        if (!hasPermission(role, 'viewFinancials')) return fail('Only roles with financial access can set commercial terms.');
        if (s.status !== 'Requested') return fail('Commercial terms are locked once the change is sent for approval.');
        if (action.summary.trim().length < MIN_TEXT) return fail(`Summarise the commercial impact in at least ${MIN_TEXT} characters.`);
        if ((s.type === 'Upgrade' || s.type === 'Downgrade') && !(action.toMrc && action.toMrc > 0)) return fail('Enter the revised MRC.');
        if ((s.type === 'Upgrade' || s.type === 'Downgrade' || s.type === 'Shifting') && !action.costBearer) return fail('Choose who bears equipment cost.');
        if (action.costBearer === 'IOL' && !(action.equipmentCost && action.equipmentCost > 0)) return fail('Enter the equipment cost IOL will fund.');
        Object.assign(s, {
          toMrc: s.type === 'Upgrade' || s.type === 'Downgrade' ? action.toMrc : s.toMrc,
          costBearer: action.costBearer ?? s.costBearer,
          equipmentCost: action.costBearer === 'IOL' ? action.equipmentCost : undefined,
          upgradeCharge: action.upgradeCharge,
          recurringCostDelta: action.recurringCostDelta,
          relocationCharge: s.type === 'Shifting' ? action.relocationCharge : s.relocationCharge,
          continuingCharge: s.type === 'Temporary Stop' ? action.continuingCharge ?? 0 : s.continuingCharge
        });
        s.commercialImpact = { byId: actor.id, at, summary: action.summary.trim() };
        const pb = changePayback(s);
        pushAudit(d, actor, at, 'Commercial impact recorded', `${s.id}: ${action.summary.trim()}${pb.applies ? ` · proposed payback ${pb.label}` : ''}`, ref, relatedOf(s));
        return ok(`Commercial impact recorded.${pb.applies ? ` Proposed payback: ${pb.label}.` : ''}${routeForApproval(d, s, actor, at)}`);
      }

    case 'SC_DECIDE':{
        if (!hasPermission(role, 'approveQuotation')) return fail('Only Business Head or Management can decide service changes.');
        const ap = d.approvals.find((a) => a.id === s.approvalId);
        if (!ap || ap.status !== 'Pending') return fail('This change is not awaiting approval.');
        if (ap.requestedById === actor.id) return fail('You can’t decide a change you requested.');
        if (action.decision === 'Rejected' && action.note.trim().length < MIN_TEXT) return fail(`Give a rejection reason of at least ${MIN_TEXT} characters.`);
        if (action.decision === 'Approved' && !action.effectiveDate) return fail('Set the approved effective date.');
        const err = applyDecision(d, s, action.decision === 'Approved', actor, at, action.effectiveDate, action.note);
        if (err) return fail(err);
        ap.status = action.decision;
        ap.decidedById = actor.id;
        ap.decidedAt = at;
        return ok(action.decision === 'Approved' ? `${s.id} approved, effective ${formatDhakaDate(s.effectiveDate!)}.` : `${s.id} rejected.`);
      }

    case 'SC_IMPLEMENT':{
        if (!hasPermission(role, 'technicalConfig')) return fail('Only Technical can record implementation.');
        const allowed = s.type === 'Resumption' ? s.status === 'Requested' : s.status === 'Approved';
        if (!allowed) return fail(s.type === 'Resumption' ? 'This resumption is already verified.' : 'Only approved changes can be implemented.');
        if (action.notes.trim().length < MIN_TEXT) return fail(`Describe what was done in at least ${MIN_TEXT} characters.`);
        if (!action.files.length) return fail('Attach at least one photo, test result or signed form as evidence.');
        if (!action.doneAt || action.doneAt > at) return fail('Enter when the work was done (not in the future).');
        s.evidence = { byId: actor.id, at, doneAt: action.doneAt, notes: action.notes.trim(), files: action.files };
        let msg = '';
        if (s.type === 'Upgrade' || s.type === 'Downgrade') {
          conn.bandwidthMbps = s.toBandwidth ?? conn.bandwidthMbps;
          s.status = 'Implemented';
          msg = `${conn.id} now ${conn.bandwidthMbps} Mbps. Billing changes from the approved effective date ${formatDhakaDate(s.effectiveDate!)}, not the work date.`;
        } else if (s.type === 'Shifting') {
          let siteId = s.destination?.siteId;
          if (!siteId && s.destination) {
            siteId = nextId(d.sites, 'ST-', 4);
            d.sites.push({ id: siteId, customerId: customer.id, name: s.destination.name, address: s.destination.address, contactName: s.destination.contactName, contactPhone: s.destination.contactPhone, branchId: conn.branchId, zoneId: conn.zoneId });
            s.destination.siteId = siteId;
          }
          conn.siteId = siteId ?? conn.siteId;
          s.status = 'Implemented';
          msg = `${conn.id} moved to ${s.destination?.name}. Site added to ${customer.name}'s existing profile; the old site stays in history.`;
        } else if (s.type === 'Temporary Stop') {
          conn.status = 'Temporarily Stopped';
          s.status = 'Stopped';
          pushNotice(d, actor, at, { title: `Resumption reminder set — ${customer.name}`, detail: `${s.id} · expected ${formatDhakaDate(s.expectedResumption!)} · reminder ${formatDhakaDate(s.reminderAt!)}. Reactivation needs verified resumption.`, branchId: s.branchId, entity: ref });
          msg = `${conn.id} stopped. Reminder set for ${formatDhakaDate(s.reminderAt!)}. It will not reactivate on its own.`;
        } else if (s.type === 'Resumption') {
          const stop = d.serviceChanges.find((x) => x.id === s.stopChangeId);
          if (!stop || stop.status !== 'Stopped') return fail('The linked temporary stop is no longer active.');
          stop.status = 'Resumed';
          stop.resumedAt = action.doneAt;
          s.effectiveDate = action.doneAt;
          s.status = 'Implemented';
          s.toValue = 'Service restored (verified)';
          conn.status = 'Active';
          msg = `Resumption verified. ${conn.id} active again; full rate from ${formatDhakaDate(action.doneAt)}.`;
        } else if (s.type === 'Discontinuation') {
          conn.status = 'Disconnected';
          s.serviceStoppedAt = action.doneAt;
          s.status = 'Service Stopped';
          msg = `Service stop recorded. Billing ends on the approved date ${formatDhakaDate(s.effectiveDate!)} regardless of clearance progress. Administrative closure still needs both clearances.`;
        }
        pushAudit(d, actor, at, s.type === 'Resumption' ? 'Resumption verified' : 'Implementation recorded', `${s.id}: ${action.notes.trim()} · evidence: ${action.files.join(', ')}`, ref, relatedOf(s));
        if (s.type !== 'Discontinuation' && s.type !== 'Temporary Stop') {
          pushNotice(d, actor, at, { title: `${s.type} ${s.id} implemented`, detail: `${customer.name} · ${s.toValue}`, branchId: s.branchId, requires: ['viewFinancials'], entity: ref });
        }
        return ok(msg);
      }

    case 'SC_CLEAR':{
        if (s.type !== 'Discontinuation' || !s.clearances) return fail('Clearance applies to approved discontinuations only.');
        if (s.status === 'Closed') return fail('Already closed.');
        const tech = action.side === 'technical';
        if (tech ? !hasPermission(role, 'technicalConfig') : !hasPermission(role, 'recordCollection')) return fail(`Only ${tech ? 'Technical' : 'Accounts'} can give this clearance.`);
        const c = s.clearances[action.side];
        if (clearanceDone(c)) return fail('This clearance is already complete.');
        if (c.status === 'Exception Requested') return fail('An exception is awaiting decision.');
        const list = tech ? TECH_CHECKS : ACCOUNTS_CHECKS;
        const missing = list.filter((x) => !action.checks[x.key]);
        if (missing.length) return fail(`Confirm every check or request an exception. Missing: ${missing.map((m) => m.label).join('; ')}.`);
        if (!tech) {
          const pk = periodKeyOf(s.effectiveDate!);
          if (!existingRecurring(d, conn.id, pk)) return fail(`No invoice for ${periodLabel(pk)} covers ${conn.id} yet. Post the final invoice first.`);
          const due = accountOutstanding(d, conn.billingAccountId);
          if (due > 0) return fail(`${formatBDT(due)} still outstanding on ${conn.billingAccountId}. Settle it or request an exception.`);
          const b = accountBalances(d, conn.billingAccountId);
          const sharedAccount = d.connections.some((x) => x.billingAccountId === conn.billingAccountId && x.id !== conn.id && x.status !== 'Disconnected');
          if (!sharedAccount && (b.advance > 0 || b.deposit > 0)) return fail(`Advance ${formatBDT(b.advance)} and deposit ${formatBDT(b.deposit)} are still held. Refund or adjust them through Billing, or request an exception.`);
        }
        Object.assign(c, { status: 'Cleared', checks: action.checks, notes: action.notes.trim() || undefined, byId: actor.id, at, recoveryCharge: tech ? action.recoveryCharge : undefined });
        const extra: EntityRef[] = [];
        let returnNote = '';
        if (tech) {
          // Retrieved receivable equipment goes to the warehouse inspection queue; stock is restored only after inspection.
          try {
            const rets = returnReceivables(d, conn.id, s.id, warehouseForBranch(s.branchId), `${customer.name} (retrieved by ${actor.name})`, actor, at);
            if (rets.length) returnNote = ` · ${rets.reduce((n, r) => n + r.quantity, 0)} item(s) logged for inspection (${rets.map((r) => r.id).join(', ')})`;
          } catch (e) {
            if (e instanceof StockError) return fail(e.message);
            throw e;
          }
        }
        pushAudit(d, actor, at, `${tech ? 'Technical' : 'Accounts'} clearance given`, `${s.id}: ${list.length} checks confirmed${action.notes.trim() ? ` — ${action.notes.trim()}` : ''}${returnNote}`, ref, [...relatedOf(s), ...extra]);
        const other = s.clearances[tech ? 'accounts' : 'technical'];
        return ok(`${tech ? 'Technical' : 'Accounts'} clearance recorded.${clearanceDone(other) ? ' Both clearances complete.' : ` ${tech ? 'Accounts' : 'Technical'} clearance still ${other.status.toLowerCase()}.`}`);
      }

    case 'SC_REQUEST_EXCEPTION':{
        if (s.type !== 'Discontinuation' || !s.clearances) return fail('Exceptions apply to discontinuation clearances only.');
        const tech = action.side === 'technical';
        if (tech ? !hasPermission(role, 'technicalConfig') : !hasPermission(role, 'recordCollection')) return fail(`Only ${tech ? 'Technical' : 'Accounts'} can request this exception.`);
        const c = s.clearances[action.side];
        if (clearanceDone(c) || c.status === 'Exception Requested') return fail('No exception can be requested now.');
        if (action.reason.trim().length < 20) return fail('Give a reason of at least 20 characters.');
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        d.approvals.unshift({
          id: apId, type: 'Clearance Exception', title: `${tech ? 'Technical' : 'Accounts'} clearance exception — ${s.id} · ${customer.name}`, detail: action.reason.trim(), amount: 0,
          entity: ref, related: relatedOf(s), requestedById: actor.id, requestedAt: at, requiredPermission: tech ? 'approveQuotation' : 'approveFinancial', status: 'Pending',
          serviceChangeId: s.id, clearanceSide: action.side, branchId: s.branchId, zoneId: s.zoneId
        });
        Object.assign(c, { status: 'Exception Requested', exceptionReason: action.reason.trim(), exceptionApprovalId: apId });
        pushAudit(d, actor, at, 'Clearance exception requested', `${s.id} ${action.side}: ${action.reason.trim()}`, ref, [{ type: 'approval', id: apId }]);
        pushNotice(d, actor, at, { title: 'Clearance exception awaiting approval', detail: `${customer.name} · ${s.id}`, branchId: s.branchId, requires: [tech ? 'approveQuotation' : 'approveFinancial'], entity: { type: 'approval', id: apId } });
        return ok(`Exception sent to ${tech ? 'Business Head / Management' : 'the Finance Approver'}.`);
      }

    case 'SC_CLOSE':{
        if (!(hasPermission(role, 'manageWorkOrders') || hasPermission(role, 'approveQuotation'))) return fail('Only Back Office or Management can close administratively.');
        if (s.type !== 'Discontinuation') return fail('Only discontinuations need administrative closure.');
        const gaps = closureGaps(s);
        if (gaps.length) return fail(`Closure blocked: ${gaps.join('; ')}.`);
        s.status = 'Closed';
        s.closedAt = at;
        s.closedById = actor.id;
        const wo = d.workOrders.find((w) => w.id === s.workOrderId);
        if (wo) wo.status = 'Completed';
        const anyLive = d.connections.some((c) => c.customerId === customer.id && c.status !== 'Disconnected');
        if (!anyLive) customer.status = 'Disconnected';
        pushAudit(d, actor, at, 'Administratively closed', `${s.id} closed. Service stopped ${formatDhakaDate(s.serviceStoppedAt!)} · billing ended ${formatDhakaDate(s.effectiveDate!)} · closed ${formatDhakaDate(at)}. Invoices and service history preserved.`, ref, relatedOf(s));
        return ok(`${s.id} closed. Closure date is recorded separately from the service stop date.`);
      }

    case 'SC_CANCEL':{
        if (!['Requested', 'Pending Approval'].includes(s.status)) return fail('Only changes not yet approved can be cancelled.');
        if (s.requestedById !== actor.id && !hasPermission(role, 'manageWorkOrders') && !hasPermission(role, 'approveQuotation')) return fail('Only the requester, Back Office or Management can cancel.');
        if (action.reason.trim().length < MIN_TEXT) return fail(`Give a reason of at least ${MIN_TEXT} characters.`);
        const ap = d.approvals.find((a) => a.id === s.approvalId && a.status === 'Pending');
        if (ap) ap.status = 'Withdrawn';
        if (s.stopChangeId) {
          const stop = d.serviceChanges.find((x) => x.id === s.stopChangeId);
          if (stop) stop.resumptionId = undefined;
        }
        s.status = 'Cancelled';
        s.cancelReason = action.reason.trim();
        pushAudit(d, actor, at, 'Service change cancelled', `${s.id} cancelled — ${s.cancelReason}`, ref, relatedOf(s));
        return ok(`${s.id} cancelled. Service and billing unchanged.`);
      }

    case 'SC_INVOICE_RELOCATION':{
        if (!hasPermission(role, 'recordCollection')) return fail('Only Accounts can invoice the relocation charge.');
        if (s.type !== 'Shifting' || s.status !== 'Implemented') return fail('Relocation is invoiced after the shift is implemented.');
        if (!s.relocationCharge) return fail('No relocation charge was approved.');
        if (s.relocationInvoiceId) return fail(`Already invoiced on ${s.relocationInvoiceId}.`);
        const ba = d.billingAccounts.find((b) => b.id === conn.billingAccountId);
        if (!ba) return fail('Billing account not found.');
        const pk = periodKeyOf(at);
        const lines: InvoiceLine[] = [{ id: 'x', kind: 'OTC', connectionId: conn.id, description: `Relocation charge — ${s.id} (${s.destination?.name ?? ''})`, amount: s.relocationCharge, calc: `One-time, approved on ${s.id}` }];
        const tax = taxFor(d, ba, s.relocationCharge, `${s.id}`);
        if (tax.line) lines.push(tax.line);
        const inv = postDraft(d, {
          billingAccountId: ba.id, customerId: ba.customerId, associateId: ba.associateId, kind: 'Adjustment', periodKey: pk, connectionIds: [], lines, subtotal: s.relocationCharge,
          amount: s.relocationCharge + (tax.line?.amount ?? 0), dueDate: dueDateFor(ba, pk, at), billingTerm: termsOf(ba).term, taxNote: tax.note, notes: [], description: `Relocation charge ${s.id}`
        }, at, actor.id);
        inv.periodKey = undefined;
        s.relocationInvoiceId = inv.id;
        pushAudit(d, actor, at, 'Relocation charge invoiced', `${inv.id} for ${formatBDT(inv.amount)} — ${s.id}`, ref, [{ type: 'invoice', id: inv.id }]);
        return ok(`${inv.id} issued for ${formatBDT(inv.amount)}.`);
      }
  }
  return fail('Unknown action.');
}