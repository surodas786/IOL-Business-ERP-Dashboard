import React, { useState } from 'react';
import { roles } from '../../data/roles';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { salesOwners } from '../../utils/crmRules';
import { dhakaInputValue, formatDhakaDate, fromDhakaInput } from '../../utils/format';
import { userName } from '../../utils/relations';
import { FormField, inputClass } from '../admin/FormField';
import { CrmDialog } from './CrmDialog';
import { COMMUNICATION_CHANNELS, LOSS_REASONS, type CommunicationChannel } from '../../types/crm';
import type { Opportunity } from '../../types/records';

export type OpportunityDialogMode = 'communication' | 'nextAction' | 'decisionDate' | 'lost' | 'stalled' | 'reopen' | 'reassign' | 'requestAssignment' | 'attachment';

interface OpportunityActionDialogProps {
  mode: OpportunityDialogMode;
  opportunity: Opportunity;
  onClose: () => void;
}

const TITLES: Record<OpportunityDialogMode, string> = {
  communication: 'Log communication',
  nextAction: 'Set next action',
  decisionDate: 'Change expected decision date',
  lost: 'Mark as lost',
  stalled: 'Mark as stalled',
  reopen: 'Reopen opportunity',
  reassign: 'Reassign sales owner',
  requestAssignment: 'Ask to work this opportunity',
  attachment: 'Add attachment'
};

const textarea = `${inputClass} h-auto py-2 leading-relaxed`;

