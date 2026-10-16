import { branches } from '../data/branches';
import { dhakaDayAt, dhakaParts, formatBDT, formatDhaka } from './format';
import { nextId, userName } from './relations';
import { ackMissing, billingBasisFor, commencementDate, TECHNICIANS } from './installationRules';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { DemoDatabase, EntityRef, InstallationJob } from '../types/records';
import type { AckMethod, CompletionForm, HoldParty, JobEquipment, JobEvent, JobStatus, MaterialRequestKind } from '../types/installation';
import type { Actor, WorkflowResult } from './workflow';
import { firstBillDraft } from './billingCalc';
import { postDraft } from './billingWorkflow';
import { StockError, checkJobSerials, consumeJobMaterials, installJobEquipment, issueStock, logReturn, reserveStock } from './stockOps';

export type JobAction =
{type: 'JOB_ASSIGN';jobId: string;technicianName: string;} |
{type: 'JOB_SCHEDULE';jobId: string;scheduledAt: string;} |
{type: 'JOB_START';jobId: string;} |
{type: 'JOB_HOLD';jobId: string;reason: string;party: HoldParty;nextReviewAt: string;} |
{type: 'JOB_RESUME';jobId: string;note: string;} |
{type: 'JOB_ADD_NOTE';jobId: string;text: string;} |
{type: 'JOB_SAVE_EQUIPMENT';jobId: string;equipment: JobEquipment[];} |
{type: 'JOB_REQUEST_MATERIALS';jobId: string;kind: MaterialRequestKind;lines: {materialId: string;quantity: number;}[];note?: string;} |
{type: 'JOB_DECIDE_MATERIALS';jobId: string;requestId: string;decision: 'Fulfilled' | 'Rejected';note?: string;serials?: Record<string, string[]>;} |
{type: 'JOB_MARK_DONE';jobId: string;completion: CompletionForm;} |
{type: 'JOB_VERIFY';jobId: string;note: string;} |
{type: 'JOB_RETURN';jobId: string;reason: string;} |
{type: 'JOB_RECORD_ACCEPTANCE';jobId: string;name: string;method: AckMethod;at: string;} |
{type: 'JOB_COMMENCE_BILLING';jobId: string;reviewNote: string;};

