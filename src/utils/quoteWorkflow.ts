import { roles } from '../data/roles';
import { dhakaDayAt, formatBDT, formatDhakaDate } from './format';
import { nextId } from './relations';
import { ROUTE_PERMISSION, ROUTE_TYPE, computeRoutes, currentSnapshot, currentVersion, quoteName, termsOf, validateTerms } from './quoteRules';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { Approval, DemoDatabase, EntityRef, Quotation } from '../types/records';
import type { AcceptanceMethod, ChangeRequest, Department, QuotationTerms, WorkOrderSnapshot } from '../types/quotation';
import type { Actor, WorkflowResult } from './workflow';

export type QuoteAction =
{type: 'QUOTE_CREATE';opportunityId: string;terms: QuotationTerms;submit: boolean;} |
{type: 'QUOTE_SAVE';quotationId: string;terms: QuotationTerms;} |
{type: 'QUOTE_SUBMIT';quotationId: string;} |
{type: 'QUOTE_REVISE';quotationId: string;terms: QuotationTerms;reason: string;} |
{type: 'QUOTE_CANCEL';quotationId: string;reason: string;} |
{type: 'QUOTE_RECORD_ACCEPTANCE';quotationId: string;method: AcceptanceMethod;reference: string;acceptedByName: string;acceptedAt: string;fileName?: string;} |
{type: 'QUOTE_VALIDATE_SITE';quotationId: string;note: string;} |
{type: 'QUOTE_VERIFY_ADVANCE';quotationId: string;reference: string;} |
{type: 'QUOTE_REQUEST_ADVANCE_EXCEPTION';quotationId: string;reason: string;} |
{type: 'QUOTE_SET_TAX';taxId: string;ratePct: number | null;} |
{type: 'QUOTE_SET_POLICY';standardCreditDays: number;minAdvanceMonths: number;} |
{type: 'WO_REQUEST_CHANGE';workOrderId: string;kind: ChangeRequest['kind'];reason: string;proposed?: ChangeRequest['proposed'];} |
{type: 'WO_ACK_HANDOVER';workOrderId: string;department: Department;};

export function isQuoteAction(a: {type: string;}): a is QuoteAction {
  return a.type.startsWith('QUOTE_') || a.type.startsWith('WO_');
}

export const MIN_REASON = 10;

interface Ctx {
  d: DemoDatabase;
  actor: Actor;
  at: string;
}

function audit(ctx: Ctx, action: string, summary: string, entity: EntityRef, related: EntityRef[] = []) {
  ctx.d.auditEvents.unshift({ id: nextId(ctx.d.auditEvents, 'AE-', 5), at: ctx.at, actorName: ctx.actor.name, actorId: ctx.actor.id, action, summary, entity, related });
}

function notify(ctx: Ctx, n: {title: string;detail: string;module: ModuleId;branchId: BranchId | null;entity: EntityRef;requires?: Permission[];}) {
  ctx.d.notifications.unshift({ id: nextId(ctx.d.notifications, 'NT-', 4), at: ctx.at, readBy: [ctx.actor.id], ...n });
}

function syncHeader(q: Quotation, t: QuotationTerms) {
  q.description = t.description;
  q.mrc = t.mrc;
  q.otc = t.otc;
  q.marginPct = t.marginPct;
  q.validUntil = t.validUntil;
}

function withdrawPending(ctx: Ctx, q: Quotation) {
  ctx.d.approvals.forEach((a) => {
    if (a.entity.type === 'quotation' && a.entity.id === q.id && a.status === 'Pending') {
      a.status = 'Withdrawn';
      a.decidedAt = ctx.at;
      a.decidedById = ctx.actor.id;
    }
  });
}

