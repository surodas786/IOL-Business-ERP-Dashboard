import { roles } from '../data/roles';
import { formatDhaka } from './format';
import { nextId, userName } from './relations';
import {
  availableStock,
  canBackOfficeReview,
  canEditCommercial,
  canEditTechnical,
  canRequestSurvey,
  canReserveStock,
  canSuperviseSurveys,
  canWorkSurvey,
  isSurveyor,
  stockFor,
  submissionGaps,
  surveyContext,
  unreserved,
  warehouseFor } from
'./surveyRules';
import type { Permission } from '../types/erp';
import type { DemoDatabase, EntityRef, Survey } from '../types/records';
import type { BomLine, BypassReason, SurveyAttachment, SurveyCommercial, SurveyTechnical } from '../types/survey';
import type { Actor, WorkflowResult } from './workflow';

export interface SurveyRequestDraft {
  opportunityId: string;
  siteLabel: string;
  address: string;
  siteContactName: string;
  siteContactPhone: string;
  accessInstructions: string;
  notes: string;
}

export type SurveyAction =
{type: 'SURVEY_REQUEST';draft: SurveyRequestDraft;} |
{type: 'SURVEY_BO_START';surveyId: string;} |
{type: 'SURVEY_BO_CLEAR';surveyId: string;note: string;} |
{type: 'SURVEY_ASSIGN';surveyId: string;technicianName: string;technicianUserId?: string;} |
{type: 'SURVEY_SCHEDULE';surveyId: string;at: string;} |
{type: 'SURVEY_START';surveyId: string;} |
{type: 'SURVEY_SAVE_TECH';surveyId: string;tech: Partial<SurveyTechnical>;bom: BomLine[];} |
{type: 'SURVEY_ADD_ATTACHMENT';surveyId: string;name: string;kind: SurveyAttachment['kind'];} |
{type: 'SURVEY_SUBMIT_REVIEW';surveyId: string;} |
{type: 'SURVEY_DECIDE';surveyId: string;decision: 'Approved' | 'Returned' | 'Not Feasible';note: string;} |
{type: 'SURVEY_SAVE_COMMERCIAL';surveyId: string;commercial: SurveyCommercial;} |
{type: 'SURVEY_RESERVE';surveyId: string;lineId: string;} |
{type: 'SURVEY_SET_LABEL';key: 'ggc' | 'fnn';value: string;} |
{type: 'SURVEY_REQUEST_BYPASS';opportunityId: string;reason: BypassReason;justification: string;documentRef: string;} |
{type: 'SURVEY_DECIDE_BYPASS';bypassId: string;decision: 'Approved' | 'Rejected';note: string;};

export function isSurveyAction(a: {type: string;}): a is SurveyAction {
  return a.type.startsWith('SURVEY_');
}

export const BYPASS_MIN_JUSTIFICATION = 40;