export function isJobAction(a: {type: string;}): a is JobAction {
  return a.type.startsWith('JOB_');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_TEXT = 10;

export function applyJobAction(db: DemoDatabase, action: JobAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const d: DemoDatabase = structuredClone(db);
  const job = d.installationJobs.find((j) => j.id === action.jobId);
  if (!job) return fail('Installation job not found.');
  const customer = d.customers.find((c) => c.id === job.customerId);
  const name = customer?.name ?? job.customerId;
  const ref: EntityRef = { type: 'installationJob', id: job.id };
  const related: EntityRef[] = [{ type: 'customer', id: job.customerId }, { type: 'workOrder', id: job.workOrderId }, { type: 'connection', id: job.connectionId }];
  const warehouse = branches.find((b) => b.id === job.branchId)?.warehouse ?? 'Warehouse';

  const log = (kind: JobEvent['kind'], detail: string) => {
    job.history = [...(job.history ?? []), { at, byId: actor.id, kind, detail }];
  };
  const audit = (act: string, summary: string, extra: EntityRef[] = []) => {
    d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity: ref, related: [...related, ...extra] });
  };
  const notify = (n: {title: string;detail: string;module: ModuleId;branchId?: BranchId | null;requires?: Permission[];forUserIds?: string[];entity?: EntityRef;}) => {
    d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], branchId: job.branchId, entity: ref, ...n });
  };
  const move = (to: JobStatus) => {
    const from = job.status;
    job.status = to;
    log('Status', `${from} → ${to}`);
  };
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });

  if (job.status === 'Cancelled' || job.status === 'Closed' && action.type !== 'JOB_ADD_NOTE') return fail(`${job.id} is ${job.status.toLowerCase()}.`);

  switch (action.type) {
    case 'JOB_ASSIGN':{
        if (!['Pending Assignment', 'Assigned', 'Scheduled'].includes(job.status)) return fail('Reassign only before work starts.');
        const tech = TECHNICIANS.find((t) => t.name === action.technicianName);
        if (!tech) return fail('Choose a technician.');
        if (tech.branchId !== job.branchId) return fail(`${tech.name} is not in this job's branch.`);
        const prev = job.technicianName;
        job.technicianName = tech.name;
        job.technicianUserId = tech.userId;
        log('Assignment', prev && prev !== tech.name ? `Reassigned ${prev} → ${tech.name}` : `Assigned to ${tech.name}`);
        if (job.status === 'Pending Assignment') move('Assigned');
        audit('Installation assigned', `${job.id} assigned to ${tech.name}`);
        if (tech.userId) notify({ title: `Job assigned — ${job.id}`, detail: `${name} · target ${formatDhaka(job.scheduledAt)}`, module: 'installations', forUserIds: [tech.userId] });
        return ok(`${job.id} assigned to ${tech.name}.`);
      }

    case 'JOB_SCHEDULE':{
        if (!['Assigned', 'Scheduled'].includes(job.status)) return fail('Assign a technician before scheduling.');
        if (!action.scheduledAt) return fail('Pick a date and time.');
        const re = job.status === 'Scheduled';
        job.scheduledAt = action.scheduledAt;
        log('Schedule', `${re ? 'Rescheduled' : 'Scheduled'} for ${formatDhaka(action.scheduledAt, { year: true })}`);
        if (!re) move('Scheduled');
        audit(re ? 'Installation rescheduled' : 'Installation scheduled', `${job.id} · ${formatDhaka(action.scheduledAt, { year: true })} · ${job.technicianName}`);
        if (job.technicianUserId) notify({ title: `${re ? 'Rescheduled' : 'Scheduled'} — ${job.id}`, detail: `${name} · ${formatDhaka(action.scheduledAt)}`, module: 'installations', forUserIds: [job.technicianUserId] });
        return ok(`${job.id} ${re ? 'rescheduled' : 'scheduled'} for ${formatDhaka(action.scheduledAt)}.`);
      }

    case 'JOB_START':{
        if (job.status !== 'Scheduled') return fail('Only scheduled jobs can be started.');
        move('In Progress');
        const wo = d.workOrders.find((w) => w.id === job.workOrderId);
        if (wo && wo.status === 'Open') wo.status = 'In Progress';
        audit('Installation started', `${job.id} started on site by ${job.technicianName}`);
        return ok(`${job.id} started.`);
      }

    case 'JOB_HOLD':{
        if (!['Assigned', 'Scheduled', 'In Progress'].includes(job.status)) return fail('This job cannot be put on hold now.');
        if (action.reason.trim().length < MIN_TEXT) return fail(`Hold reason needs at least ${MIN_TEXT} characters.`);
        if (!action.nextReviewAt) return fail('Set a next review date.');
        job.hold = { reason: action.reason.trim(), party: action.party, nextReviewAt: action.nextReviewAt, since: at, byId: actor.id, resumeTo: job.status };
        log('Hold', `On hold — ${action.party}: ${action.reason.trim()} · review ${formatDhaka(action.nextReviewAt)}`);
        move('On Hold');
        audit('Installation on hold', `${job.id} on hold (${action.party}) — ${action.reason.trim()}`);
        notify({ title: `Installation on hold — ${job.id}`, detail: `${name} · ${action.party} · review ${formatDhaka(action.nextReviewAt)}`, module: 'installations', requires: ['technicalConfig'] });
        if (customer) notify({ title: `Installation on hold — ${name}`, detail: `${job.id} · ${action.party}: ${action.reason.trim()}`, module: 'customers', forUserIds: [customer.accountManagerId] });
        return ok(`${job.id} put on hold.`);
      }

    case 'JOB_RESUME':{
        if (job.status !== 'On Hold' || !job.hold) return fail('This job is not on hold.');
        const to = job.hold.resumeTo;
        log('Hold', `Hold lifted (${job.hold.party}, since ${formatDhaka(job.hold.since)})${action.note.trim() ? ` — ${action.note.trim()}` : ''}`);
        job.hold = undefined;
        move(to);
        audit('Installation resumed', `${job.id} resumed to ${to}`);
        return ok(`${job.id} resumed — ${to}.`);
      }

    case 'JOB_ADD_NOTE':{
        if (!action.text.trim()) return fail('Write a note first.');
        job.notes = [...(job.notes ?? []), { id: `${job.id}-n${(job.notes?.length ?? 0) + 1}`, at, byId: actor.id, text: action.text.trim() }];
        log('Note', action.text.trim().slice(0, 80));
        return ok('Note added.');
      }

    case 'JOB_SAVE_EQUIPMENT':{
        if (['Verified', 'Closed'].includes(job.status)) return fail('Equipment is locked after verification.');
        const blank = action.equipment.find((e) => !e.item.trim() || !e.serial.trim());
        if (blank) return fail('Every equipment line needs an item and serial number.');
        const dup = action.equipment.find((e, i) => action.equipment.findIndex((x) => x.serial.trim().toUpperCase() === e.serial.trim().toUpperCase()) !== i);
        if (dup) return fail(`Serial ${dup.serial} is entered twice.`);
        try {
          checkJobSerials(d, job.id, job.connectionId, action.equipment);
        } catch (e) {
          if (e instanceof StockError) return fail(e.message);
          throw e;
        }
        job.equipment = action.equipment.map((e) => ({ ...e, serial: e.serial.trim().toUpperCase() }));
        log('Equipment', `Equipment recorded: ${job.equipment.map((e) => `${e.item} ${e.serial}`).join('; ') || 'none'}`);
        audit('Equipment serials recorded', `${job.id} · ${job.equipment.length} item(s)`);
        return ok('Equipment and serials saved.');
      }

    case 'JOB_REQUEST_MATERIALS':{
        const lines = action.lines.filter((l) => l.quantity > 0);
        if (!lines.length) return fail('Enter at least one quantity.');
        for (const l of lines) {
          const m = job.materialLines?.find((x) => x.id === l.materialId);
          if (!m) return fail('Unknown material line.');
          if (action.kind === 'Return' && l.quantity > m.issued - m.consumed - m.returned) return fail(`Only ${m.issued - m.consumed - m.returned} ${m.unit} of ${m.item} is unused and returnable.`);
        }
        const id = `${job.id}-MR${(job.materialRequests?.length ?? 0) + 1}`;
        job.materialRequests = [...(job.materialRequests ?? []), { id, kind: action.kind, lines, note: action.note?.trim(), status: 'Requested', requestedById: actor.id, requestedAt: at }];
        const summary = lines.map((l) => `${job.materialLines!.find((m) => m.id === l.materialId)!.item} ×${l.quantity}`).join(', ');
        log('Material', `${action.kind} requested: ${summary}`);
        audit(`Material ${action.kind.toLowerCase()} requested`, `${job.id} · ${summary}`);
        notify({ title: `${action.kind} request — ${job.id}`, detail: `${name} · ${summary}`, module: 'inventory', requires: ['manageStock'] });
        return ok(`${action.kind} request sent to Inventory.`);
      }

    case 'JOB_DECIDE_MATERIALS':{
        const r = job.materialRequests?.find((x) => x.id === action.requestId);
        if (!r || r.status !== 'Requested') return fail('This request is already decided.');
        r.status = action.decision;
        r.decidedById = actor.id;
        r.decidedAt = at;
        r.decisionNote = action.note?.trim();
        const extra: EntityRef[] = [];
        if (action.decision === 'Fulfilled') {
          if (r.kind !== 'Reservation' && !job.technicianName) return fail('Assign a technician before issuing or returning materials.');
          try {
            for (const l of r.lines) {
              const m = job.materialLines!.find((x) => x.id === l.materialId)!;
              const serials = action.serials?.[l.materialId] ?? [];
              if (r.kind === 'Reservation') {
                reserveStock(d, { sku: m.sku, warehouse, quantity: l.quantity, links: { jobId: job.id }, note: r.note }, actor, at);
                m.reserved += l.quantity;
              } else if (r.kind === 'Issue') {
                const mv = issueStock(d, { sku: m.sku, warehouse, quantity: l.quantity, serials, technicianName: job.technicianName, links: { jobId: job.id }, note: r.note }, actor, at);
                m.reserved -= Math.min(m.reserved, l.quantity);
                m.issued += l.quantity;
                extra.push({ type: 'inventoryMovement', id: mv.id });
              } else {
                // Returned stock waits for inspection in Inventory before it is restocked.
                logReturn(d, { sku: m.sku, warehouse, quantity: l.quantity, serials, source: 'Technician (unused)', fromName: job.technicianName, links: { jobId: job.id } }, actor, at);
                m.returned += l.quantity;
              }
            }
          } catch (e) {
            if (e instanceof StockError) return fail(e.message);
            throw e;
          }
        }
        log('Material', `${r.kind} ${action.decision.toLowerCase()} by ${actor.name}${r.decisionNote ? ` — ${r.decisionNote}` : ''}`);
        audit(`Material ${r.kind.toLowerCase()} ${action.decision.toLowerCase()}`, `${job.id} · ${r.id}`, extra);
        if (job.technicianUserId) notify({ title: `${r.kind} ${action.decision.toLowerCase()} — ${job.id}`, detail: name, module: 'installations', forUserIds: [job.technicianUserId] });
        const tail = action.decision !== 'Fulfilled' ? '' : r.kind === 'Reservation' ? ' Stock is held, not reduced.' : r.kind === 'Return' ? ' Awaiting inspection in Inventory before restocking.' : ' Warehouse on-hand reduced.';
        return ok(`${r.kind} ${action.decision.toLowerCase()}.${tail}`);
      }

    case 'JOB_MARK_DONE':{
        if (job.status !== 'In Progress') return fail('Start the job before marking it done.');
        const c = action.completion;
        if (c.workPerformed.trim().length < MIN_TEXT) return fail('Describe the work performed.');
        if (!c.installedAt) return fail('Enter the installation timestamp.');
        if (!job.equipment?.length) return fail('Record installed equipment with serial numbers first.');
        if (!c.photos.length) return fail('Attach at least one photo.');
        for (const l of c.consumed) {
          const m = job.materialLines?.find((x) => x.id === l.materialId);
          if (m && l.quantity > m.issued - m.returned) return fail(`${m.item}: consumed (${l.quantity}) is more than issued (${m.issued - m.returned}).`);
        }
        try {
          installJobEquipment(d, { jobId: job.id, connectionId: job.connectionId, siteId: job.siteId, customerId: job.customerId, deployedAt: c.installedAt, equipment: job.equipment! }, actor, at);
          consumeJobMaterials(
            d,
            warehouse,
            c.consumed.map((l) => {
              const m = job.materialLines?.find((x) => x.id === l.materialId);
              return { sku: m?.sku ?? '', quantity: l.quantity - (m?.consumed ?? 0), serialised: m?.serialised };
            })
          );
        } catch (e) {
          if (e instanceof StockError) return fail(e.message);
          throw e;
        }
        job.completion = structuredClone(c);
        c.consumed.forEach((l) => {
          const m = job.materialLines?.find((x) => x.id === l.materialId);
          if (m) m.consumed = l.quantity;
        });
        job.completedAt = c.installedAt;
        job.customerAcceptedAt = c.acknowledgement?.at;
        job.handoverAt = at;
        job.handoverById = actor.id;
        job.materials = (job.materialLines ?? []).filter((m) => m.consumed > 0).map((m) => `${m.item} ×${m.consumed}${m.unit === 'pc' ? '' : ` ${m.unit}`}`).join(', ') || job.materials;
        const conn = d.connections.find((x) => x.id === job.connectionId);
        const ont = job.equipment!.find((e) => /ONT|ONU/i.test(e.item));
        if (conn && ont) conn.onuSerial = ont.serial;
        log('Completion', `Marked done — handed over ${formatDhaka(at, { year: true })}. Tests ${c.tests.result}${c.outstandingIssues.trim() ? `; outstanding: ${c.outstandingIssues.trim()}` : ''}`);
        move('Work Completed');
        audit('Installation marked done', `${job.id} handed over; installed ${formatDhaka(c.installedAt, { year: true })}; billing not started`);
        if (customer) notify({ title: `Installation done — ${name}`, detail: `${job.id} handed over ${formatDhaka(at)} · awaiting technical verification`, module: 'customers', forUserIds: [customer.accountManagerId] });
        notify({ title: `Installation done — ${job.id}`, detail: `${name} · awaiting technical verification; billing not started`, module: 'billing', requires: ['recordCollection'] });
        notify({ title: `Verify installation ${job.id}`, detail: `${name} · marked done by ${actor.name}`, module: 'installations', requires: ['assignTickets'] });
        return ok(`${job.id} marked done. Account Manager and Accounts notified; billing has not started.`);
      }

    case 'JOB_VERIFY':{
        if (job.status !== 'Work Completed') return fail('Only completed work can be verified.');
        if (job.handoverById === actor.id) return fail('The person who marked the job done cannot verify it.');
        if (job.completion?.tests.result !== 'Pass') return fail('Test results failed — return the job to the technician instead.');
        job.verifiedAt = at;
        job.verifiedById = actor.id;
        job.verificationNote = action.note.trim();
        job.activatedAt = at;
        const conn = d.connections.find((x) => x.id === job.connectionId);
        if (conn) {
          conn.status = 'Active';
          conn.activatedAt = at;
        }
        const wo = d.workOrders.find((w) => w.id === job.workOrderId);
        if (wo) wo.status = 'Completed';
        log('Verification', `Technically verified${action.note.trim() ? ` — ${action.note.trim()}` : ''}; service activated`);
        move('Verified');
        audit('Installation verified', `${job.id} verified; ${job.connectionId} activated; billing awaits Accounts review`);
        notify({ title: `Review billing commencement — ${name}`, detail: `${job.id} verified · apply the approved rule`, module: 'billing', requires: ['recordCollection'] });
        if (customer) notify({ title: `Service activated — ${name}`, detail: `${job.connectionId} · billing awaits Accounts review`, module: 'customers', forUserIds: [customer.accountManagerId] });
        return ok(`${job.id} verified and service activated. Accounts will review billing.`);
      }

    case 'JOB_RETURN':{
        if (job.status !== 'Work Completed') return fail('Only completed work can be returned.');
        if (action.reason.trim().length < MIN_TEXT) return fail(`Give a reason of at least ${MIN_TEXT} characters.`);
        job.handoverAt = undefined;
        log('Verification', `Returned to technician — ${action.reason.trim()}`);
        move('In Progress');
        audit('Installation returned', `${job.id} returned: ${action.reason.trim()}`);
        if (job.technicianUserId) notify({ title: `Job returned — ${job.id}`, detail: action.reason.trim(), module: 'installations', forUserIds: [job.technicianUserId] });
        return ok(`${job.id} returned to ${job.technicianName}.`);
      }

    case 'JOB_RECORD_ACCEPTANCE':{
        if (!['Work Completed', 'Verified'].includes(job.status) || !job.completion) return fail('Acceptance is recorded after the job is marked done.');
        if (job.customerAcceptedAt) return fail('Customer acceptance is already recorded.');
        if (!action.name.trim() || !action.at) return fail('Enter who accepted and when.');
        job.completion.acknowledgement = { name: action.name.trim(), method: action.method, at: action.at };
        job.customerAcceptedAt = action.at;
        log('Completion', `Customer acceptance recorded — ${action.name.trim()} (${action.method}), ${formatDhaka(action.at, { year: true })}`);
        audit('Customer acceptance recorded', `${job.id} accepted by ${action.name.trim()}`);
        return ok('Customer acceptance recorded.');
      }

    case 'JOB_COMMENCE_BILLING':{
        if (job.status !== 'Verified') return fail('Billing can start only after technical verification.');
        if (ackMissing(job) && !job.customerAcceptedAt) return fail('Customer acceptance is missing.');
        const start = commencementDate(d, job);
        if (!start) return fail('The approved rule cannot be applied yet — a required date is missing.');
        if (!action.reviewNote.trim()) return fail('Confirm the rule you reviewed.');
        const conn = d.connections.find((x) => x.id === job.connectionId)!;
        const wo = d.workOrders.find((w) => w.id === job.workOrderId);
        const q = d.quotations.find((x) => x.id === wo?.quotationId);
        const otc = q?.otc ?? 0;
        // Same builder as billing runs: shows the proration calculation and blocks duplicates for the service and period.
        const draft = firstBillDraft(d, conn, start, otc, at);
        if ('error' in draft) return fail(draft.error);
        const posted = postDraft(d, draft, at, actor.id);
        const invId = posted.id;
        const prorated = posted.amount - otc;
        job.billingCommencedAt = start;
        job.billingReviewedById = actor.id;
        if (customer) customer.status = 'Active';
        const opp = d.opportunities.find((o) => o.id === q?.opportunityId);
        const won = d.crmStages.find((s) => s.role === 'won');
        if (opp && won && opp.status !== 'Won') {
          const from = d.crmStages.find((s) => s.id === opp.stage)?.label ?? opp.stage;
          opp.stage = won.id;
          opp.status = 'Won';
          opp.wonAt = at;
          opp.nextAction = '';
          opp.nextActionDue = '';
          opp.history.push({ at, byId: actor.id, kind: 'Stage', detail: `${from} → ${won.label} (billing commenced)` });
        }
        log('Billing', `Billing commencement reviewed (${billingBasisFor(job)}) — starts ${formatDhaka(start, { year: true })}; ${invId} issued. ${action.reviewNote.trim()}`);
        move('Closed');
        audit('Billing commenced', `${job.id}: ${billingBasisFor(job)} → ${formatDhaka(start, { year: true })}; ${invId} ${formatBDT(prorated + otc)}`, [{ type: 'invoice', id: invId }, { type: 'billingAccount', id: conn.billingAccountId }]);
        notify({ title: `Invoice ${invId} issued`, detail: `${name} · ${formatBDT(prorated + otc)}`, module: 'billing', requires: ['viewFinancials'], entity: { type: 'invoice', id: invId } });
        if (customer) notify({ title: `Billing commenced — ${name}`, detail: `From ${formatDhaka(start)} · reviewed by ${userName(actor.id)}`, module: 'customers', forUserIds: [customer.accountManagerId] });
        return ok(`Billing commences ${formatDhaka(start)}. ${invId} issued; ${job.id} closed.`);
      }
  }
}

/** Helper for seeding: next default technician for a branch. */
export const defaultTechnician = (j: Pick<InstallationJob, 'branchId'>) => TECHNICIANS.find((t) => t.branchId === j.branchId);