/** Creates one approval per required route for the current version. */
function routeVersion(ctx: Ctx, q: Quotation) {
  const v = currentVersion(q)!;
  const routes = computeRoutes(ctx.d, v.terms);
  v.routes = routes;
  v.status = 'Pending Approval';
  v.submittedAt = ctx.at;
  q.status = 'Pending Approval';
  const name = quoteName(ctx.d, q);
  routes.forEach((r) => {
    const id = nextId(ctx.d.approvals, 'AP-2026-', 4);
    const type = ROUTE_TYPE[r.kind];
    ctx.d.approvals.unshift({
      id, type, title: `${r.kind === 'Quotation' ? 'Quotation' : r.kind} — ${q.id} v${v.version} · ${name}`, detail: r.why, amount: r.amount,
      entity: { type: 'quotation', id: q.id }, related: [{ type: 'opportunity', id: q.opportunityId }], requestedById: ctx.actor.id, requestedAt: ctx.at,
      requiredPermission: ROUTE_PERMISSION[r.kind], status: 'Pending', quotationVersion: v.version, branchId: q.branchId, zoneId: q.zoneId
    });
    notify(ctx, { title: `${r.kind} approval requested`, detail: `${q.id} v${v.version} · ${name}`, module: 'quotations', branchId: q.branchId, entity: { type: 'approval', id }, requires: r.kind === 'Agent Commission Terms' ? ['viewCommissions'] : ['viewPipeline'] });
  });
  return routes;
}

