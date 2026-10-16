import { roles } from '../data/roles';
import { formatDhakaDate, fromDhakaInput } from './format';
import { nextId, userName } from './relations';
import {
  canCreateLead,
  canEditOpportunity,
  canManageSales,
  findBlockingConflict,
  findPossibleMatches,
  isActive,
  similarAddress,
  stageById,
  stageLabel,
  stageMoveError,
  stageWithRole } from
'./crmRules';
import { parseAmount, validateLeadDraft, type LeadDraft } from './leadDraft';
import type { BranchId, ModuleId, Permission, Role } from '../types/erp';
import type { CommunicationChannel, ConflictResolution, CrmStage, Tender } from '../types/crm';
import type { DemoDatabase, EntityRef, Opportunity } from '../types/records';
import type { Actor, WorkflowResult } from './workflow';

export type CrmAction =
{type: 'CRM_CREATE_LEAD';draft: LeadDraft;reviewAcknowledged: boolean;} |
{type: 'CRM_LOG_COMMUNICATION';opportunityId: string;channel: CommunicationChannel;summary: string;interest: boolean;} |
{type: 'CRM_ADD_ATTACHMENT';opportunityId: string;name: string;sizeKb: number;} |
{type: 'CRM_MOVE_STAGE';opportunityId: string;toStageId: string;} |
{type: 'CRM_SET_NEXT_ACTION';opportunityId: string;nextAction: string;due: string;} |
{type: 'CRM_CHANGE_DECISION_DATE';opportunityId: string;date: string;reason: string;} |
{type: 'CRM_MARK_LOST';opportunityId: string;category: string;reason: string;} |
{type: 'CRM_MARK_STALLED';opportunityId: string;reason: string;} |
{type: 'CRM_REOPEN';opportunityId: string;reason: string;} |
{type: 'CRM_REASSIGN';opportunityId: string;newOwnerId: string;reason: string;} |
{type: 'CRM_RAISE_ASSIGNMENT_CONFLICT';opportunityId: string;note: string;} |
{type: 'CRM_RESOLVE_CONFLICT';conflictId: string;resolution: ConflictResolution;note: string;mergeIntoId?: string;customerId?: string;} |
{type: 'CRM_SAVE_STAGES';stages: CrmStage[];} |
{type: 'CRM_TOGGLE_TENDER_DOC';tenderId: string;docId: string;} |
{type: 'CRM_UPDATE_TENDER';tenderId: string;winProbability: number;} |
{type: 'CRM_ADD_COMPETITOR';tenderId: string;name: string;note: string;} |
{type: 'CRM_SUBMIT_TENDER';tenderId: string;} |
{type: 'CRM_TENDER_OUTCOME';tenderId: string;outcome: Tender['outcome'];note: string;};

export function isCrmAction(a: {type: string;}): a is CrmAction {
  return a.type.startsWith('CRM_');
}

const DEFAULT_TENDER_DOCS = [
'Trade licence',
'TIN and VAT (BIN) certificates',
'BTRC ISP licence',
'Bank solvency certificate',
'Tender security (pay order)',
'Technical compliance sheet',
'Price schedule'];


const MIN_REASON = 8;

