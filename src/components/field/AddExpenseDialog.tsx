import React, { useMemo, useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { ExpenseLineFields } from './ExpenseLineFields';
import { fieldInput } from './fieldStyles';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { dhakaInputValue, demoNow, formatDhaka } from '../../utils/format';
import { recordName } from '../../utils/relations';
import { emptyExpenseLine, openClaimFor, validateExpenseLine, type ExpenseLineDraft } from '../../utils/fieldRules';

/** Quick action: add one expense line to the user's open (draft or returned) claim. */
export function AddExpenseDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const { user } = useSession();
  const runAction = useRunAction();
  const [line, setLine] = useState<ExpenseLineDraft>(() => emptyExpenseLine(dhakaInputValue(demoNow().toISOString())));
  const [tried, setTried] = useState(false);
  const errors = tried ? validateExpenseLine(line) : {};
  const open = openClaimFor(db, user.id);

  const myVisits = useMemo(() => db.fieldVisits.filter((v) => v.userId === user.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15), [db, user.id]);

  const linkVisit = (id: string) => {
    const v = myVisits.find((x) => x.id === id);
    setLine((p) => ({
      ...p,
      visitId: v?.id,
      subject: v?.subject,
      date: v ? dhakaInputValue(v.at) : p.date,
      relation: v ? v.subject.type === 'customer' ? 'Account servicing' : 'Customer acquisition' : p.relation
    }));
  };

  const submit = () => {
    setTried(true);
    if (Object.keys(validateExpenseLine(line)).length) return;
    if (runAction({ type: 'FIELD_ADD_EXPENSE', line })) onClose();
  };

  return (
    <CrmDialog
      title="Add expense"
      description={open ? `Adds to ${open.status === 'Returned' ? 'returned' : 'draft'} claim ${open.id}.` : 'Starts a new draft claim. Nothing is sent until you submit it.'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Add to claim">
      
      <FormField label="Related visit" htmlFor="ax-visit" help="Optional. Links the expense to the lead or customer visited.">
        <select id="ax-visit" className={fieldInput} value={line.visitId ?? ''} onChange={(e) => linkVisit(e.target.value)}>
          <option value="">No linked visit</option>
          {myVisits.map((v) =>
          <option key={v.id} value={v.id}>
              {formatDhaka(v.at)} — {recordName(db, v.subject)}
            </option>
          )}
        </select>
      </FormField>
      <ExpenseLineFields idPrefix="ax" value={line} errors={errors} onChange={setLine} />
    </CrmDialog>);

}