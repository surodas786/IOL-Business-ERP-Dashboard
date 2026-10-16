import { roles } from '../data/roles';
import { simulationScenarios } from '../data/seed/tickets';
import { technicianProfiles } from '../data/supportConfig';
import { demoNow, formatDhaka } from './format';
import { nextId } from './relations';
import { itemOf, stockOf, warehouseForBranch } from './inventoryRules';
import { StockError, checkQuantity, issueStock, pushMovement, unitBySerial, unitEvent } from './stockOps';
import { MIN_REASON, canCloseTicket, canCreateTicket, canDispatch, canEditRoster, canReopen, canSimulate, canWorkOn, currentHold, onDuty, policyFor, shiftOf } from './ticketRules';
import type { DemoDatabase, EntityRef, StoredNotification, Ticket } from '../types/records';
import type { FileRef } from '../types/field';
import type { ConfirmationStatus, HoldReason, IssueCategory, Shift, SupportTeam, TicketEventKind, TicketMaterialUse, TicketPriority, TicketSource } from '../types/ticket';
import type { Actor, WorkflowResult } from './workflow';

export interface TicketInput {
  customerId: string;
  siteId: string;
  connectionId?: string;
  source: TicketSource;
  category: IssueCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  callerName: string;
  callerContact: string;
  attachments: FileRef[];
}

export interface MaterialInput {
  sku: string;
  quantity: number;
  serials: string[];
  source: 'Technician stock' | 'Warehouse';
}

export interface ResolveInput {
  description: string;
  workPerformed: string;
  noMaterials: boolean;
  materials: MaterialInput[];
  resolvedAt: string;
  confirmation: ConfirmationStatus;
  confirmedBy: string;
  confirmationNote: string;
}

export type TicketAction =
{type: 'TKT_CREATE';input: TicketInput;} |
{type: 'TKT_SIMULATE';channel: 'Call' | 'Email';} |
{type: 'TKT_ASSIGN';ticketId: string;team: SupportTeam;technicianName: string;note: string;} |
{type: 'TKT_RESPOND';ticketId: string;note: string;} |
{type: 'TKT_START';ticketId: string;} |
{type: 'TKT_HOLD';ticketId: string;reason: HoldReason;note: string;} |
{type: 'TKT_RESUME';ticketId: string;note: string;} |
{type: 'TKT_ESCALATE';ticketId: string;level: 1 | 2 | 3;to: string;reason: string;} |
{type: 'TKT_NOTE';ticketId: string;note: string;} |
{type: 'TKT_ATTACH';ticketId: string;files: FileRef[];} |
{type: 'TKT_RESOLVE';ticketId: string;input: ResolveInput;} |
{type: 'TKT_CONFIRM';ticketId: string;confirmation: ConfirmationStatus;confirmedBy: string;note: string;} |
{type: 'TKT_CLOSE';ticketId: string;} |
{type: 'TKT_REOPEN';ticketId: string;reason: string;} |
{type: 'TKT_SET_SHIFT';technicianName: string;date: string;shift: Shift;};

export function isTicketAction(a: {type: string;}): a is TicketAction {
  return a.type.startsWith('TKT_');
}

const ms = (iso: string) => new Date(iso).getTime();
const addMin = (iso: string, m: number) => new Date(ms(iso) + m * 60000).toISOString();