/** Every opportunity-level change that needs input or a reason. */
export function OpportunityActionDialog({ mode, opportunity: o, onClose }: OpportunityActionDialogProps) {
  const { db } = useData();
  const runAction = useRunAction();

  const [channel, setChannel] = useState<CommunicationChannel>('Call');
  const [text, setText] = useState(mode === 'nextAction' ? o.nextAction : '');
  const [interest, setInterest] = useState(false);
  const [due, setDue] = useState(mode === 'nextAction' ? dhakaInputValue(o.nextActionDue, true) : '');
  const [date, setDate] = useState(dhakaInputValue(o.expectedDecisionDate));
  const [category, setCategory] = useState<string>(LOSS_REASONS[0]);
  const [ownerId, setOwnerId] = useState('');
  const [file, setFile] = useState<{name: string;sizeKb: number;} | null>(null);

  const extending = mode === 'decisionDate' && !!date && fromDhakaInput(date) > o.expectedDecisionDate;
  const owners = salesOwners(db, roles).filter((u) => u.id !== o.ownerId);
  const reasonOk = text.trim().length >= 8;

  const submit = () => {
    let done = false;
    switch (mode) {
      case 'communication':
        done = runAction({ type: 'CRM_LOG_COMMUNICATION', opportunityId: o.id, channel, summary: text, interest });
        break;
      case 'nextAction':
        done = runAction({ type: 'CRM_SET_NEXT_ACTION', opportunityId: o.id, nextAction: text, due: fromDhakaInput(due) });
        break;
      case 'decisionDate':
        done = runAction({ type: 'CRM_CHANGE_DECISION_DATE', opportunityId: o.id, date: fromDhakaInput(date), reason: text });
        break;
      case 'lost':
        done = runAction({ type: 'CRM_MARK_LOST', opportunityId: o.id, category, reason: text });
        break;
      case 'stalled':
        done = runAction({ type: 'CRM_MARK_STALLED', opportunityId: o.id, reason: text });
        break;
      case 'reopen':
        done = runAction({ type: 'CRM_REOPEN', opportunityId: o.id, reason: text });
        break;
      case 'reassign':
        done = runAction({ type: 'CRM_REASSIGN', opportunityId: o.id, newOwnerId: ownerId, reason: text });
        break;
      case 'requestAssignment':
        done = runAction({ type: 'CRM_RAISE_ASSIGNMENT_CONFLICT', opportunityId: o.id, note: text });
        break;
      case 'attachment':
        if (file) done = runAction({ type: 'CRM_ADD_ATTACHMENT', opportunityId: o.id, name: file.name, sizeKb: file.sizeKb });
        break;
    }
    if (done) onClose();
  };

  const disabled =
  mode === 'communication' ?
  text.trim().length < 3 :
  mode === 'nextAction' ?
  !text.trim() || !due :
  mode === 'decisionDate' ?
  !date || extending && !reasonOk :
  mode === 'reassign' ?
  !ownerId || !reasonOk :
  mode === 'attachment' ?
  !file :
  !reasonOk;

  return (
    <CrmDialog
      title={TITLES[mode]}
      description={o.title}
      onClose={onClose}
      onSubmit={submit}
      submitDisabled={disabled}
      submitTone={mode === 'lost' ? 'danger' : 'primary'}
      submitLabel={mode === 'lost' ? 'Mark lost' : mode === 'requestAssignment' ? 'Send for review' : mode === 'reassign' ? 'Reassign' : 'Save'}>
      
      {mode === 'communication' &&
      <>
          <FormField label="Channel" htmlFor="comm-channel">
            <select id="comm-channel" className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannel)}>
              {COMMUNICATION_CHANNELS.map((c) =>
            <option key={c}>{c}</option>
            )}
            </select>
          </FormField>
          <FormField label="What was discussed" htmlFor="comm-summary" required help="Bangla or English.">
            <textarea id="comm-summary" rows={4} className={textarea} value={text} onChange={(e) => setText(e.target.value)} />
          </FormField>
          <label className="flex items-start gap-2 text-[12.5px] text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={interest} onChange={(e) => setInterest(e.target.checked)} />
            <span>
              The customer expressed interest
              <span className="block text-[11px] text-slate-500">Recorded interest or communication, plus a named contact, lets a Suspect become a Prospect.</span>
            </span>
          </label>
        </>
      }

      {mode === 'nextAction' &&
      <>
          <FormField label="Next action" htmlFor="na-text" required>
            <input id="na-text" className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Send revised proposal" />
          </FormField>
          <FormField label="Due (Asia/Dhaka)" htmlFor="na-due" required>
            <input id="na-due" type="datetime-local" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
          </FormField>
        </>
      }

      {mode === 'decisionDate' &&
      <>
          <p className="text-[12px] text-slate-600">
            Current: <span className="font-semibold text-slate-900">{formatDhakaDate(o.expectedDecisionDate)}</span>
            {o.decisionDateHistory.length > 0 && <> · changed {o.decisionDateHistory.length} time{o.decisionDateHistory.length === 1 ? '' : 's'} before</>}
          </p>
          <FormField label="New expected decision date" htmlFor="dd-date" required>
            <input id="dd-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField
          label={extending ? 'Reason for extending' : 'Note (optional)'}
          htmlFor="dd-reason"
          required={extending}
          help={extending ? 'Extensions are counted. Two or more flag the opportunity for managers.' : undefined}>
          
            <textarea id="dd-reason" rows={3} className={textarea} value={text} onChange={(e) => setText(e.target.value)} />
          </FormField>
        </>
      }

      {mode === 'lost' &&
      <>
          <FormField label="Loss category" htmlFor="lost-cat" required>
            <select id="lost-cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {LOSS_REASONS.map((r) =>
            <option key={r}>{r}</option>
            )}
            </select>
          </FormField>
          <ReasonField id="lost-reason" label="Loss reason" value={text} onChange={setText} help="Kept on the record and in reports. The opportunity can be reopened later with a reason." />
        </>
      }

      {mode === 'stalled' &&
      <ReasonField id="stall-reason" label="Why has it stalled?" value={text} onChange={setText} help="Stalled opportunities leave the active pipeline but keep their stage." />
      }

      {mode === 'reopen' &&
      <ReasonField id="reopen-reason" label="Reason for reopening" value={text} onChange={setText} help={`Returns to ${o.status === 'Lost' ? 'the pipeline' : 'active work'} at its previous stage.`} />
      }

      {mode === 'reassign' &&
      <>
          <p className="text-[12px] text-slate-600">
            Current owner: <span className="font-semibold text-slate-900">{userName(o.ownerId)}</span>. The change is kept in ownership history; past communications keep their author.
          </p>
          <FormField label="New sales owner" htmlFor="ra-owner" required>
            <select id="ra-owner" className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Choose…</option>
              {owners.map((u) =>
            <option key={u.id} value={u.id}>
                  {u.name} · {roles.find((r) => r.id === u.role)?.label}
                </option>
            )}
            </select>
          </FormField>
          <ReasonField id="ra-reason" label="Reason for reassignment" value={text} onChange={setText} />
        </>
      }

      {mode === 'requestAssignment' &&
      <>
          <p className="text-[12px] leading-relaxed text-slate-600">
            {userName(o.ownerId)} owns this opportunity. Two salespeople can’t both be assigned to it, so your request goes to a sales manager. Nothing changes until they decide.
          </p>
          <ReasonField id="req-note" label="Why should you work it?" value={text} onChange={setText} />
        </>
      }

      {mode === 'attachment' &&
      <FormField label="File" htmlFor="att-file" help="Demo only: the file name and size are recorded; the file itself isn’t uploaded anywhere.">
          <input
          id="att-file"
          type="file"
          className="block w-full text-[12.5px] text-slate-700 file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:text-[12px] file:font-semibold file:text-slate-700"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ? { name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) } : null);
          }} />
        
        </FormField>
      }
    </CrmDialog>);

}

function ReasonField({ id, label, value, onChange, help }: {id: string;label: string;value: string;onChange: (v: string) => void;help?: string;}) {
  return (
    <FormField label={label} htmlFor={id} required help={help ?? 'Required — at least a short sentence.'}>
      <textarea id={id} rows={3} className={textarea} value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>);

}