export function applyCrmAction(db: DemoDatabase, action: CrmAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const user = db.users.find((u) => u.id === actor.id);
  const role: Role | undefined = roles.find((r) => r.id === user?.role);
  if (!user || !role || !role.modules.includes('crm')) return fail('Your role doesn’t include Sales CRM.');

  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });
  const audit = (act: string, summary: string, entity: EntityRef, related: EntityRef[] = []) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related });
  const notify = (title: string, detail: string, entity: EntityRef, branchId: BranchId | null, requires?: Permission[], module: ModuleId = 'crm') =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], title, detail, module, branchId, entity, requires });
  const oppRef = (o: Opportunity): EntityRef => ({ type: 'opportunity', id: o.id });

  const getOpp = (id: string) => d.opportunities.find((o) => o.id === id);
  const editable = (o: Opportunity | undefined): o is Opportunity => !!o && canEditOpportunity(o, user, role);

  switch (action.type) {
    case 'CRM_CREATE_LEAD':{
        if (!canCreateLead(role)) return fail('Your role can’t register leads.');
        const dr = action.draft;
        const errors = validateLeadDraft(db, dr, at);
        const first = Object.values(errors)[0];
        if (first) return fail(first);
        if (dr.ownerId !== user.id && !canManageSales(role)) return fail('Only a sales manager can assign a lead to someone else.');

        const matchInput = {
          company: dr.company,
          companyBn: dr.companyBn,
          contactPhone: dr.contactPhone,
          address: dr.address,
          siteAddress: dr.siteAddress,
          serviceType: dr.serviceType,
          customerId: dr.customerId || undefined,
          ownerId: dr.ownerId
        };
        const block = findBlockingConflict(db, matchInput);
        if (block) return fail(`${block.reason} Ask a sales manager to review instead.`);
        const matches = findPossibleMatches(db, matchInput);
        if (matches.length && !action.reviewAcknowledged) return fail('Possible matches found. Review them before creating this lead.');

        const branchId = dr.branchId as BranchId;
        const leadId = nextId(d.leads, 'LD-2026-', 4);
        const oppId = nextId(d.opportunities, 'OP-2026-', 4);
        const comms = dr.firstNote.trim() ?
        [{ id: nextId(d.opportunities.flatMap((o) => o.communications), 'CM-', 3), at, channel: dr.firstNoteChannel, summary: dr.firstNote.trim(), byId: actor.id, interest: dr.interest }] :
        [];
        const source = dr.isTender ? 'Tender' : dr.source;
        d.leads.push({
          id: leadId, company: dr.company.trim(), companyBn: dr.companyBn.trim(), category: dr.category,
          contactName: dr.contactName.trim(), contactDesignation: dr.contactDesignation.trim(), contactPhone: dr.contactPhone.trim(), contactEmail: dr.contactEmail.trim(),
          address: dr.address.trim() || dr.siteAddress.trim(), source, agentId: source === 'Sales Agent' ? dr.agentId : undefined, referral: source === 'Referral' ? dr.referral.trim() : undefined,
          ownerId: dr.ownerId, status: 'New', createdAt: at, branchId, zoneId: dr.zoneId
        });
        const bw = parseAmount(dr.bandwidthMbps);
        d.opportunities.push({
          id: oppId, leadId, customerId: dr.customerId || undefined, expansion: dr.expansion,
          title: `${dr.company.trim()} — ${bw} Mbps ${dr.serviceType.toLowerCase()}`,
          siteName: dr.siteName.trim() || 'Main site', siteAddress: dr.siteAddress.trim(), serviceType: dr.serviceType, bandwidthMbps: bw,
          expectedMrc: parseAmount(dr.expectedMrc), otc: parseAmount(dr.otc), marginPct: 0,
          stage: stageWithRole(d, 'entry').id, status: 'Open', ownerId: dr.ownerId, agentId: source === 'Sales Agent' ? dr.agentId : undefined,
          createdAt: at, expectedDecisionDate: fromDhakaInput(dr.expectedDecisionDate), nextAction: dr.nextAction.trim(), nextActionDue: fromDhakaInput(dr.nextActionDue),
          communications: comms, attachments: [],
          history: [{ at, byId: actor.id, kind: 'Created', detail: dr.expansion === 'New customer' ? `Registered (${source})` : `${dr.expansion} under existing customer ${dr.customerId}` }],
          decisionDateHistory: [],
          branchId, zoneId: dr.zoneId
        });
        const related: EntityRef[] = [{ type: 'lead', id: leadId }];
        if (dr.customerId) related.push({ type: 'customer', id: dr.customerId });

        if (dr.isTender) {
          const tenderId = nextId(d.tenders, 'TD-2026-', 3);
          d.tenders.push({
            id: tenderId, reference: dr.tenderReference.trim(), title: dr.tenderTitle.trim() || `${bw} Mbps ${dr.serviceType}`,
            issuingOrganisation: dr.company.trim(), issuingOrganisationBn: dr.companyBn.trim(), opportunityId: oppId, ownerId: dr.ownerId, branchId, zoneId: dr.zoneId,
            publishedAt: at, clarificationDeadline: fromDhakaInput(dr.clarificationDeadline, '15:00') || fromDhakaInput(dr.submissionDeadline, '12:00'),
            submissionDeadline: fromDhakaInput(dr.submissionDeadline, '12:00'), winProbability: 30, estimatedValue: parseAmount(dr.expectedMrc), competitors: [],
            documents: DEFAULT_TENDER_DOCS.map((name, i) => ({ id: `D${i + 1}`, name, required: true, done: false })),
            submissionStatus: 'Preparing', outcome: 'Pending'
          });
          related.push({ type: 'tender', id: tenderId });
        }

        audit('Lead registered', `${dr.company.trim()} registered by ${actor.name}; owner ${userName(dr.ownerId)}`, { type: 'opportunity', id: oppId }, related);

        if (matches.length) {
          const conflictId = nextId(d.crmConflicts, 'CF-', 4);
          d.crmConflicts.unshift({
            id: conflictId, kind: 'Possible duplicate', opportunityId: oppId, matches: matches.map((m) => m.ref),
            reasons: matches.flatMap((m) => m.reasons), requestedById: actor.id, raisedAt: at, status: 'Open'
          });
          notify('Possible duplicate needs review', `${dr.company.trim()} · ${matches.length} similar record${matches.length === 1 ? '' : 's'}`, { type: 'opportunity', id: oppId }, branchId, ['manageSalesTeam']);
          return ok(`${oppId} created as ${stageLabel(d, stageWithRole(d, 'entry').id)} and flagged for duplicate review. Nothing was merged.`);
        }
        return ok(`${oppId} created as ${stageLabel(d, stageWithRole(d, 'entry').id)}.`);
      }

    case 'CRM_LOG_COMMUNICATION':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can update this opportunity.');
        if (action.summary.trim().length < 3) return fail('Describe the communication.');
        o.communications.push({ id: nextId(d.opportunities.flatMap((x) => x.communications), 'CM-', 3), at, channel: action.channel, summary: action.summary.trim(), byId: actor.id, interest: action.interest });
        const lead = d.leads.find((l) => l.id === o.leadId);
        if (lead && lead.status === 'New' && action.interest) lead.status = 'Qualified';
        audit('Communication logged', `${action.channel}: ${action.summary.trim()}`, oppRef(o));
        return ok('Communication recorded.');
      }

    case 'CRM_ADD_ATTACHMENT':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can add attachments.');
        o.attachments.push({ id: nextId(d.opportunities.flatMap((x) => x.attachments), 'AT-', 3), name: action.name, sizeKb: action.sizeKb, uploadedAt: at, byId: actor.id });
        audit('Attachment added', action.name, oppRef(o));
        return ok(`${action.name} attached.`);
      }

    case 'CRM_MOVE_STAGE':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can move this opportunity.');
        if (o.stage === action.toStageId) return fail('Already at this stage.');
        const err = stageMoveError(d, o, action.toStageId);
        if (err) return fail(err);
        const from = stageLabel(d, o.stage);
        const to = stageLabel(d, action.toStageId);
        o.stage = action.toStageId;
        o.history.push({ at, byId: actor.id, kind: 'Stage', detail: `${from} → ${to}` });
        const lead = d.leads.find((l) => l.id === o.leadId);
        if (lead && lead.status === 'New' && stageById(d, action.toStageId)?.role !== 'entry') lead.status = 'Qualified';
        audit('Stage changed', `${o.id}: ${from} → ${to}`, oppRef(o));
        return ok(`${o.id} moved to ${to}.`);
      }

    case 'CRM_SET_NEXT_ACTION':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can change the next action.');
        if (!action.nextAction.trim() || !action.due) return fail('Enter the next action and its due date.');
        if (action.due < at) return fail('The next action can’t be due in the past.');
        o.nextAction = action.nextAction.trim();
        o.nextActionDue = action.due;
        audit('Next action set', `${o.nextAction} · due ${formatDhakaDate(action.due)}`, oppRef(o));
        return ok('Next action updated.');
      }

    case 'CRM_CHANGE_DECISION_DATE':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can change the decision date.');
        if (!action.date) return fail('Choose a date.');
        if (action.date === o.expectedDecisionDate) return fail('That is already the decision date.');
        const extending = action.date > o.expectedDecisionDate;
        if (extending && action.reason.trim().length < MIN_REASON) return fail('Give a reason for extending the closing date.');
        o.decisionDateHistory.push({ at, byId: actor.id, from: o.expectedDecisionDate, to: action.date, reason: action.reason.trim() || 'Brought forward' });
        o.history.push({ at, byId: actor.id, kind: 'Decision date', detail: `${formatDhakaDate(o.expectedDecisionDate)} → ${formatDhakaDate(action.date)}`, reason: action.reason.trim() || undefined });
        const n = o.decisionDateHistory.filter((c) => c.to > c.from).length;
        audit(extending ? 'Closing date extended' : 'Closing date brought forward', `${o.id}: ${formatDhakaDate(o.expectedDecisionDate)} → ${formatDhakaDate(action.date)}${extending ? ` (extension ${n})` : ''}`, oppRef(o));
        o.expectedDecisionDate = action.date;
        if (extending && n >= 2) notify('Repeated closing-date extension', `${o.title} · extended ${n} times`, oppRef(o), o.branchId, ['manageSalesTeam']);
        return ok(extending && n >= 2 ? `Decision date extended — this is extension ${n}, managers have been notified.` : 'Decision date updated.');
      }

    case 'CRM_MARK_LOST':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can close this opportunity.');
        if (!isActive(o)) return fail('Only open or stalled opportunities can be marked lost.');
        if (action.reason.trim().length < MIN_REASON) return fail('A loss reason is required.');
        const reason = `${action.category} — ${action.reason.trim()}`;
        o.status = 'Lost';
        o.lossReason = reason;
        o.history.push({ at, byId: actor.id, kind: 'Lost', detail: `Marked lost at ${stageLabel(d, o.stage)}`, reason });
        const lead = d.leads.find((l) => l.id === o.leadId);
        if (lead && lead.status !== 'Converted') lead.status = 'Lost';
        audit('Opportunity lost', `${o.id}: ${reason}`, oppRef(o));
        return ok(`${o.id} marked lost.`);
      }

    case 'CRM_MARK_STALLED':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can change this opportunity.');
        if (o.status !== 'Open') return fail('Only open opportunities can be marked stalled.');
        if (action.reason.trim().length < MIN_REASON) return fail('Explain why the opportunity has stalled.');
        o.status = 'Stalled';
        o.stalledReason = action.reason.trim();
        o.history.push({ at, byId: actor.id, kind: 'Stalled', detail: `Stalled at ${stageLabel(d, o.stage)}`, reason: o.stalledReason });
        audit('Opportunity stalled', `${o.id}: ${o.stalledReason}`, oppRef(o));
        return ok(`${o.id} marked stalled.`);
      }

    case 'CRM_REOPEN':{
        const o = getOpp(action.opportunityId);
        if (!editable(o)) return fail('Only the owner or a sales manager can reopen this opportunity.');
        if (o.status !== 'Lost' && o.status !== 'Stalled') return fail('Only lost or stalled opportunities can be reopened.');
        if (action.reason.trim().length < MIN_REASON) return fail('A reason for reopening is required.');
        const was = o.status;
        o.status = 'Open';
        o.history.push({ at, byId: actor.id, kind: 'Reopened', detail: `Reopened from ${was} at ${stageLabel(d, o.stage)}`, reason: action.reason.trim() });
        const lead = d.leads.find((l) => l.id === o.leadId);
        if (lead && lead.status === 'Lost') lead.status = 'Qualified';
        audit('Opportunity reopened', `${o.id} reopened from ${was}: ${action.reason.trim()}`, oppRef(o));
        return ok(`${o.id} reopened.`);
      }

    case 'CRM_REASSIGN':{
        if (!canManageSales(role)) return fail('Only an authorised sales manager can reassign opportunities.');
        const o = getOpp(action.opportunityId);
        if (!o) return fail('Opportunity not found.');
        if (!isActive(o)) return fail('Closed opportunities keep their original owner.');
        const next = d.users.find((u) => u.id === action.newOwnerId && u.status === 'Active');
        if (!next || !roles.find((r) => r.id === next.role)?.permissions.includes('createQuotation')) return fail('Choose an active salesperson.');
        if (next.id === o.ownerId) return fail('This person already owns the opportunity.');
        if (action.reason.trim().length < MIN_REASON) return fail('A reassignment reason is required.');
        const prev = o.ownerId;
        o.ownerId = next.id;
        const lead = d.leads.find((l) => l.id === o.leadId);
        if (lead && lead.ownerId === prev) lead.ownerId = next.id;
        d.tenders.filter((t) => t.opportunityId === o.id && t.ownerId === prev).forEach((t) => t.ownerId = next.id);
        o.history.push({ at, byId: actor.id, kind: 'Reassigned', detail: `${userName(prev)} → ${next.name}`, reason: action.reason.trim() });
        d.ownershipChanges.unshift({ id: nextId(d.ownershipChanges, 'OC-', 4), record: oppRef(o), field: 'Owner', fromUserId: prev, toUserId: next.id, at, byUserId: actor.id });
        audit('Opportunity reassigned', `${o.id}: ${userName(prev)} → ${next.name}. Reason: ${action.reason.trim()}`, oppRef(o), [{ type: 'user', id: next.id }]);
        notify('Opportunity assigned to you', `${o.title} · reassigned by ${actor.name}`, oppRef(o), o.branchId);
        return ok(`${o.id} reassigned to ${next.name}.`);
      }

    case 'CRM_RAISE_ASSIGNMENT_CONFLICT':{
        const o = getOpp(action.opportunityId);
        if (!o) return fail('Opportunity not found.');
        if (o.ownerId === user.id) return fail('You already own this opportunity.');
        if (action.note.trim().length < MIN_REASON) return fail('Explain why you should work this opportunity.');
        if (d.crmConflicts.some((c) => c.status === 'Open' && c.kind === 'Assignment conflict' && c.opportunityId === o.id && c.requestedById === user.id))
        return fail('You already have a review open for this opportunity.');
        const id = nextId(d.crmConflicts, 'CF-', 4);
        d.crmConflicts.unshift({
          id, kind: 'Assignment conflict', opportunityId: o.id, matches: [oppRef(o)],
          reasons: [`${actor.name} asked to work this opportunity, which ${userName(o.ownerId)} already owns`], note: action.note.trim(),
          requestedById: actor.id, raisedAt: at, status: 'Open'
        });
        audit('Assignment conflict raised', `${actor.name} requested ${o.id} (owner ${userName(o.ownerId)})`, oppRef(o));
        notify('Assignment conflict needs review', `${o.title} · requested by ${actor.name}`, oppRef(o), o.branchId, ['manageSalesTeam']);
        return ok('Sent to sales managers for review. The current owner keeps the opportunity until it is resolved.');
      }

    case 'CRM_RESOLVE_CONFLICT':{
        if (!canManageSales(role)) return fail('Only an authorised sales manager can resolve conflicts.');
        const c = d.crmConflicts.find((x) => x.id === action.conflictId);
        if (!c || c.status !== 'Open') return fail('This review is already resolved.');
        if (action.note.trim().length < MIN_REASON) return fail('Record a reason for the decision.');
        const o = getOpp(c.opportunityId);
        if (!o) return fail('Opportunity not found.');

        if (action.resolution === 'Merged') {
          const survivor = getOpp(action.mergeIntoId ?? '');
          if (!survivor || survivor.id === o.id || !c.matches.some((m) => m.type === 'opportunity' && m.id === survivor.id)) return fail('Choose the matching opportunity to merge into.');
          if (!isActive(survivor)) return fail('Merge into an open or stalled opportunity.');
          survivor.communications.push(...o.communications.map((cm) => ({ ...cm, id: `${cm.id}-${o.id.slice(-4)}`, summary: `[from ${o.id}] ${cm.summary}` })));
          survivor.attachments.push(...o.attachments.map((a) => ({ ...a, id: `${a.id}-${o.id.slice(-4)}` })));
          survivor.history.push({ at, byId: actor.id, kind: 'Merged', detail: `${o.id} merged in (owner ${userName(o.ownerId)})`, reason: action.note.trim() });
          o.status = 'Merged';
          o.mergedIntoId = survivor.id;
          o.history.push({ at, byId: actor.id, kind: 'Merged', detail: `Merged into ${survivor.id}; ${userName(survivor.ownerId)} remains owner`, reason: action.note.trim() });
          const lead = d.leads.find((l) => l.id === o.leadId);
          if (lead) lead.status = 'Merged';
          audit('Duplicate merged', `${o.id} merged into ${survivor.id} by manager decision: ${action.note.trim()}`, oppRef(o), [oppRef(survivor)]);
        } else if (action.resolution === 'Linked as additional site/service') {
          const customerId = action.customerId;
          if (!customerId || !d.customers.some((x) => x.id === customerId)) return fail('Choose the existing customer.');
          const block = findBlockingConflict(d, { company: '', contactPhone: '', address: '', siteAddress: o.siteAddress, serviceType: o.serviceType, customerId, ownerId: o.ownerId }, o.id);
          if (block) return fail(`${block.opportunity.id} already covers this service at this site.`);
          o.customerId = customerId;
          o.expansion = d.sites.some((s) => s.customerId === customerId && similarAddress(s.address, o.siteAddress)) ? 'Additional service' : 'Additional site';
          o.history.push({ at, byId: actor.id, kind: 'Linked', detail: `Linked to existing customer ${customerId} as ${o.expansion.toLowerCase()}`, reason: action.note.trim() });
          audit('Linked to existing customer', `${o.id} linked to ${customerId} as ${o.expansion.toLowerCase()}`, oppRef(o), [{ type: 'customer', id: customerId }]);
        } else if (action.resolution === 'Reassigned') {
          if (c.kind !== 'Assignment conflict') return fail('Reassignment applies to assignment conflicts.');
          const next = d.users.find((u) => u.id === c.requestedById && u.status === 'Active');
          if (!next) return fail('The requesting salesperson is no longer active.');
          const prev = o.ownerId;
          o.ownerId = next.id;
          const lead = d.leads.find((l) => l.id === o.leadId);
          if (lead && lead.ownerId === prev) lead.ownerId = next.id;
          o.history.push({ at, byId: actor.id, kind: 'Reassigned', detail: `${userName(prev)} → ${next.name} (conflict ${c.id})`, reason: action.note.trim() });
          d.ownershipChanges.unshift({ id: nextId(d.ownershipChanges, 'OC-', 4), record: oppRef(o), field: 'Owner', fromUserId: prev, toUserId: next.id, at, byUserId: actor.id });
          audit('Opportunity reassigned', `${o.id}: ${userName(prev)} → ${next.name} after conflict review. Reason: ${action.note.trim()}`, oppRef(o));
        } else {
          audit('Conflict resolved', `${c.id} — ${action.resolution}: ${action.note.trim()}`, oppRef(o));
        }

        c.status = 'Resolved';
        c.resolution = action.resolution;
        c.resolutionNote = action.note.trim();
        c.resolvedById = actor.id;
        c.resolvedAt = at;
        notify(`Review ${c.id} resolved`, `${action.resolution} · ${o.title}`, oppRef(o), o.branchId);
        return ok(`${c.id} resolved: ${action.resolution}.`);
      }

    case 'CRM_SAVE_STAGES':{
        if (!canManageSales(role)) return fail('Only an authorised sales manager can configure stages.');
        const stages = action.stages.map((s) => ({ ...s, label: s.label.trim() }));
        if (stages.some((s) => !s.label)) return fail('Every stage needs a name.');
        if (new Set(stages.map((s) => s.label.toLowerCase())).size !== stages.length) return fail('Stage names must be unique.');
        const order = ['entry', 'prospect', 'workOrder', 'won'].map((r) => stages.findIndex((s) => s.role === r));
        if (order.some((i) => i < 0) || order.some((v, i) => i > 0 && v <= order[i - 1])) return fail('System stages must stay in order: entry, prospect, work order, won.');
        if (order[3] !== stages.length - 1) return fail('Closed Won must be the last stage.');
        const removed = d.crmStages.filter((s) => !stages.some((n) => n.id === s.id));
        const inUse = removed.find((s) => d.opportunities.some((o) => o.stage === s.id));
        if (inUse) return fail(`“${inUse.label}” still has opportunities. Move them before removing the stage.`);
        const before = d.crmStages.map((s) => s.label).join(' → ');
        d.crmStages = stages;
        audit('Pipeline stages changed', `${before}  ⟶  ${stages.map((s) => s.label).join(' → ')}`, { type: 'policy', id: 'CRM-STAGES' });
        return ok('Pipeline stages saved.');
      }

    case 'CRM_TOGGLE_TENDER_DOC':
    case 'CRM_UPDATE_TENDER':
    case 'CRM_ADD_COMPETITOR':
    case 'CRM_SUBMIT_TENDER':
    case 'CRM_TENDER_OUTCOME':{
        const t = d.tenders.find((x) => x.id === action.tenderId);
        if (!t) return fail('Tender not found.');
        const o = getOpp(t.opportunityId);
        if (!editable(o)) return fail('Only the tender owner or a sales manager can update this tender.');
        const tRef: EntityRef = { type: 'tender', id: t.id };

        if (action.type === 'CRM_TOGGLE_TENDER_DOC') {
          if (t.submissionStatus !== 'Preparing') return fail('The checklist is locked after submission.');
          const doc = t.documents.find((x) => x.id === action.docId);
          if (!doc) return fail('Document not found.');
          doc.done = !doc.done;
          audit(doc.done ? 'Tender document ready' : 'Tender document reopened', `${t.reference}: ${doc.name}`, tRef, [oppRef(o)]);
          return ok(`${doc.name} ${doc.done ? 'marked ready' : 'marked outstanding'}.`);
        }
        if (action.type === 'CRM_UPDATE_TENDER') {
          const p = Math.round(action.winProbability);
          if (p < 0 || p > 100) return fail('Win probability must be between 0 and 100%.');
          audit('Win probability changed', `${t.reference}: ${t.winProbability}% → ${p}%`, tRef);
          t.winProbability = p;
          return ok('Win probability updated.');
        }
        if (action.type === 'CRM_ADD_COMPETITOR') {
          if (!action.name.trim()) return fail('Enter the competitor name.');
          t.competitors.push({ name: action.name.trim(), note: action.note.trim() });
          audit('Competitor recorded', `${t.reference}: ${action.name.trim()}`, tRef);
          return ok('Competitor added.');
        }
        if (action.type === 'CRM_SUBMIT_TENDER') {
          if (t.submissionStatus !== 'Preparing') return fail('This tender has already been submitted.');
          const missing = t.documents.filter((x) => x.required && !x.done);
          if (missing.length) return fail(`${missing.length} required document${missing.length === 1 ? ' is' : 's are'} outstanding: ${missing.map((x) => x.name).join(', ')}.`);
          if (at > t.submissionDeadline) return fail('The submission deadline has passed.');
          t.submissionStatus = 'Submitted';
          t.submittedAt = at;
          o.history.push({ at, byId: actor.id, kind: 'Stage', detail: `Tender ${t.reference} submitted` });
          audit('Tender submitted', `${t.reference} submitted to ${t.issuingOrganisation}`, tRef, [oppRef(o)]);
          notify('Tender submitted', `${t.reference} · ${t.issuingOrganisation}`, tRef, t.branchId);
          return ok(`${t.reference} submitted.`);
        }
        // Outcome
        if (action.outcome === 'Pending') return fail('Choose an outcome.');
        if (t.outcome !== 'Pending') return fail('The outcome is already recorded.');
        if (action.outcome !== 'Cancelled' && t.submissionStatus !== 'Submitted') return fail('Record an award result only after submission.');
        if (action.outcome !== 'Won' && action.note.trim().length < MIN_REASON) return fail('A reason is required for a lost or cancelled tender.');
        t.outcome = action.outcome;
        t.outcomeNote = action.note.trim() || undefined;
        if (action.outcome === 'Won') {
          t.winProbability = 100;
          o.status = 'Open';
          o.nextAction = 'Prepare contract quotation from the awarded price schedule';
          o.history.push({ at, byId: actor.id, kind: 'Stage', detail: `Tender ${t.reference} awarded`, reason: action.note.trim() || undefined });
        } else {
          t.winProbability = 0;
          if (isActive(o)) {
            o.status = 'Lost';
            o.lossReason = `${action.outcome === 'Lost' ? 'Tender lost' : 'Tender cancelled'} — ${action.note.trim()}`;
            o.history.push({ at, byId: actor.id, kind: 'Lost', detail: `Tender ${t.reference} ${action.outcome.toLowerCase()}`, reason: o.lossReason });
          }
        }
        audit(`Tender ${action.outcome.toLowerCase()}`, `${t.reference}${action.note.trim() ? `: ${action.note.trim()}` : ''}`, tRef, [oppRef(o)]);
        notify(`Tender ${action.outcome.toLowerCase()}`, `${t.reference} · ${t.issuingOrganisation}`, tRef, t.branchId);
        return ok(`${t.reference} recorded as ${action.outcome.toLowerCase()}.`);
      }
  }
}