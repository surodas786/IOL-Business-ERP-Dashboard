import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useFieldData } from '../../hooks/useFieldData';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, linkBtn, tdClass, thClass } from '../admin/AdminPanel';
import { FormField } from '../admin/FormField';
import { CrmDialog } from '../crm/CrmDialog';
import { fieldTextarea } from './fieldStyles';
import { formatDhaka, relativeAge } from '../../utils/format';
import { recordName, userName } from '../../utils/relations';
import { followUpOverdue } from '../../utils/fieldRules';
import type { FieldVisit } from '../../types/field';

/** Open next actions from visits, overdue first. */
export function PendingFollowUps() {
  const { db, user, visits } = useFieldData();
  const { openRecord } = useRecordDrawer();
  const [closing, setClosing] = useState<FieldVisit | null>(null);
  const pending = visits.
  filter((v) => v.nextAction && !v.followUpDoneAt).
  sort((a, b) => Number(followUpOverdue(b)) - Number(followUpOverdue(a)) || a.nextActionDue.localeCompare(b.nextActionDue));
  const overdue = pending.filter(followUpOverdue).length;

  return (
    <>
      <AdminPanel title="Pending follow-ups" description={`${pending.length} open · ${overdue} overdue. Only the person who made the visit can mark a follow-up done.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className={thClass}>Due</th>
                <th className={thClass}>Next action</th>
                <th className={thClass}>Lead / customer</th>
                <th className={thClass}>Owner</th>
                <th className={thClass}>From visit</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 &&
              <tr>
                  <td colSpan={6} className={`${tdClass} py-8 text-center text-slate-500`}>
                    No pending follow-ups.
                  </td>
                </tr>
              }
              {pending.map((v) => {
                const late = followUpOverdue(v);
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <span className={late ? 'font-semibold text-status-critical' : 'text-slate-800'}>{formatDhaka(v.nextActionDue)}</span>
                      <span className="block text-[10.5px] text-slate-400">{late ? `overdue ${relativeAge(v.nextActionDue).replace(' ago', '')}` : relativeAge(v.nextActionDue)}</span>
                    </td>
                    <td className={`${tdClass} font-semibold text-slate-900`}>{v.nextAction}</td>
                    <td className={tdClass}>
                      <button type="button" className="text-left text-primary hover:text-primary-hover" onClick={() => openRecord(v.subject)}>
                        {recordName(db, v.subject)}
                      </button>
                    </td>
                    <td className={tdClass}>{userName(v.userId)}</td>
                    <td className={tdClass}>
                      <button type="button" className={linkBtn} onClick={() => openRecord({ type: 'fieldVisit', id: v.id })}>
                        {v.id}
                      </button>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {v.userId === user.id &&
                      <button type="button" className={linkBtn} onClick={() => setClosing(v)}>
                          Mark done
                        </button>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
      <AnimatePresence>{closing && <DoneDialog key="done" visit={closing} onClose={() => setClosing(null)} />}</AnimatePresence>
    </>);

}

function DoneDialog({ visit, onClose }: {visit: FieldVisit;onClose: () => void;}) {
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  return (
    <CrmDialog
      title="Mark follow-up done"
      description={visit.nextAction}
      onClose={onClose}
      submitLabel="Mark done"
      submitDisabled={note.trim().length < 3}
      onSubmit={() => runAction({ type: 'FIELD_COMPLETE_FOLLOWUP', visitId: visit.id, note }) && onClose()}>
      
      <FormField label="What was done" htmlFor="fu-note" required help="Log a new visit too if you met the customer again.">
        <textarea id="fu-note" rows={3} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}