import React, { useState } from 'react';
import { branches } from '../../data/branches';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canBackOfficeReview, canSuperviseSurveys, canWorkSurvey, isSurveyor, submissionGaps } from '../../utils/surveyRules';
import type { Survey } from '../../types/records';

/** Next workflow step for the active role, or who the survey is waiting on. */
export function SurveyActions({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  const [when, setWhen] = useState(() => s.scheduledAt ? toLocalInput(s.scheduledAt) : '');
  const technicians = technicianOptions(db, s);
  const [tech, setTech] = useState(() => technicians.find((t) => t.name === s.technicianName)?.key ?? technicians[0]?.key ?? '');

  const bo = canBackOfficeReview(role);
  const sup = canSuperviseSurveys(role);
  const worker = canWorkSurvey(s, user, role);
  const wrap = (children: React.ReactNode, hint?: string) =>
  <div className="rounded-md border border-primary/30 bg-primary-soft px-4 py-3">
      <div className="flex flex-wrap items-end gap-2">{children}</div>
      {hint && <p className="mt-1.5 text-[11px] text-slate-600">{hint}</p>}
    </div>;

  const waiting = (text: string) => <p className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[12px] text-slate-600">{text}</p>;

  switch (s.status) {
    case 'Submitted':
      return bo ?
      wrap(<button type="button" className={primaryBtn} onClick={() => runAction({ type: 'SURVEY_BO_START', surveyId: s.id })}>Start Back Office review</button>, 'Check the site contact, access instructions and requested service before passing it to the technical team.') :
      waiting('Waiting for Back Office to review the request.');
    case 'Back Office Review':
      if (!s.boClearedAt) {
        return bo ?
        wrap(
          <>
                <input aria-label="Review note" className={`${inputClass} min-w-[240px] flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the technical team (optional)" />
                <button type="button" className={primaryBtn} onClick={() => runAction({ type: 'SURVEY_BO_CLEAR', surveyId: s.id, note })}>Clear for technical assignment</button>
              </>
        ) :
        waiting(`Back Office review in progress${s.boReviewerId ? ` (${userName(s.boReviewerId)})` : ''}.`);
      }
      return sup ? assign('Assign technician') : waiting('Cleared by Back Office — waiting for the Technical Supervisor to assign a technician.');
    case 'Assigned':
      return (
        <div className="space-y-2">
          {worker ? schedule('Schedule visit') : waiting(`Assigned to ${s.technicianName} — waiting for a visit date.`)}
          {sup && assign('Reassign')}
        </div>);

    case 'Scheduled':
      return worker ?
      wrap(
        <>
              <button type="button" className={primaryBtn} onClick={() => runAction({ type: 'SURVEY_START', surveyId: s.id })}>Start survey on site</button>
              <span className="text-[12px] text-slate-600">Visit {s.scheduledAt && formatDhaka(s.scheduledAt)}</span>
              <span className="mx-1 hidden h-5 w-px bg-slate-300 sm:block" aria-hidden />
              <input aria-label="New visit time" type="datetime-local" className={`${inputClass} w-auto`} value={when} onChange={(e) => setWhen(e.target.value)} />
              <button type="button" className={secondaryBtn} disabled={!when} onClick={() => runAction({ type: 'SURVEY_SCHEDULE', surveyId: s.id, at: fromLocalInput(when) })}>Reschedule</button>
            </>
      ) :
      waiting(`Visit scheduled ${s.scheduledAt ? formatDhaka(s.scheduledAt) : ''} with ${s.technicianName}.`);
    case 'In Progress':
    case 'Returned':{
        if (!worker) return waiting(`${s.status === 'Returned' ? 'Returned to' : 'On site with'} ${s.technicianName}.`);
        const gaps = submissionGaps(s);
        return wrap(
          <button type="button" className={primaryBtn} disabled={gaps.length > 0} onClick={() => runAction({ type: 'SURVEY_SUBMIT_REVIEW', surveyId: s.id })}>
          {s.status === 'Returned' ? 'Resubmit for technical review' : 'Submit for technical review'}
        </button>,
          gaps.length ? `Save the form first. Still missing: ${gaps.join(', ')}.` : 'Everything required is recorded.'
        );
      }
    case 'Submitted for Technical Review':
      if (!sup) return waiting('Waiting for the Technical Supervisor’s review.');
      if (isSurveyor(s, user)) return waiting('You carried out this survey — another supervisor must review it.');
      return wrap(
        <>
          <input aria-label="Review note" className={`${inputClass} min-w-[240px] flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note (required to return or mark not feasible)" />
          <button type="button" className={primaryBtn} disabled={s.tech?.outcome === 'Not feasible'} onClick={() => runAction({ type: 'SURVEY_DECIDE', surveyId: s.id, decision: 'Approved', note })}>Approve</button>
          <button type="button" className={secondaryBtn} disabled={note.trim().length < 10} onClick={() => runAction({ type: 'SURVEY_DECIDE', surveyId: s.id, decision: 'Returned', note })}>Return</button>
          <button type="button" className={`${secondaryBtn} text-status-critical`} disabled={note.trim().length < 10} onClick={() => runAction({ type: 'SURVEY_DECIDE', surveyId: s.id, decision: 'Not Feasible', note })}>Not feasible</button>
        </>,
        `Technician proposed: ${s.tech?.outcome || '—'}. Check the form, BOM and photos before deciding.`
      );
    case 'Approved':
    case 'Not Feasible':
      return waiting(`${s.status === 'Approved' ? 'Approved' : 'Marked not feasible'} by ${s.reviewedById ? userName(s.reviewedById) : '—'}${s.reviewedAt ? ` · ${formatDhaka(s.reviewedAt)}` : ''}${s.reviewNote ? ` — ${s.reviewNote}` : ''}`);
  }
  return null;

  function assign(label: string) {
    const opt = technicians.find((t) => t.key === tech);
    return wrap(
      <>
        <select aria-label="Technician" className={`${inputClass} w-auto min-w-[240px]`} value={tech} onChange={(e) => setTech(e.target.value)}>
          {technicians.map((t) =>
          <option key={t.key} value={t.key}>
              {t.name} — {t.note}
            </option>
          )}
        </select>
        <button type="button" className={label === 'Reassign' ? secondaryBtn : primaryBtn} disabled={!opt || opt.name === s.technicianName} onClick={() => opt && runAction({ type: 'SURVEY_ASSIGN', surveyId: s.id, technicianName: opt.name, technicianUserId: opt.userId })}>
          {label}
        </button>
      </>,
      label === 'Reassign' ? undefined : 'Technicians without a demo login are worked on by the Technical Supervisor.'
    );
  }

  function schedule(label: string) {
    return wrap(
      <>
        <input aria-label="Visit date and time" type="datetime-local" className={`${inputClass} w-auto`} value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className={primaryBtn} disabled={!when} onClick={() => runAction({ type: 'SURVEY_SCHEDULE', surveyId: s.id, at: fromLocalInput(when) })}>
          {label}
        </button>
      </>,
      'Times are Asia/Dhaka. Agree the slot with the site contact first.'
    );
  }
}

interface TechOption {
  key: string;
  name: string;
  userId?: string;
  note: string;
}

function technicianOptions(db: ReturnType<typeof useData>['db'], s: Survey): TechOption[] {
  const out: TechOption[] = [];
  db.users.
  filter((u) => u.role === 'fieldTechnician' && u.status === 'Active').
  forEach((u) => out.push({ key: u.id, name: u.name, userId: u.id, note: `${branches.find((b) => b.id === u.stationBranchId)?.name ?? ''} · demo login` }));
  branches.
  filter((b) => !b.fieldTeamUserId).
  forEach((b) => out.push({ key: `lead-${b.id}`, name: b.fieldTeamLead, note: `${b.name} field team` }));
  return out.sort((a, b) => Number(noteBranch(b, s)) - Number(noteBranch(a, s)));
}

const noteBranch = (o: TechOption, s: Survey) => o.note.startsWith(branches.find((b) => b.id === s.branchId)?.name ?? '#');

/** datetime-local works in browser time; the demo treats input as Asia/Dhaka (+06:00). */
function fromLocalInput(v: string): string {
  return new Date(`${v}:00+06:00`).toISOString();
}

function toLocalInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 6 * 3600_000);
  return d.toISOString().slice(0, 16);
}