export function applyQuoteAction(db: DemoDatabase, action: QuoteAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const user = db.users.find((u) => u.id === actor.id);
  const role = roles.find((r) => r.id === user?.role);
  if (!user || !role) return fail('Unknown demo user.');
  const has = (p: Permission) => role.permissions.includes(p);
  const d: DemoDatabase = structuredClone(db);
  const ctx: Ctx = { d, actor, at };
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });
  const getQ = (id: string) => d.quotations.find((q) => q.id === id);
  const now = new Date(at);

  switch (action.type) {
    case 'QUOTE_CREATE':{
        if (!has('createQuotation')) return fail('Your role can’t prepare quotations.');
        const opp = d.opportunities.find((o) => o.id === action.opportunityId);
        if (!opp || opp.status !== 'Open') return fail('Quotations can be prepared only on an open opportunity.');
        const open = d.quotations.find((q) => q.opportunityId === opp.id && !['Cancelled', 'Rejected', 'Accepted'].includes(q.status));
        if (open) return fail(`${open.id} is already open on this opportunity. Revise it instead of creating a second quotation.`);
        const errors = validateTerms(action.terms, now);
        if (errors.length) return fail(errors[0]);
        const id = nextId(d.quotations, 'QT-2026-', 4);
        const q: Quotation = {
          id, opportunityId: opp.id, customerId: opp.customerId, description: '', mrc: 0, otc: 0, marginPct: 0, status: 'Draft', preparedById: user.id, createdAt: at, validUntil: '',
          version: 1, versions: [{ version: 1, status: 'Draft', terms: action.terms, reason: 'Initial quotation', createdAt: at, createdById: user.id }],
          surveyId: d.surveys.find((s) => s.opportunityId === opp.id && s.status === 'Approved')?.id, branchId: opp.branchId, zoneId: opp.zoneId
        };
        if (action.terms.advanceRequired > 0) q.advance = { state: 'Awaiting verification' };
        syncHeader(q, action.terms);
        d.quotations.unshift(q);
        audit(ctx, 'Quotation created', `${id} v1 · ${quoteName(d, q)} · ${action.terms.serviceType} ${action.terms.bandwidthMbps} Mbps`, { type: 'quotation', id }, [{ type: 'opportunity', id: opp.id }]);
        if (action.submit) {
          const routes = routeVersion(ctx, q);
          return ok(`${id} submitted — routed to ${routes.map((r) => r.kind).join(', ')}.`);
        }
        return ok(`${id} saved as draft.`);
      }

    case 'QUOTE_SAVE':{
        const q = getQ(action.quotationId);
        const v = q && currentVersion(q);
        if (!q || !v) return fail('Quotation not found.');
        if (!has('createQuotation')) return fail('Your role can’t edit quotations.');
        if (v.status !== 'Draft') return fail(`Version ${v.version} is ${v.status.toLowerCase()} and locked. Create a revision instead.`);
        v.terms = action.terms;
        syncHeader(q, action.terms);
        if (action.terms.advanceRequired > 0 && !q.advance) q.advance = { state: 'Awaiting verification' };
        if (action.terms.advanceRequired === 0) q.advance = undefined;
        audit(ctx, 'Quotation draft saved', `${q.id} v${v.version}`, { type: 'quotation', id: q.id });
        return ok('Draft saved.');
      }

    case 'QUOTE_SUBMIT':{
        const q = getQ(action.quotationId);
        const v = q && currentVersion(q);
        if (!q || !v) return fail('Quotation not found.');
        if (!has('createQuotation')) return fail('Your role can’t submit quotations.');
        if (v.status !== 'Draft') return fail('Only a draft version can be submitted.');
        const errors = validateTerms(v.terms, now);
        if (errors.length) return fail(errors[0]);
        const routes = routeVersion(ctx, q);
        audit(ctx, 'Quotation submitted', `${q.id} v${v.version} routed to ${routes.map((r) => r.kind).join(', ')}`, { type: 'quotation', id: q.id }, [{ type: 'opportunity', id: q.opportunityId }]);
        return ok(`Submitted — routed to ${routes.map((r) => r.kind).join(', ')}.`);
      }

    case 'QUOTE_REVISE':{
        const q = getQ(action.quotationId);
        const v = q && currentVersion(q);
        if (!q || !v) return fail('Quotation not found.');
        if (!has('createQuotation')) return fail('Your role can’t revise quotations.');
        if (q.workOrderId) return fail('A work order has been released. Request a work order revision instead.');
        if (q.status === 'Cancelled') return fail('This quotation is cancelled.');
        if (v.status === 'Draft') return fail('The current version is still a draft — edit it directly.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason for the revision (${MIN_REASON}+ characters).`);
        const errors = validateTerms(action.terms, now);
        if (errors.length) return fail(errors[0]);
        withdrawPending(ctx, q);
        if (v.status === 'Pending Approval') v.status = 'Withdrawn';else
        if (v.status === 'Approved') v.status = 'Superseded';
        const next = (q.version ?? 1) + 1;
        q.versions = [...(q.versions ?? []), { version: next, status: 'Draft', terms: action.terms, reason: action.reason.trim(), createdAt: at, createdById: user.id }];
        q.version = next;
        q.status = 'Draft';
        syncHeader(q, action.terms);
        if (q.advance?.state !== 'Verified') q.advance = action.terms.advanceRequired > 0 ? { state: 'Awaiting verification' } : undefined;
        audit(ctx, 'Quotation revised', `${q.id} v${v.version} → v${next} — ${action.reason.trim()}. v${v.version} terms kept unchanged.`, { type: 'quotation', id: q.id }, [{ type: 'opportunity', id: q.opportunityId }]);
        return ok(`Version ${next} created as a draft. Version ${v.version} is kept as it was. Customer acceptance must be recorded again.`);
      }

    case 'QUOTE_CANCEL':{
        const q = getQ(action.quotationId);
        if (!q) return fail('Quotation not found.');
        if (q.workOrderId) return fail('A work order exists. Request a work order cancellation instead.');
        if (q.status === 'Cancelled') return fail('Already cancelled.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason (${MIN_REASON}+ characters).`);
        const approvedTerms = q.status === 'Approved';
        if (approvedTerms && !has('approveQuotation')) return fail('Approved quotations can be cancelled only by Management or the Business Head.');
        if (!approvedTerms && !has('createQuotation') && !has('approveQuotation')) return fail('Your role can’t cancel quotations.');
        withdrawPending(ctx, q);
        const v = currentVersion(q);
        if (v && (v.status === 'Draft' || v.status === 'Pending Approval')) v.status = 'Withdrawn';
        q.status = 'Cancelled';
        q.cancelReason = action.reason.trim();
        audit(ctx, 'Quotation cancelled', `${q.id} — ${q.cancelReason}`, { type: 'quotation', id: q.id }, [{ type: 'opportunity', id: q.opportunityId }]);
        notify(ctx, { title: `${q.id} cancelled`, detail: `${quoteName(d, q)} · ${q.cancelReason}`, module: 'quotations', branchId: q.branchId, entity: { type: 'quotation', id: q.id }, requires: ['viewPipeline'] });
        return ok(`${q.id} cancelled.`);
      }

    case 'QUOTE_RECORD_ACCEPTANCE':{
        const q = getQ(action.quotationId);
        const v = q && currentVersion(q);
        if (!q || !v) return fail('Quotation not found.');
        if (!has('createQuotation') && !has('manageWorkOrders')) return fail('Sales or Back Office record customer acceptance.');
        if (v.status !== 'Approved') return fail('Acceptance can be recorded only on an approved version.');
        if (!action.reference.trim() || !action.acceptedByName.trim()) return fail('Enter who accepted and the evidence reference.');
        const when = new Date(action.acceptedAt);
        if (Number.isNaN(when.getTime()) || when.getTime() > now.getTime() + 60_000) return fail('Acceptance date can’t be in the future.');
        if (when.getTime() > new Date(v.terms.validUntil).getTime()) return fail(`The quotation expired on ${formatDhakaDate(v.terms.validUntil)}. Revise it before accepting.`);
        q.acceptance = { version: v.version, method: action.method, reference: action.reference.trim(), fileName: action.fileName, acceptedByName: action.acceptedByName.trim(), acceptedAt: when.toISOString(), recordedById: user.id, recordedAt: at };
        audit(ctx, 'Customer acceptance recorded', `${q.id} v${v.version} · ${action.method} · ${action.reference.trim()} · by ${action.acceptedByName.trim()}`, { type: 'quotation', id: q.id }, [{ type: 'opportunity', id: q.opportunityId }]);
        notify(ctx, { title: 'Customer accepted quotation', detail: `${q.id} · ${quoteName(d, q)}`, module: 'quotations', branchId: q.branchId, entity: { type: 'quotation', id: q.id }, requires: ['manageWorkOrders'] });
        return ok('Acceptance recorded against this version.');
      }

    case 'QUOTE_VALIDATE_SITE':{
        const q = getQ(action.quotationId);
        const t = q && termsOf(q);
        if (!q || !t) return fail('Quotation not found.');
        if (!has('manageWorkOrders')) return fail('Back Office validates customer and site details.');
        const opp = d.opportunities.find((o) => o.id === q.opportunityId);
        const lead = d.leads.find((l) => l.id === opp?.leadId);
        const customer = q.customerId ? d.customers.find((c) => c.id === q.customerId) : undefined;
        const phone = customer?.contacts?.find((c) => c.role === 'Primary')?.phone ?? lead?.contactPhone;
        if (!phone) return fail('No primary contact phone on file. Add it before validating.');
        if (!t.siteAddress.trim()) return fail('The site address is missing.');
        q.validation = { byId: user.id, at, note: action.note.trim() };
        audit(ctx, 'Customer and site validated', `${q.id} · ${t.siteName}, ${t.siteAddress}`, { type: 'quotation', id: q.id });
        return ok('Customer and site validated.');
      }

    case 'QUOTE_VERIFY_ADVANCE':{
        const q = getQ(action.quotationId);
        const t = q && termsOf(q);
        if (!q || !t) return fail('Quotation not found.');
        if (!has('recordCollection')) return fail('Only Accounts verifies advances.');
        if (!(t.advanceRequired > 0)) return fail('No advance is required.');
        if (q.advance?.state === 'Verified') return fail('Already verified.');
        if (!action.reference.trim()) return fail('Enter the bank or receipt reference.');
        q.advance = { ...q.advance, state: 'Verified', reference: action.reference.trim(), verifiedById: user.id, verifiedAt: at };
        audit(ctx, 'Advance verified', `${formatBDT(t.advanceRequired)} for ${q.id} · ${action.reference.trim()}`, { type: 'quotation', id: q.id });
        notify(ctx, { title: 'Advance verified', detail: `${q.id} · ${quoteName(d, q)}`, module: 'quotations', branchId: q.branchId, entity: { type: 'quotation', id: q.id }, requires: ['manageWorkOrders'] });
        return ok('Advance verified.');
      }

    case 'QUOTE_REQUEST_ADVANCE_EXCEPTION':{
        const q = getQ(action.quotationId);
        const t = q && termsOf(q);
        if (!q || !t) return fail('Quotation not found.');
        if (!has('createQuotation') && !has('manageWorkOrders')) return fail('Your role can’t request an advance exception.');
        if (!(t.advanceRequired > 0) || q.advance?.state === 'Verified') return fail('No outstanding advance.');
        if (q.advance?.state === 'Exception requested') return fail('An exception is already awaiting approval.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason (${MIN_REASON}+ characters).`);
        const id = nextId(d.approvals, 'AP-2026-', 4);
        d.approvals.unshift({
          id, type: 'Advance Exception', title: `Advance exception — ${q.id} · ${quoteName(d, q)}`, detail: `${formatBDT(t.advanceRequired)} advance · ${action.reason.trim()}`, amount: t.advanceRequired,
          entity: { type: 'quotation', id: q.id }, related: [{ type: 'opportunity', id: q.opportunityId }], requestedById: user.id, requestedAt: at, requiredPermission: 'approveFinancial', status: 'Pending', branchId: q.branchId, zoneId: q.zoneId
        });
        q.advance = { state: 'Exception requested', exceptionReason: action.reason.trim(), approvalId: id };
        audit(ctx, 'Advance exception requested', `${q.id} · ${action.reason.trim()}`, { type: 'approval', id }, [{ type: 'quotation', id: q.id }]);
        notify(ctx, { title: 'Advance exception awaiting approval', detail: `${q.id} · ${quoteName(d, q)}`, module: 'quotations', branchId: q.branchId, entity: { type: 'approval', id }, requires: ['viewFinancials'] });
        return ok('Sent to the Finance Approver.');
      }

    case 'QUOTE_SET_TAX':{
        if (!has('approveQuotation') && !has('approveFinancial')) return fail('Only commercial or finance authorities configure tax treatments.');
        const t = d.taxTreatments.find((x) => x.id === action.taxId);
        if (!t) return fail('Tax treatment not found.');
        if (action.ratePct !== null && (action.ratePct < 0 || action.ratePct > 100)) return fail('Enter a rate between 0 and 100, or leave it unset.');
        const from = t.ratePct;
        t.ratePct = action.ratePct;
        t.updatedById = user.id;
        t.updatedAt = at;
        audit(ctx, 'Tax treatment changed', `${t.label}: ${from ?? 'not set'} → ${action.ratePct ?? 'not set'} (illustrative)`, { type: 'policy', id: t.id });
        return ok('Illustrative rate saved. Existing approved versions keep their own terms.');
      }

    case 'QUOTE_SET_POLICY':{
        if (!has('approveQuotation')) return fail('Only Management or the Business Head can change commercial thresholds.');
        if (!(action.standardCreditDays >= 0) || !(action.minAdvanceMonths >= 0)) return fail('Values can’t be negative.');
        const p = d.quotePolicy;
        audit(ctx, 'Commercial thresholds changed', `Credit ${p.standardCreditDays} → ${action.standardCreditDays} days; advance ${p.minAdvanceMonths} → ${action.minAdvanceMonths} month(s)`, { type: 'policy', id: 'QUOTE-POLICY' });
        d.quotePolicy = { ...p, standardCreditDays: action.standardCreditDays, minAdvanceMonths: action.minAdvanceMonths, status: 'Awaiting IOL confirmation' };
        return ok('Thresholds saved. They apply to versions submitted from now on.');
      }

    case 'WO_REQUEST_CHANGE':{
        const w = d.workOrders.find((x) => x.id === action.workOrderId);
        const snap = w && currentSnapshot(w);
        if (!w || !snap) return fail('Work order not found.');
        if (!has('createQuotation') && !has('manageWorkOrders')) return fail('Your role can’t request work order changes.');
        if (w.status === 'Completed' || w.status === 'Cancelled') return fail(`This work order is ${w.status.toLowerCase()}.`);
        if (d.changeRequests.some((c) => c.target.id === w.id && c.status === 'Pending')) return fail('A change request is already awaiting approval.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason (${MIN_REASON}+ characters).`);
        const job = d.installationJobs.find((j) => j.workOrderId === w.id);
        if (action.kind === 'Cancellation' && job && ['In Progress', 'Work Completed', 'Verified', 'Closed'].includes(job.status)) return fail('Installation is complete — raise a disconnection instead of cancelling.');
        if (action.kind === 'Revision') {
          const p = action.proposed ?? {};
          const changed = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] !== undefined && p[k] !== snap.terms[k]);
          if (changed.length === 0) return fail('Change at least one term.');
          if (Object.values(p).some((v) => v !== undefined && !(Number(v) > 0))) return fail('Proposed values must be above zero.');
        }
        const crId = nextId(d.changeRequests, 'CR-2026-', 3);
        const apId = nextId(d.approvals, 'AP-2026-', 4);
        const name = d.customers.find((c) => c.id === w.customerId)?.name ?? w.customerId;
        d.approvals.unshift({
          id: apId, type: 'Work Order Change', title: `${action.kind} — ${w.id} · ${name}`, detail: action.reason.trim(), amount: action.proposed?.mrc ?? snap.terms.mrc,
          entity: { type: 'workOrder', id: w.id }, related: [{ type: 'quotation', id: snap.quotationId }], requestedById: user.id, requestedAt: at, requiredPermission: 'approveQuotation', status: 'Pending',
          changeRequestId: crId, branchId: w.branchId, zoneId: w.zoneId
        });
        d.changeRequests.unshift({ id: crId, target: { type: 'workOrder', id: w.id }, kind: action.kind, reason: action.reason.trim(), proposed: action.proposed, requestedById: user.id, requestedAt: at, status: 'Pending', approvalId: apId, branchId: w.branchId, zoneId: w.zoneId });
        audit(ctx, `Work order ${action.kind.toLowerCase()} requested`, `${crId} on ${w.id} — ${action.reason.trim()}`, { type: 'workOrder', id: w.id }, [{ type: 'approval', id: apId }]);
        notify(ctx, { title: `Work order ${action.kind.toLowerCase()} awaiting approval`, detail: `${w.id} · ${name}`, module: 'quotations', branchId: w.branchId, entity: { type: 'approval', id: apId }, requires: ['viewPipeline'] });
        return ok(`${crId} sent for approval. The current snapshot stays in force until it is approved.`);
      }

    case 'WO_ACK_HANDOVER':{
        const w = d.workOrders.find((x) => x.id === action.workOrderId);
        if (!w) return fail('Work order not found.');
        const tech = action.department === 'Technical';
        if (tech ? !has('technicalConfig') : !has('recordCollection')) return fail(`Only ${tech ? 'the Technical team' : 'Accounts'} acknowledges this handover.`);
        const h = w.handovers?.find((x) => x.department === action.department && !x.acknowledgedAt);
        if (!h) return fail('Nothing to acknowledge.');
        h.acknowledgedById = user.id;
        h.acknowledgedAt = at;
        audit(ctx, `${action.department} handover acknowledged`, `${w.id} snapshot v${h.snapshotVersion}`, { type: 'workOrder', id: w.id });
        return ok(`${action.department} handover acknowledged.`);
      }
  }
}

// ---------- Hooks used when an approval is decided ----------

/** Updates quotations, advances and work orders after a related approval decision. Returns an extra message. */
export function afterApprovalDecided(d: DemoDatabase, ap: Approval, actor: Actor, at: string): string {
  const ctx: Ctx = { d, actor, at };
  const approved = ap.status === 'Approved';

  if (ap.type === 'Advance Exception') {
    const q = d.quotations.find((x) => x.id === ap.entity.id);
    if (q?.advance) q.advance.state = approved ? 'Exception approved' : 'Exception rejected';
    return '';
  }

  if (ap.type === 'Work Order Change') return applyChangeDecision(ctx, ap, approved);

  if (ap.entity.type !== 'quotation' || ap.quotationVersion === undefined) return '';
  const q = d.quotations.find((x) => x.id === ap.entity.id);
  const v = q?.versions?.find((x) => x.version === ap.quotationVersion);
  if (!q || !v || v.status !== 'Pending Approval') return '';
  const siblings = d.approvals.filter((a) => a.entity.type === 'quotation' && a.entity.id === q.id && a.quotationVersion === v.version && a.status !== 'Withdrawn');
  if (!approved) {
    siblings.forEach((a) => {
      if (a.status === 'Pending') {
        a.status = 'Withdrawn';
        a.decidedAt = at;
      }
    });
    v.status = 'Rejected';
    q.status = 'Rejected';
    notify(ctx, { title: `${q.id} v${v.version} rejected`, detail: `${ap.type} rejected by ${actor.name}`, module: 'quotations', branchId: q.branchId, entity: { type: 'quotation', id: q.id }, requires: ['viewPipeline'] });
    return ' The version is rejected; revise it to continue.';
  }
  if (siblings.every((a) => a.status === 'Approved')) {
    v.status = 'Approved';
    v.approvedAt = at;
    q.status = 'Approved';
    audit(ctx, 'Quotation terms locked', `${q.id} v${v.version} approved by all required authorities — financial and technical terms locked`, { type: 'quotation', id: q.id });
    notify(ctx, { title: `${q.id} v${v.version} approved`, detail: `${quoteName(d, q)} · record customer acceptance`, module: 'quotations', branchId: q.branchId, entity: { type: 'quotation', id: q.id }, requires: ['viewPipeline'] });
    return ` All approvals complete — v${v.version} is locked.`;
  }
  const left = siblings.filter((a) => a.status === 'Pending').length;
  return ` ${left} approval(s) still pending.`;
}

function applyChangeDecision(ctx: Ctx, ap: Approval, approved: boolean): string {
  const { d, at, actor } = ctx;
  const cr = d.changeRequests.find((c) => c.id === ap.changeRequestId);
  const w = d.workOrders.find((x) => x.id === ap.entity.id);
  const snap = w && currentSnapshot(w);
  if (!cr || !w || !snap) return '';
  cr.status = approved ? 'Approved' : 'Rejected';
  cr.decidedById = actor.id;
  cr.decidedAt = at;
  if (!approved) return ' The current snapshot stays in force.';
  const q = d.quotations.find((x) => x.id === snap.quotationId);
  const job = d.installationJobs.find((j) => j.workOrderId === w.id);
  const conn = job ? d.connections.find((c) => c.id === job.connectionId) : undefined;

  if (cr.kind === 'Cancellation') {
    w.status = 'Cancelled';
    w.cancelReason = cr.reason;
    if (job && ['Pending Assignment', 'Assigned', 'Scheduled', 'On Hold'].includes(job.status)) job.status = 'Cancelled';
    if (conn && conn.status === 'Pending Activation') conn.status = 'Disconnected';
    if (q) {
      q.status = 'Cancelled';
      q.cancelReason = `Work order ${w.id} cancelled — ${cr.reason}`;
    }
    audit(ctx, 'Work order cancelled', `${w.id} — ${cr.reason}. Locked snapshots kept for audit.`, { type: 'workOrder', id: w.id }, [{ type: 'quotation', id: snap.quotationId }]);
    notify(ctx, { title: `${w.id} cancelled`, detail: cr.reason, module: 'installations', branchId: w.branchId, entity: { type: 'workOrder', id: w.id } });
    return ' Work order cancelled.';
  }

  const terms: QuotationTerms = { ...snap.terms, ...Object.fromEntries(Object.entries(cr.proposed ?? {}).filter(([, v]) => v !== undefined)) };
  const leadChanged = terms.leadTimeDays !== snap.terms.leadTimeDays;
  const deadline = leadChanged ? dhakaDayAt(at, terms.leadTimeDays, '17:00') : snap.deadline;
  const next: WorkOrderSnapshot = { ...snap, version: snap.version + 1, terms, deadline, commissioningDate: leadChanged ? deadline : snap.commissioningDate, lockedAt: at, lockedById: actor.id, reason: `${cr.id}: ${cr.reason}` };
  if (q) {
    const qv = (q.version ?? 1) + 1;
    q.versions = [...(q.versions ?? []).map((v) => v.status === 'Approved' ? { ...v, status: 'Superseded' as const } : v), { version: qv, status: 'Approved', terms, reason: `Work order revision ${cr.id} — ${cr.reason}`, createdAt: at, createdById: cr.requestedById, submittedAt: cr.requestedAt, approvedAt: at }];
    q.version = qv;
    q.mrc = terms.mrc;
    next.quotationVersion = qv;
    if (q.acceptance) q.acceptance = { ...q.acceptance, version: qv };
  }
  w.snapshots = [...(w.snapshots ?? []), next];
  w.handovers = (['Technical', 'Accounts'] as Department[]).map((department) => ({ department, snapshotVersion: next.version, sentAt: at }));
  if (conn && conn.status === 'Pending Activation') {
    conn.mrc = terms.mrc;
    conn.bandwidthMbps = terms.bandwidthMbps;
  }
  audit(ctx, 'Work order revised', `${w.id} snapshot v${snap.version} → v${next.version} (${cr.id}). Earlier snapshot kept unchanged.`, { type: 'workOrder', id: w.id }, [{ type: 'quotation', id: snap.quotationId }]);
  notify(ctx, { title: `${w.id} revised — new technical handover`, detail: `Snapshot v${next.version}`, module: 'installations', branchId: w.branchId, entity: { type: 'workOrder', id: w.id }, requires: ['technicalConfig'] });
  notify(ctx, { title: `${w.id} revised — new accounts handover`, detail: `Snapshot v${next.version}`, module: 'billing', branchId: w.branchId, entity: { type: 'workOrder', id: w.id }, requires: ['viewFinancials'] });
  return ` Snapshot v${next.version} issued with new handovers.`;
}