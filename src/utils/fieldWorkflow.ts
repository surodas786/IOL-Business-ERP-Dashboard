import { roles } from '../data/roles';
import { formatBDT, formatDhaka, fromDhakaInput } from './format';
import { nextId, recordName, userName } from './relations';
import {
  canAdjustClaim,
  canDecideClaim,
  canLogVisits,
  canPayClaim,
  claimTotal,
  expenseApproverIsManager,
  isEditable,
  openClaimFor,
  parseTaka,
  receiptProblem,
  validateExpenseLine,
  validateVisit,
  type ExpenseLineDraft,
  type VisitDraft } from
'./fieldRules';
import type { BranchId, ModuleId, Permission } from '../types/erp';
import type { DemoDatabase, EntityRef } from '../types/records';
import type { ExpenseClaim, ExpenseLine, FileRef } from '../types/field';
import type { Actor, WorkflowResult } from './workflow';

export type FieldAction =
{type: 'FIELD_LOG_VISIT';draft: VisitDraft;expenses: ExpenseLineDraft[];} |
{type: 'FIELD_ADD_EXPENSE';line: ExpenseLineDraft;} |
{type: 'FIELD_REMOVE_EXPENSE';claimId: string;lineId: string;} |
{type: 'FIELD_ATTACH_RECEIPT';claimId: string;lineId: string;file: FileRef;} |
{type: 'FIELD_SUBMIT_CLAIM';claimId: string;} |
{type: 'FIELD_DECIDE_CLAIM';claimId: string;decision: 'Approved' | 'Returned' | 'Rejected';note: string;} |
{type: 'FIELD_PAY_CLAIM';claimId: string;reference: string;} |
{type: 'FIELD_ADJUST_CLAIM';claimId: string;amount: number;reason: string;} |
{type: 'FIELD_COMPLETE_FOLLOWUP';visitId: string;note: string;};

export function isFieldAction(a: {type: string;}): a is FieldAction {
  return a.type.startsWith('FIELD_');
}