export function applyTicketAction(db: DemoDatabase, action: TicketAction, actor: Actor, at: string): WorkflowResult {
  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, ok: true, message });
  const fail = (message: string): WorkflowResult => ({ db, ok: false, message });
  const role = roles.find((r) => r.id === d.users.find((u) => u.id === actor.id)?.role);
  if (!role || !role.modules.includes('tickets')) return fail('You do not have access to Support Tickets.');

  const ref = (id: string): EntityRef => ({ type: 'ticket', id });
  const audit = (action: string, summary: string, t: Ticket) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action, summary, entity: ref(t.id), related: [{ type: 'customer', id: t.customerId }, ...(t.connectionId ? [{ type: 'connection' as const, id: t.connectionId }] : [])] });
  const notify = (n: Omit<StoredNotification, 'id' | 'at' | 'readBy' | 'module'>) => d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], module: 'tickets', ...n });
  const log = (t: Ticket, kind: TicketEventKind, detail: string) => t.events = [...(t.events ?? []), { at, byName: actor.name, kind, detail }];
  const customerName = (id: string) => d.customers.find((c) => c.id === id)?.name ?? id;

  const create = (i: TicketInput, simulated?: 'Call' | 'Email'): Ticket | string => {
    const site = d.sites.find((s) => s.id === i.siteId);
    if (!site || site.customerId !== i.customerId) return 'Choose the customer and one of its sites.';
    if (i.connectionId) {
      const c = d.connections.find((x) => x.id === i.connectionId);
      if (!c || c.customerId !== i.customerId) return 'That service belongs to a different customer.';
    }
    if (i.subject.trim().length < 6) return 'Enter a short subject (at least 6 characters).';
    if (i.description.trim().length < 15) return 'Describe the issue (at least 15 characters).';
    const p = policyFor(i.priority);
    const t: Ticket = {
      id: nextId(d.tickets, 'TK-', 5), customerId: i.customerId, siteId: i.siteId, connectionId: i.connectionId || undefined, subject: i.subject.trim(), priority: i.priority, status: 'Open',
      source: i.source, category: i.category, description: i.description.trim(), callerName: i.callerName.trim() || undefined, callerContact: i.callerContact.trim() || undefined,
      createdByName: actor.name, simulated, openedAt: at, responseDueAt: addMin(at, p.responseMinutes), slaDueAt: addMin(at, p.resolutionMinutes),
      attachments: i.attachments.map((f) => ({ ...f, at, byName: actor.name })), branchId: site.branchId, zoneId: site.zoneId, events: []
    };
    log(t, 'Created', `${simulated ? `Simulated incoming ${simulated === 'Call' ? 'call' : 'email'} — no external system contacted · ` : ''}${i.source} · ${i.category} · ${i.priority}`);
    d.tickets.unshift(t);
    audit(simulated ? `Ticket created (simulated ${simulated.toLowerCase()})` : 'Ticket created', `${t.id} ${customerName(t.customerId)} — ${t.subject} · ${t.priority}`, t);
    if (i.priority === 'Urgent' || i.priority === 'High')
    notify({ title: `${i.priority} ticket ${t.id} opened`, detail: `${t.subject} · ${customerName(t.customerId)} · respond by ${formatDhaka(t.responseDueAt!)}`, branchId: t.branchId, requires: ['assignTickets'], entity: ref(t.id) });
    return t;
  };

  if (action.type === 'TKT_CREATE') {
    if (!canCreateTicket(role)) return fail('Your role cannot create tickets.');
    const r = create(action.input);
    return typeof r === 'string' ? fail(r) : ok(`${r.id} created. Respond by ${formatDhaka(r.responseDueAt!)}.`);
  }
  if (action.type === 'TKT_SIMULATE') {
    if (!canSimulate(role)) return fail('Only the support desk can simulate incoming contacts.');
    const pool = simulationScenarios.filter((s) => s.channel === action.channel);
    const used = d.tickets.filter((t) => t.simulated === action.channel).length;
    const s = pool[used % pool.length];
    const r = create(
      { customerId: s.customerId, siteId: s.siteId, connectionId: s.connectionId, source: s.channel === 'Call' ? 'Phone call' : 'Email', category: s.category, priority: s.priority, subject: s.subject, description: s.description, callerName: s.callerName, callerContact: s.callerContact, attachments: s.attachment ? [s.attachment] : [] },
      action.channel
    );
    return typeof r === 'string' ? fail(r) : ok(`Simulated ${action.channel === 'Call' ? 'call' : 'email'} created ${r.id} — ${r.subject}.`);
  }
  if (action.type === 'TKT_SET_SHIFT') {
    if (!canEditRoster(role)) return fail('Only the Technical Supervisor edits the duty roster.');
    if (!technicianProfiles.some((p) => p.name === action.technicianName)) return fail('Unknown technician.');
    const e = d.dutyRoster.find((r) => r.technicianName === action.technicianName && r.date === action.date);
    if (e) e.shift = action.shift;else
    d.dutyRoster.push({ id: nextId(d.dutyRoster, 'DR-', 4), technicianName: action.technicianName, date: action.date, shift: action.shift });
    return ok(`${action.technicianName}: ${action.shift} on ${action.date}.`);
  }

  const t = d.tickets.find((x) => x.id === action.ticketId);
  if (!t) return fail('Ticket not found.');
  const mayWork = canWorkOn(role, actor.name, t);

  switch (action.type) {
    case 'TKT_ASSIGN':{
        if (!canDispatch(role)) return fail('Only the support desk or Technical Supervisor assigns tickets.');
        if (!['Open', 'Assigned', 'In Progress', 'On Hold'].includes(t.status)) return fail('Resolved or closed tickets cannot be reassigned. Reopen first.');
        const p = technicianProfiles.find((x) => x.name === action.technicianName);
        if (!p) return fail('Choose a technician.');
        const shift = shiftOf(d, p.name);
        if (!onDuty(shift)) return fail(`${p.name} is ${shift ? shift.toLowerCase() : 'not rostered'} today. Choose someone on duty or update the duty roster.`);
        const prev = t.assigneeName;
        if (prev === p.name && t.team === action.team) return fail(`Already assigned to ${p.name}.`);
        t.team = action.team;
        t.assigneeName = p.name;
        if (t.status === 'Open') t.status = 'Assigned';
        log(t, 'Assigned', `${action.team} · ${p.name}${prev && prev !== p.name ? ` (was ${prev})` : ''}${action.note.trim() ? ` — ${action.note.trim()}` : ''}`);
        audit(prev ? 'Ticket reassigned' : 'Ticket assigned', `${t.id} → ${p.name} (${action.team})`, t);
        const u = d.users.find((x) => x.name === p.name);
        notify({ title: `${t.id} assigned to you`, detail: `${t.priority} · ${t.subject}`, branchId: t.branchId, forUserIds: u ? [u.id] : undefined, requires: u ? undefined : ['assignTickets'], entity: ref(t.id) });
        return ok(`${t.id} assigned to ${p.name}.${t.firstResponseAt ? '' : ' First response is still due — assignment does not count as a response.'}`);
      }
    case 'TKT_RESPOND':{
        if (!mayWork) return fail('Only the support desk or the assigned technician can respond.');
        if (t.firstResponseAt) return fail('First response is already recorded.');
        if (action.note.trim().length < MIN_REASON) return fail(`Describe the response given (at least ${MIN_REASON} characters).`);
        Object.assign(t, { firstResponseAt: at, firstResponseByName: actor.name, firstResponseNote: action.note.trim() });
        const late = at > (t.responseDueAt ?? at);
        log(t, 'Response', `${action.note.trim()}${late ? ' (after the response target)' : ''}`);
        audit('First response recorded', `${t.id} ${late ? 'after' : 'within'} response target`, t);
        return ok(`First response recorded ${late ? 'after' : 'within'} the target.`);
      }
    case 'TKT_START':{
        if (!mayWork) return fail('Only the assigned technician or the support desk can start work.');
        if (t.status !== 'Assigned') return fail('Only assigned tickets can be started.');
        t.status = 'In Progress';
        t.startedAt = t.startedAt ?? at;
        log(t, 'Status', 'Work started');
        if (!t.firstResponseAt) {
          Object.assign(t, { firstResponseAt: at, firstResponseByName: actor.name, firstResponseNote: 'Work started' });
          log(t, 'Response', 'Recorded as first response — work started');
        }
        audit('Ticket work started', `${t.id} by ${actor.name}`, t);
        return ok(`${t.id} in progress.`);
      }
    case 'TKT_HOLD':{
        if (!mayWork) return fail('Only the assigned technician or the support desk can put a ticket on hold.');
        if (t.status !== 'Assigned' && t.status !== 'In Progress') return fail('Only assigned or in-progress tickets can go on hold.');
        if (action.note.trim().length < MIN_REASON) return fail(`Explain the hold (at least ${MIN_REASON} characters).`);
        const pauses = policyFor(t.priority).pauseReasons.includes(action.reason);
        t.holds = [...(t.holds ?? []), { from: at, reason: action.reason, note: action.note.trim(), pausesSla: pauses, byName: actor.name, resumeTo: t.status }];
        t.status = 'On Hold';
        log(t, 'Hold', `${action.reason} — ${action.note.trim()}. ${pauses ? `SLA paused (allowed for ${t.priority}).` : `SLA keeps running — the ${t.priority} policy does not pause for this reason.`}`);
        audit('Ticket on hold', `${t.id}: ${action.reason}${pauses ? ' · SLA paused' : ' · SLA running'}`, t);
        return ok(pauses ? 'On hold. The resolution timer is paused under the configured policy.' : 'On hold. The resolution timer keeps running — this reason does not pause it under the policy.');
      }
    case 'TKT_RESUME':{
        if (!mayWork) return fail('Only the assigned technician or the support desk can resume.');
        const h = currentHold(t);
        if (!h) return fail('This ticket is not on hold.');
        h.to = at;
        t.status = h.resumeTo;
        log(t, 'Resume', `Resumed${action.note.trim() ? ` — ${action.note.trim()}` : ''}${h.pausesSla ? '. SLA timer running again.' : ''}`);
        audit('Ticket resumed', `${t.id} back to ${t.status}`, t);
        return ok(`${t.id} resumed.`);
      }
    case 'TKT_ESCALATE':{
        if (!mayWork && !canDispatch(role)) return fail('Your role cannot escalate this ticket.');
        if (!['Open', 'Assigned', 'In Progress', 'On Hold'].includes(t.status)) return fail('Only open tickets can be escalated.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason (at least ${MIN_REASON} characters).`);
        t.escalations = [...(t.escalations ?? []), { at, level: action.level, to: action.to, reason: action.reason.trim(), byName: actor.name }];
        log(t, 'Escalation', `Level ${action.level} → ${action.to} — ${action.reason.trim()}`);
        audit('Ticket escalated', `${t.id} level ${action.level} → ${action.to}`, t);
        notify({ title: `${t.id} escalated to level ${action.level}`, detail: `${t.subject} · ${action.reason.trim()}`, branchId: t.branchId, requires: ['assignTickets'], entity: ref(t.id) });
        return ok(`Escalated to ${action.to}.`);
      }
    case 'TKT_NOTE':{
        if (action.note.trim().length < 3) return fail('Write a note.');
        log(t, 'Note', action.note.trim());
        return ok('Note added.');
      }
    case 'TKT_ATTACH':{
        if (!action.files.length) return fail('Choose a file.');
        t.attachments = [...(t.attachments ?? []), ...action.files.map((f) => ({ ...f, at, byName: actor.name }))];
        log(t, 'Attachment', action.files.map((f) => f.name).join(', '));
        return ok(`${action.files.length} attachment${action.files.length === 1 ? '' : 's'} added (file names only in this demo).`);
      }
    case 'TKT_RESOLVE':{
        if (!mayWork) return fail('Only the assigned technician or the support desk can resolve.');
        if (t.status !== 'In Progress') return fail('Start work before resolving. On-hold tickets must be resumed first.');
        if (!t.assigneeName) return fail('Assign a technician first.');
        const i = action.input;
        if (i.description.trim().length < MIN_REASON) return fail('Describe the cause and resolution (at least 10 characters).');
        if (i.workPerformed.trim().length < MIN_REASON) return fail('Describe the work performed (at least 10 characters).');
        if (!i.noMaterials && !i.materials.length) return fail('Add the materials used, or tick “No materials used”.');
        if (!i.resolvedAt) return fail('Enter the resolution time.');
        if (ms(i.resolvedAt) > demoNow().getTime() + 60000) return fail('The resolution time cannot be in the future.');
        if (ms(i.resolvedAt) < ms(t.openedAt)) return fail('The resolution time is before the ticket was created.');
        if (i.confirmation === 'Confirmed by customer' && i.confirmedBy.trim().length < 3) return fail('Enter who confirmed on the customer side.');
        if (i.confirmation === 'Customer disputes') return fail('The customer disputes the fix — keep working instead of resolving.');
        if (i.confirmation === 'Customer unreachable' && i.confirmationNote.trim().length < MIN_REASON) return fail('Record the contact attempts made (at least 10 characters).');

        const tech = t.assigneeName;
        const warehouse = warehouseForBranch(t.branchId);
        const used: TicketMaterialUse[] = [];
        try {
          for (const m of i.noMaterials ? [] : i.materials) {
            const item = itemOf(d, m.sku);
            if (!item) throw new StockError(`Unknown item ${m.sku}.`);
            const serials = checkQuantity(d, m.sku, m.quantity, m.serials);
            const ids: string[] = [];
            if (m.source === 'Warehouse') {
              const mv = issueStock(d, { sku: m.sku, warehouse, quantity: m.quantity, serials, technicianName: tech, links: { ticketId: t.id }, note: `Issued for ${t.id}` }, actor, at);
              ids.push(mv.id);
            }
            if (item.tracking === 'Serial') {
              for (const s of serials) {
                const u = unitBySerial(d, s);
                if (!u || u.sku !== m.sku) throw new StockError(`Serial ${s} is not a recorded ${item.name}.`);
                if (u.status !== 'Issued' || u.technicianName !== tech) throw new StockError(`Serial ${s} is not in ${tech}’s stock (${u.status.toLowerCase()}${u.technicianName ? `, with ${u.technicianName}` : ''}). Choose “Issue from warehouse” or correct the serial.`);
                Object.assign(u, { status: 'Installed', connectionId: t.connectionId, customerId: t.customerId, siteId: t.siteId, deployedAt: i.resolvedAt, technicianName: undefined });
                unitEvent(u, actor, at, 'Installed', `At ${t.connectionId ?? t.siteId} for ticket ${t.id}`);
                ids.push(pushMovement(d, { branchId: t.branchId, zoneId: t.zoneId, itemName: item.name, sku: m.sku, quantity: 1, unit: item.unit, type: 'Installation', from: tech, to: t.connectionId ?? t.siteId, ticketId: t.id, customerId: t.customerId, connectionId: t.connectionId, serial: s, serials: [s], technicianName: tech, at, byName: actor.name }).id);
              }
            } else {
              const st = stockOf(d, m.sku, warehouse);
              const held = st?.withTechnician ?? 0;
              if (!st || held < m.quantity) throw new StockError(`Only ${held} ${item.unit} of ${item.name} is recorded as with technicians from ${warehouse}. Choose “Issue from warehouse”.`);
              st.withTechnician = held - m.quantity;
              st.installed = (st.installed ?? 0) + m.quantity;
              ids.push(pushMovement(d, { branchId: t.branchId, zoneId: t.zoneId, itemName: item.name, sku: m.sku, quantity: m.quantity, unit: item.unit, type: 'Installation', from: tech, to: t.connectionId ?? t.siteId, ticketId: t.id, customerId: t.customerId, connectionId: t.connectionId, technicianName: tech, note: `Used on ${t.id}`, at, byName: actor.name }).id);
            }
            used.push({ sku: m.sku, itemName: item.name, quantity: m.quantity, unit: item.unit, serials, source: m.source, warehouse, movementIds: ids });
          }
        } catch (e) {
          if (e instanceof StockError) return fail(e.message);
          throw e;
        }

        t.resolution = {
          description: i.description.trim(), workPerformed: i.workPerformed.trim(), materials: used, resolvedAt: i.resolvedAt, confirmation: i.confirmation,
          confirmedBy: i.confirmedBy.trim() || undefined, confirmationNote: i.confirmationNote.trim() || undefined, byName: actor.name, recordedAt: at
        };
        t.resolvedAt = i.resolvedAt;
        t.status = 'Resolved';
        if (!t.firstResponseAt) Object.assign(t, { firstResponseAt: at, firstResponseByName: actor.name, firstResponseNote: 'Resolved' });
        log(t, 'Resolution', `Resolved ${formatDhaka(i.resolvedAt)} · ${i.confirmation.toLowerCase()}${used.length ? ` · ${used.length} material line${used.length === 1 ? '' : 's'} posted to inventory` : ' · no materials'}`);
        audit('Ticket resolved', `${t.id} · ${i.confirmation}${used.length ? ` · materials ${used.map((u) => `${u.quantity} ${u.unit} ${u.itemName}`).join(', ')}` : ''}`, t);
        return ok(`${t.id} resolved.${i.confirmation === 'Confirmation pending' ? ' Record the customer confirmation before closing.' : ''}`);
      }
    case 'TKT_CONFIRM':{
        if (!mayWork && !canCloseTicket(role)) return fail('Your role cannot update confirmation.');
        if (t.status !== 'Resolved' || !t.resolution) return fail('Only resolved tickets carry a confirmation.');
        if (action.confirmation === 'Confirmed by customer' && action.confirmedBy.trim().length < 3) return fail('Enter who confirmed on the customer side.');
        if (action.confirmation !== 'Confirmed by customer' && action.note.trim().length < MIN_REASON) return fail(`Add a note (at least ${MIN_REASON} characters).`);
        Object.assign(t.resolution, { confirmation: action.confirmation, confirmedBy: action.confirmedBy.trim() || undefined, confirmationNote: action.note.trim() || undefined });
        log(t, 'Confirmation', `${action.confirmation}${action.confirmedBy.trim() ? ` — ${action.confirmedBy.trim()}` : ''}${action.note.trim() ? ` · ${action.note.trim()}` : ''}`);
        audit('Ticket confirmation updated', `${t.id}: ${action.confirmation}`, t);
        return ok(action.confirmation === 'Customer disputes' ? 'Recorded. Reopen the ticket to continue work.' : 'Confirmation recorded.');
      }
    case 'TKT_CLOSE':{
        if (!canCloseTicket(role)) return fail('Only the support desk closes tickets.');
        if (t.status !== 'Resolved' || !t.resolution) return fail('Only resolved tickets can be closed.');
        if (t.resolution.confirmation === 'Confirmation pending') return fail('Record the customer confirmation (or that the customer was unreachable) before closing.');
        if (t.resolution.confirmation === 'Customer disputes') return fail('The customer disputes the fix. Reopen the ticket instead.');
        t.status = 'Closed';
        t.closedAt = at;
        t.closedByName = actor.name;
        const c = d.customers.find((x) => x.id === t.customerId);
        log(t, 'Closed', `Closed · Account Manager ${c ? d.users.find((u) => u.id === c.accountManagerId)?.name ?? '' : ''} notified`);
        audit('Ticket closed', `${t.id} closed · Account Manager notified`, t);
        if (c) notify({ title: `Ticket closed — ${c.name}`, detail: `${t.id} · ${t.subject} · ${t.resolution.confirmation.toLowerCase()}`, branchId: t.branchId, forUserIds: [c.accountManagerId], entity: ref(t.id) });
        return ok(`${t.id} closed. The Account Manager has been notified.`);
      }
    case 'TKT_REOPEN':{
        if (!canReopen(role)) return fail('Your role cannot reopen tickets.');
        if (t.status !== 'Resolved' && t.status !== 'Closed') return fail('Only resolved or closed tickets can be reopened.');
        if (action.reason.trim().length < MIN_REASON) return fail(`Give a reason (at least ${MIN_REASON} characters).`);
        if (t.resolution) t.previousResolutions = [...(t.previousResolutions ?? []), t.resolution];
        Object.assign(t, { resolution: undefined, resolvedAt: undefined, closedAt: undefined, closedByName: undefined, status: t.assigneeName ? 'Assigned' : 'Open', reopenCount: (t.reopenCount ?? 0) + 1 });
        log(t, 'Reopened', `${action.reason.trim()} · original resolution target stands`);
        audit('Ticket reopened', `${t.id}: ${action.reason.trim()}`, t);
        const u = d.users.find((x) => x.name === t.assigneeName);
        notify({ title: `${t.id} reopened`, detail: action.reason.trim(), branchId: t.branchId, requires: u ? undefined : ['assignTickets'], forUserIds: u ? [u.id] : undefined, entity: ref(t.id) });
        return ok(`${t.id} reopened. The original resolution target still applies.`);
      }
  }
  return fail('Unknown action.');
}