export function applySurveyAction(db: DemoDatabase, action: SurveyAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const user = db.users.find((u) => u.id === actor.id);
  const role = roles.find((r) => r.id === user?.role);
  if (!user || !role) return fail('Unknown demo user.');
  if (!role.modules.includes('surveys') && action.type !== 'SURVEY_REQUEST_BYPASS') return fail('Your role doesn’t include Surveys and Feasibility.');

  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });
  const ref = (id: string): EntityRef => ({ type: 'survey', id });
  const audit = (act: string, summary: string, entity: EntityRef, related: EntityRef[] = []) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related });
  const notify = (title: string, detail: string, entity: EntityRef, branchId: Survey['branchId'] | null, requires?: Permission[], module: 'surveys' | 'crm' = 'surveys') =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], title, detail, module, branchId, entity, requires });
  const get = (id: string) => d.surveys.find((s) => s.id === id);
  const log = (s: Survey, act: string, note?: string) => {
    s.history = [...(s.history ?? []), { at, byId: user.id, action: act, note }];
  };
  const oppRef = (s: Survey): EntityRef[] => [{ type: 'opportunity', id: s.opportunityId }];

  switch (action.type) {
    case 'SURVEY_REQUEST':{
        if (!canRequestSurvey(role)) return fail('Only Sales and the Business Head can request surveys.');
        const dr = action.draft;
        const opp = d.opportunities.find((o) => o.id === dr.opportunityId);
        if (!opp) return fail('Opportunity not found.');
        if (opp.status !== 'Open') return fail(`This opportunity is ${opp.status.toLowerCase()}. Reopen it before requesting a survey.`);
        if (!dr.address.trim()) return fail('Enter the site address.');
        if (!dr.siteContactName.trim() || !dr.siteContactPhone.trim()) return fail('Add the site contact name and phone.');
        if (!dr.accessInstructions.trim()) return fail('Add access instructions for the survey team.');
        const dup = d.surveys.find((s) => s.opportunityId === opp.id && s.address.trim().toLowerCase() === dr.address.trim().toLowerCase() && s.status !== 'Not Feasible' && s.status !== 'Approved');
        if (dup) return fail(`${dup.id} is already open for this address (${dup.status}).`);
        const id = nextId(d.surveys, 'SV-2026-', 4);
        const existingSite = opp.customerId ? d.sites.find((x) => x.customerId === opp.customerId && x.address.trim().toLowerCase() === dr.address.trim().toLowerCase()) : undefined;
        d.surveys.unshift({
          id, opportunityId: opp.id, customerId: opp.customerId, siteId: existingSite?.id, siteLabel: dr.siteLabel.trim() || opp.siteName, address: dr.address.trim(),
          requestedService: opp.serviceType, requestedBandwidthMbps: opp.bandwidthMbps, siteContactName: dr.siteContactName.trim(), siteContactPhone: dr.siteContactPhone.trim(),
          accessInstructions: dr.accessInstructions.trim(), requestedById: user.id, technicianName: '', status: 'Submitted', requestedAt: at, notes: dr.notes.trim(),
          history: [{ at, byId: user.id, action: 'Submitted' }], branchId: opp.branchId, zoneId: opp.zoneId
        });
        const lead = d.leads.find((l) => l.id === opp.leadId);
        audit('Survey requested', `${id} · ${lead?.company ?? opp.title} · ${dr.address.trim()}`, ref(id), oppRef(d.surveys[0]));
        notify('Survey request submitted', `${id} · ${lead?.company ?? opp.title} · awaiting Back Office review`, ref(id), opp.branchId, ['manageWorkOrders']);
        return ok(`${id} submitted. Back Office will review it before a technician is assigned.`);
      }

    case 'SURVEY_BO_START':
    case 'SURVEY_BO_CLEAR':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canBackOfficeReview(role)) return fail('Only Back Office reviews survey requests.');
        if (action.type === 'SURVEY_BO_START') {
          if (s.status !== 'Submitted') return fail('Only submitted requests can be taken into review.');
          s.status = 'Back Office Review';
          s.boReviewerId = user.id;
          log(s, 'Back Office review started');
          audit('Back Office review started', `${s.id} · ${surveyContext(d, s).name}`, ref(s.id), oppRef(s));
          return ok('Request taken into Back Office review.');
        }
        if (s.status !== 'Back Office Review') return fail('Start the Back Office review first.');
        if (s.boClearedAt) return fail('Already cleared for assignment.');
        s.boClearedAt = at;
        s.boNote = action.note.trim() || undefined;
        log(s, 'Cleared for technical assignment', s.boNote);
        audit('Survey cleared by Back Office', `${s.id} · ${surveyContext(d, s).name}${s.boNote ? ` — ${s.boNote}` : ''}`, ref(s.id), oppRef(s));
        notify('Survey ready for assignment', `${s.id} · ${surveyContext(d, s).name}`, ref(s.id), s.branchId, ['assignTickets']);
        return ok('Cleared. The Technical Supervisor can now assign a technician.');
      }

    case 'SURVEY_ASSIGN':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canSuperviseSurveys(role)) return fail('Only the Technical Supervisor assigns survey technicians.');
        if (!(s.status === 'Back Office Review' && s.boClearedAt) && s.status !== 'Assigned') return fail('Back Office must clear the request before assignment.');
        if (!action.technicianName.trim()) return fail('Choose a technician.');
        const re = s.status === 'Assigned';
        s.status = 'Assigned';
        s.technicianName = action.technicianName.trim();
        s.technicianUserId = action.technicianUserId;
        s.assignedAt = at;
        log(s, re ? 'Reassigned' : 'Assigned', s.technicianName);
        audit(re ? 'Survey reassigned' : 'Survey assigned', `${s.id} → ${s.technicianName}`, ref(s.id), oppRef(s));
        notify('Survey assigned to you', `${s.id} · ${surveyContext(d, s).name} · ${s.address}`, ref(s.id), s.branchId, ['technicalConfig']);
        return ok(`${s.id} assigned to ${s.technicianName}.`);
      }

    case 'SURVEY_SCHEDULE':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canWorkSurvey(s, user, role)) return fail('Only the assigned technician or the Technical Supervisor can schedule this survey.');
        if (s.status !== 'Assigned' && s.status !== 'Scheduled') return fail('Only assigned surveys can be scheduled.');
        const when = new Date(action.at);
        if (Number.isNaN(when.getTime())) return fail('Choose a valid date and time.');
        if (when.getTime() < new Date(at).getTime() - 60_000) return fail('The visit can’t be scheduled in the past.');
        const re = s.status === 'Scheduled';
        s.status = 'Scheduled';
        s.scheduledAt = when.toISOString();
        log(s, re ? 'Rescheduled' : 'Scheduled', formatDhaka(s.scheduledAt));
        audit(re ? 'Survey rescheduled' : 'Survey scheduled', `${s.id} · ${formatDhaka(s.scheduledAt)}`, ref(s.id), oppRef(s));
        notify(`Survey ${re ? 'rescheduled' : 'scheduled'}`, `${s.id} · ${surveyContext(d, s).name} · ${formatDhaka(s.scheduledAt)}`, ref(s.id), s.branchId, ['viewPipeline'], 'crm');
        return ok(`Visit ${re ? 'rescheduled' : 'scheduled'} for ${formatDhaka(s.scheduledAt)}.`);
      }

    case 'SURVEY_START':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canWorkSurvey(s, user, role)) return fail('Only the assigned technician or the Technical Supervisor can start this survey.');
        if (s.status !== 'Scheduled') return fail('Schedule the visit first.');
        s.status = 'In Progress';
        s.startedAt = at;
        log(s, 'Started on site');
        audit('Survey started', `${s.id} · ${s.technicianName} on site`, ref(s.id), oppRef(s));
        return ok('Survey started. Fill in the technical form and BOM, then submit for review.');
      }

    case 'SURVEY_SAVE_TECH':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canEditTechnical(s, user, role)) return fail(s.status === 'In Progress' || s.status === 'Returned' ? 'Only the assigned technician or the Technical Supervisor can edit this form.' : `The technical form is locked while the survey is ${s.status}.`);
        const bad = action.bom.find((l) => !l.item.trim() || !(l.quantity > 0) || l.unitCost < 0);
        if (bad) return fail('Every BOM line needs an item, a quantity above zero and a non-negative unit cost.');
        // The estimate never touches stock — reservations stay as they were.
        s.tech = { ...s.tech, ...action.tech };
        s.bom = action.bom.map((l) => ({ ...l, reservedQty: s.bom?.find((x) => x.id === l.id)?.reservedQty ?? 0 }));
        const dist = Number(action.tech.popDistanceM);
        if (Number.isFinite(dist) && dist > 0) s.fibreDistanceM = dist;
        audit('Survey form saved', `${s.id} · ${s.bom.length} BOM line(s) · estimate only, stock unchanged`, ref(s.id), oppRef(s));
        return ok('Saved. The BOM is an estimate — physical stock is unchanged.');
      }

    case 'SURVEY_ADD_ATTACHMENT':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canWorkSurvey(s, user, role) || s.status !== 'In Progress' && s.status !== 'Returned') return fail('Attachments are added by the technician while the survey is in progress.');
        const all = d.surveys.flatMap((x) => x.attachments ?? []);
        s.attachments = [...(s.attachments ?? []), { id: nextId(all, 'SA-', 4), name: action.name, kind: action.kind, at, byId: user.id }];
        audit(`${action.kind} attached`, `${action.name} on ${s.id}`, ref(s.id));
        return ok(`${action.kind} attached.`);
      }

    case 'SURVEY_SUBMIT_REVIEW':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canEditTechnical(s, user, role)) return fail('Only the assigned technician or the Technical Supervisor can submit this survey.');
        const gaps = submissionGaps(s);
        if (gaps.length) return fail(`Still missing: ${gaps.slice(0, 4).join(', ')}${gaps.length > 4 ? ` and ${gaps.length - 4} more` : ''}.`);
        const re = s.status === 'Returned';
        s.status = 'Submitted for Technical Review';
        s.completedAt = at;
        log(s, re ? 'Resubmitted for technical review' : 'Submitted for technical review');
        audit(re ? 'Survey resubmitted' : 'Survey submitted for review', `${s.id} · proposed outcome ${s.tech?.outcome}`, ref(s.id), oppRef(s));
        notify('Survey awaiting technical review', `${s.id} · ${surveyContext(d, s).name} · by ${s.technicianName}`, ref(s.id), s.branchId, ['assignTickets']);
        return ok('Submitted for technical review.');
      }

    case 'SURVEY_DECIDE':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canSuperviseSurveys(role)) return fail('Only the Technical Supervisor reviews surveys.');
        if (s.status !== 'Submitted for Technical Review') return fail('This survey isn’t awaiting technical review.');
        if (isSurveyor(s, user)) return fail('You can’t review a survey you carried out.');
        if (action.decision !== 'Approved' && action.note.trim().length < 10) return fail(`Give a reason (10+ characters) to ${action.decision === 'Returned' ? 'return' : 'mark not feasible'}.`);
        if (action.decision === 'Approved' && s.tech?.outcome === 'Not feasible') return fail('The technician proposed “Not feasible”. Mark it Not Feasible or return it for correction.');
        s.status = action.decision;
        s.reviewedById = user.id;
        s.reviewedAt = at;
        s.reviewNote = action.note.trim() || undefined;
        if (action.decision === 'Approved') s.result = 'Feasible';
        if (action.decision === 'Not Feasible') s.result = 'Not Feasible';
        log(s, action.decision, s.reviewNote);
        const name = surveyContext(d, s).name;
        audit(`Survey ${action.decision.toLowerCase()}`, `${s.id} · ${name}${s.reviewNote ? ` — ${s.reviewNote}` : ''}`, ref(s.id), oppRef(s));
        if (action.decision === 'Returned') {
          notify('Survey returned for correction', `${s.id} · ${name} · ${s.reviewNote}`, ref(s.id), s.branchId, ['technicalConfig']);
        } else {
          notify(`Survey ${action.decision === 'Approved' ? 'approved — feasible' : 'not feasible'}`, `${s.id} · ${name}`, ref(s.id), s.branchId, ['viewPipeline'], 'crm');
          if (action.decision === 'Approved' && (s.bom ?? []).some((l) => l.sku)) notify('Approved survey BOM ready for reservation', `${s.id} · ${name} · ${warehouseFor(s)}`, ref(s.id), s.branchId, ['manageStock']);
        }
        return ok(action.decision === 'Approved' ? 'Survey approved. Inventory can now reserve stock against the BOM.' : action.decision === 'Returned' ? 'Returned to the technician.' : 'Marked not feasible. Sales has been notified.');
      }

    case 'SURVEY_SAVE_COMMERCIAL':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canEditCommercial(role)) return fail('Only Sales and the Business Head can edit cost analysis inputs.');
        const c = action.commercial;
        if (Object.values(c).some((v) => typeof v === 'number' && (v < 0 || !Number.isFinite(v)))) return fail('Values can’t be negative.');
        if (c.agentRecurringPct > 50) return fail('Recurring agent commission above 50% looks wrong — check the percentage.');
        if (c.otcWaiver > c.otc) return fail('The OTC waiver can’t exceed the OTC.');
        s.commercial = { ...c, updatedById: user.id, updatedAt: at };
        audit('Cost analysis updated', `${s.id} · ${surveyContext(d, s).name}`, ref(s.id), oppRef(s));
        return ok('Cost analysis inputs saved.');
      }

    case 'SURVEY_RESERVE':{
        const s = get(action.surveyId);
        if (!s) return fail('Survey not found.');
        if (!canReserveStock(role)) return fail('Only Inventory reserves stock.');
        if (s.status !== 'Approved') return fail('Stock can be reserved only against an approved survey.');
        const l = s.bom?.find((x) => x.id === action.lineId);
        if (!l || !l.sku) return fail('This line isn’t a stock item.');
        if (l.supply !== 'IOL stock') return fail(`${l.item} is supplied by ${l.supply}, not from IOL stock.`);
        const st = stockFor(d, l.sku, warehouseFor(s));
        if (!st) return fail(`${l.item} isn’t stocked at ${warehouseFor(s)}.`);
        const need = unreserved(d, s, l);
        if (need <= 0) return fail('Already fully reserved or issued.');
        const qty = Math.min(need, availableStock(st));
        if (qty <= 0) return fail(`No ${l.item} available at ${st.warehouse}. Raise a transfer or purchase.`);
        st.reserved += qty;
        l.reservedQty += qty;
        audit('Stock reserved', `${qty} ${l.unit} ${l.item} at ${st.warehouse} for ${s.id} — on-hand unchanged (${st.onHand})`, ref(s.id), oppRef(s));
        return ok(qty < need ? `Reserved ${qty} of ${need} ${l.unit}. The rest isn’t available at ${st.warehouse}.` : `Reserved ${qty} ${l.unit}. On-hand stock is unchanged until issue.`);
      }

    case 'SURVEY_SET_LABEL':{
        if (!canSuperviseSurveys(role)) return fail('Only the Technical Supervisor can edit survey component labels.');
        const p = d.policies.find((x) => x.id === (action.key === 'ggc' ? 'LBL-GGC' : 'LBL-FNN'));
        if (!p) return fail('Label setting not found.');
        if (action.value.trim().length < 2) return fail('Enter a label.');
        const from = p.value;
        p.value = action.value.trim();
        p.status = 'Awaiting IOL confirmation';
        audit('Survey label changed', `${p.name}: “${from}” → “${p.value}” (awaiting IOL confirmation)`, { type: 'policy', id: p.id });
        return ok('Label updated. It stays marked as awaiting IOL confirmation.');
      }

    case 'SURVEY_REQUEST_BYPASS':{
        if (!canRequestSurvey(role)) return fail('Only Sales and the Business Head can request a survey bypass.');
        const opp = d.opportunities.find((o) => o.id === action.opportunityId);
        if (!opp || opp.status !== 'Open') return fail('Bypass can be requested only on an open opportunity.');
        if (action.justification.trim().length < BYPASS_MIN_JUSTIFICATION) return fail(`Document the justification (at least ${BYPASS_MIN_JUSTIFICATION} characters).`);
        if (action.documentRef.trim().length < 4) return fail('Reference the supporting document (e.g. an earlier survey ID or letter).');
        if (d.surveyBypasses.some((b) => b.opportunityId === opp.id && b.status !== 'Rejected')) return fail('A bypass is already pending or approved for this opportunity.');
        const id = nextId(d.surveyBypasses, 'SB-2026-', 3);
        d.surveyBypasses.unshift({ id, opportunityId: opp.id, reason: action.reason, justification: action.justification.trim(), documentRef: action.documentRef.trim(), requestedById: user.id, requestedAt: at, status: 'Pending', branchId: opp.branchId, zoneId: opp.zoneId });
        audit('Survey bypass requested', `${id} · ${opp.title} · ${action.reason}`, { type: 'opportunity', id: opp.id });
        notify('Survey bypass awaiting approval', `${opp.title} · ${action.reason}`, { type: 'opportunity', id: opp.id }, opp.branchId, ['assignTickets']);
        return ok(`${id} sent to the Technical Supervisor. No survey is skipped until it is approved.`);
      }

    case 'SURVEY_DECIDE_BYPASS':{
        const b = d.surveyBypasses.find((x) => x.id === action.bypassId);
        if (!b || b.status !== 'Pending') return fail('This bypass request has already been decided.');
        if (!canSuperviseSurveys(role)) return fail('Only the Technical Supervisor approves survey bypasses.');
        if (b.requestedById === user.id) return fail('You can’t approve your own bypass request.');
        if (b.returned) return fail('This bypass request was returned to the requester. Wait for it to be resubmitted.');
        if (action.note.trim().length < 10) return fail('A comment of at least 10 characters is required for every decision.');
        b.status = action.decision;
        b.decidedById = user.id;
        b.decidedAt = at;
        b.decisionNote = action.note.trim() || undefined;
        const opp = d.opportunities.find((o) => o.id === b.opportunityId);
        audit(`Survey bypass ${action.decision.toLowerCase()}`, `${b.id} · ${opp?.title ?? b.opportunityId}${b.decisionNote ? ` — ${b.decisionNote}` : ''}`, { type: 'opportunity', id: b.opportunityId });
        notify(`Survey bypass ${action.decision.toLowerCase()}`, `${opp?.title ?? b.opportunityId} · requested by ${userName(b.requestedById)}`, { type: 'opportunity', id: b.opportunityId }, b.branchId, ['viewPipeline'], 'crm');
        return ok(action.decision === 'Approved' ? 'Bypass approved and documented on the opportunity.' : 'Bypass rejected — a survey is required.');
      }
  }
}