export function applyFieldAction(db: DemoDatabase, action: FieldAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const user = db.users.find((u) => u.id === actor.id);
  const role = roles.find((r) => r.id === user?.role);
  if (!user || !role || !role.modules.includes('field')) return fail('Your role doesn’t include Field Activities.');

  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });
  const audit = (act: string, summary: string, entity: EntityRef, related: EntityRef[] = []) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related });
  const notify = (title: string, detail: string, entity: EntityRef, branchId: BranchId | null, requires?: Permission[], module: ModuleId = 'field') =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], title, detail, module, branchId, entity, requires });
  const claimRef = (c: ExpenseClaim): EntityRef => ({ type: 'expenseClaim', id: c.id });
  const allLines = () => d.expenseClaims.flatMap((c) => c.lines);
  const home = { branchId: (user.branch ?? user.stationBranchId) as BranchId };

  /** Puts lines into the claimant's open claim, creating a draft when needed. */
  const addLines = (drafts: ExpenseLineDraft[], visitId?: string): ExpenseClaim => {
    let claim = openClaimFor(d, user.id);
    if (!claim) {
      claim = { id: nextId(d.expenseClaims, 'EX-2026-', 4), claimantId: user.id, lines: [], status: 'Draft', history: [], adjustments: [], createdAt: at, branchId: home.branchId, zoneId: '' };
      d.expenseClaims.unshift(claim);
    }
    drafts.forEach((l) => {
      const line: ExpenseLine = {
        id: nextId(allLines(), 'EL-', 4), date: l.date, category: l.category, amount: parseTaka(l.amount), purpose: l.purpose.trim(), relation: l.relation,
        subject: l.subject, visitId: visitId ?? l.visitId, receipt: l.receipt, noReceiptReason: l.receipt ? undefined : l.noReceiptReason.trim() || undefined
      };
      claim!.lines.push(line);
    });
    return claim;
  };

  const getClaim = (id: string) => d.expenseClaims.find((c) => c.id === id);

  switch (action.type) {
    case 'FIELD_LOG_VISIT':{
        if (!canLogVisits(role)) return fail('Your role doesn’t log field visits.');
        const dr = action.draft;
        const first = Object.values(validateVisit(dr))[0];
        if (first) return fail(first);
        for (const l of action.expenses) {
          const err = Object.values(validateExpenseLine(l))[0];
          if (err) return fail(`Expense: ${err}`);
        }
        const subject: EntityRef = { type: dr.subjectType, id: dr.subjectId };
        const rec = (dr.subjectType === 'lead' ? d.leads.find((l) => l.id === dr.subjectId) : d.customers.find((c) => c.id === dr.subjectId)) as {branchId: BranchId;zoneId: string;} | undefined;
        if (!rec) return fail('Linked record not found.');
        const id = nextId(d.fieldVisits, 'VS-2026-', 4);
        const visitAt = fromDhakaInput(dr.at);
        const claim = action.expenses.length ? addLines(action.expenses.map((l) => ({ ...l, subject: l.subject ?? subject })), id) : undefined;
        if (claim && !claim.zoneId) claim.zoneId = rec.zoneId;
        d.fieldVisits.unshift({
          id, userId: user.id, at: visitAt, durationMin: Number(dr.durationMin), subject, location: dr.location.trim(), purpose: dr.purpose, peopleMet: dr.peopleMet.trim(),
          outcome: dr.outcome, notes: dr.notes.trim(), nextAction: dr.nextAction.trim(), nextActionDue: dr.nextActionDue ? fromDhakaInput(dr.nextActionDue) : '',
          attachments: dr.attachments, photos: dr.photos, geo: dr.geo, claimId: claim?.id, createdAt: at, branchId: rec.branchId, zoneId: rec.zoneId
        });

        // Connected record: the visit becomes a communication on the lead's open opportunity.
        const related: EntityRef[] = [subject];
        if (dr.subjectType === 'lead') {
          const opp = d.opportunities.find((o) => o.leadId === dr.subjectId && (o.status === 'Open' || o.status === 'Stalled'));
          if (opp) {
            opp.communications.push({
              id: nextId(d.opportunities.flatMap((o) => o.communications), 'CM-', 3), at: visitAt, channel: 'Visit',
              summary: `${dr.purpose} with ${dr.peopleMet.trim()} — ${dr.outcome}. ${dr.notes.trim()}`, byId: user.id, interest: dr.outcome === 'Positive'
            });
            related.push({ type: 'opportunity', id: opp.id });
          }
        }
        if (claim) related.push(claimRef(claim));
        audit('Visit logged', `${recordName(d, subject)} · ${dr.purpose} · ${dr.outcome}${claim ? ` · ${action.expenses.length} expense line(s) added to ${claim.id}` : ''}`, { type: 'fieldVisit', id }, related);
        return ok(claim ? `Visit ${id} logged. Expenses added to draft claim ${claim.id}.` : `Visit ${id} logged.`);
      }

    case 'FIELD_ADD_EXPENSE':{
        if (!canLogVisits(role)) return fail('Your role doesn’t claim field expenses.');
        const err = Object.values(validateExpenseLine(action.line))[0];
        if (err) return fail(err);
        const claim = addLines([action.line]);
        const sub = action.line.subject;
        if (!claim.zoneId && sub) claim.zoneId = ((sub.type === 'lead' ? d.leads : d.customers).find((r) => r.id === sub.id) as {zoneId?: string;} | undefined)?.zoneId ?? '';
        audit('Expense added', `${action.line.category} ${formatBDT(parseTaka(action.line.amount))} — ${action.line.purpose.trim()}`, claimRef(claim));
        return ok(`Added to ${claim.status === 'Returned' ? 'returned' : 'draft'} claim ${claim.id}. Submit it when ready.`);
      }

    case 'FIELD_REMOVE_EXPENSE':
    case 'FIELD_ATTACH_RECEIPT':{
        const c = getClaim(action.claimId);
        if (!c) return fail('Claim not found.');
        if (c.claimantId !== user.id) return fail('Only the claimant can change claim lines.');
        if (!isEditable(c)) return fail(`${c.status} claims are locked. Corrections need a return or an authorised adjustment.`);
        const line = c.lines.find((l) => l.id === action.lineId);
        if (!line) return fail('Line not found.');
        if (action.type === 'FIELD_REMOVE_EXPENSE') {
          c.lines = c.lines.filter((l) => l.id !== line.id);
          audit('Expense removed', `${line.category} ${formatBDT(line.amount)} removed from ${c.id}`, claimRef(c));
          return ok('Line removed.');
        }
        line.receipt = action.file;
        line.noReceiptReason = undefined;
        audit('Receipt attached', `${action.file.name} on ${c.id} (${line.category} ${formatBDT(line.amount)})`, claimRef(c));
        return ok('Receipt attached.');
      }

    case 'FIELD_SUBMIT_CLAIM':{
        const c = getClaim(action.claimId);
        if (!c) return fail('Claim not found.');
        if (c.claimantId !== user.id) return fail('Only the claimant can submit this claim.');
        if (!isEditable(c)) return fail('This claim has already been submitted.');
        if (!c.lines.length) return fail('Add at least one expense line.');
        const bad = c.lines.find((l) => receiptProblem(l));
        if (bad) return fail(`${bad.category} ${formatBDT(bad.amount)}: ${receiptProblem(bad)}`);
        const resubmit = c.status === 'Returned';
        c.status = 'Submitted';
        c.submittedAt = at;
        c.decidedById = undefined;
        c.decidedAt = undefined;
        c.history.push({ at, byId: user.id, action: resubmit ? 'Resubmitted' : 'Submitted' });
        const managerId = user.managerId;
        audit(resubmit ? 'Claim resubmitted' : 'Claim submitted', `${c.id} · ${formatBDT(claimTotal(c))} · ${c.lines.length} line(s)`, claimRef(c));
        const lineManagerApproves = expenseApproverIsManager(d, user.id);
        notify(
          `Expense claim ${resubmit ? 'resubmitted' : 'submitted'}`,
          `${user.name} · ${formatBDT(claimTotal(c))} · awaiting ${lineManagerApproves && managerId ? userName(managerId) : 'Finance Approver'}`,
          claimRef(c),
          c.branchId,
          [lineManagerApproves ? 'approveExpense' : 'approveFinancial']
        );
        return ok(`${c.id} ${resubmit ? 'resubmitted' : 'submitted'} for approval.`);
      }

    case 'FIELD_DECIDE_CLAIM':{
        const c = getClaim(action.claimId);
        if (!c) return fail('Claim not found.');
        const blocked = canDecideClaim(c, user, role, d);
        if (blocked) return fail(blocked);
        if (action.note.trim().length < 10) return fail(`A comment of at least 10 characters is required to ${action.decision === 'Approved' ? 'approve' : action.decision === 'Returned' ? 'return' : 'reject'} a claim.`);
        c.status = action.decision;
        c.decidedById = user.id;
        c.decidedAt = at;
        c.history.push({ at, byId: user.id, action: action.decision, note: action.note.trim() || undefined });
        audit(`Claim ${action.decision.toLowerCase()}`, `${c.id} · ${userName(c.claimantId)} · ${formatBDT(claimTotal(c))}${action.note.trim() ? ` — ${action.note.trim()}` : ''}`, claimRef(c));
        notify(`${userName(c.claimantId)}’s expense claim was ${action.decision.toLowerCase()}`, `${c.id} · ${formatBDT(claimTotal(c))}${action.note.trim() ? ` · ${action.note.trim()}` : ''}`, claimRef(c), c.branchId);
        if (action.decision === 'Approved') notify('Expense claim ready for payment', `${c.id} · ${userName(c.claimantId)} · ${formatBDT(claimTotal(c))}`, claimRef(c), null, ['payExpense']);
        return ok(action.decision === 'Approved' ? `${c.id} approved and locked. Accounts can now pay it.` : `${c.id} ${action.decision.toLowerCase()}.`);
      }

    case 'FIELD_PAY_CLAIM':{
        const c = getClaim(action.claimId);
        if (!c) return fail('Claim not found.');
        const blocked = canPayClaim(c, user, role);
        if (blocked) return fail(blocked);
        if (action.reference.trim().length < 4) return fail('Enter the payment reference.');
        c.status = 'Paid';
        c.paidAt = at;
        c.paymentRef = action.reference.trim();
        c.history.push({ at, byId: user.id, action: 'Paid', note: c.paymentRef });
        audit('Claim paid', `${c.id} · ${formatBDT(claimTotal(c))} to ${userName(c.claimantId)} · ${c.paymentRef}`, claimRef(c));
        notify('Expense claim paid', `${c.id} · ${formatBDT(claimTotal(c))} · ${c.paymentRef}`, claimRef(c), c.branchId);
        return ok(`${c.id} marked paid.`);
      }

    case 'FIELD_ADJUST_CLAIM':{
        const c = getClaim(action.claimId);
        if (!c) return fail('Claim not found.');
        const blocked = canAdjustClaim(c, user, role);
        if (blocked) return fail(blocked);
        if (!action.amount) return fail('Enter a non-zero adjustment.');
        if (claimTotal(c) + action.amount < 0) return fail('The adjustment can’t make the claim negative.');
        if (action.reason.trim().length < 8) return fail('An adjustment needs a reason.');
        const before = claimTotal(c);
        c.adjustments.push({ id: nextId(d.expenseClaims.flatMap((x) => x.adjustments), 'AJ-', 3), at, byId: user.id, amount: action.amount, reason: action.reason.trim() });
        c.history.push({ at, byId: user.id, action: 'Adjusted', note: `${action.amount > 0 ? '+' : ''}${formatBDT(action.amount)} — ${action.reason.trim()}` });
        audit('Claim adjusted', `${c.id}: ${formatBDT(before)} → ${formatBDT(claimTotal(c))}. ${action.reason.trim()}`, claimRef(c));
        notify(`${userName(c.claimantId)}’s approved claim was adjusted`, `${c.id} · now ${formatBDT(claimTotal(c))} · ${action.reason.trim()}`, claimRef(c), c.branchId);
        return ok(`Adjustment recorded. ${c.id} is now ${formatBDT(claimTotal(c))}.`);
      }

    case 'FIELD_COMPLETE_FOLLOWUP':{
        const v = d.fieldVisits.find((x) => x.id === action.visitId);
        if (!v) return fail('Visit not found.');
        if (v.userId !== user.id) return fail('Only the person who made the visit can close its follow-up.');
        if (v.followUpDoneAt) return fail('Already done.');
        if (action.note.trim().length < 3) return fail('Add a short note on what was done.');
        v.followUpDoneAt = at;
        v.followUpNote = action.note.trim();
        audit('Follow-up done', `${v.nextAction} — ${action.note.trim()} (was due ${formatDhaka(v.nextActionDue)})`, { type: 'fieldVisit', id: v.id }, [v.subject]);
        return ok('Follow-up marked done.');
      }
  }
}