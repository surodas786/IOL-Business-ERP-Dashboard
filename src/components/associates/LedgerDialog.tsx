import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { formatBDT } from '../../utils/format';
import { periodLabel, shortfall } from '../../utils/associateRules';

type Kind = 'Advance received' | 'Advance applied' | 'Deposit received' | 'Deposit refunded';
const KINDS: Kind[] = ['Advance received', 'Advance applied', 'Deposit received', 'Deposit refunded'];

export function LedgerDialog({ associateId, onClose }: {associateId: string;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [kind, setKind] = useState<Kind>('Advance received');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const open = db.associateSettlements.filter((s) => s.associateId === associateId && s.status === 'Approved' && shortfall(s) > 0);
  const [settlementId, setSettlementId] = useState(open[0]?.id ?? '');

  return (
    <CrmDialog
      title="Advance or deposit entry"
      description="Advance, Due, Collection and Security Deposit are kept as separate balances. Applying an advance counts as a verified remittance."
      onClose={onClose}
      submitLabel="Record"
      submitDisabled={!Number(amount) || desc.trim().length < 4 || kind === 'Advance applied' && !settlementId}
      onSubmit={() => runAction({ type: 'ASC_LEDGER', associateId, kind, amount: Number(amount), description: desc, settlementId: kind === 'Advance applied' ? settlementId : undefined }) && onClose()}>
      
      <FormField label="Entry" htmlFor="lg-kind" required>
        <select id="lg-kind" className={fieldInput} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) =>
          <option key={k}>{k}</option>
          )}
        </select>
      </FormField>
      {kind === 'Advance applied' &&
      <FormField label="Apply to settlement" htmlFor="lg-s" required help={open.length ? undefined : 'No approved settlement has an unpaid balance.'}>
          <select id="lg-s" className={fieldInput} value={settlementId} onChange={(e) => setSettlementId(e.target.value)}>
            {open.map((s) =>
          <option key={s.id} value={s.id}>
                {s.id} · {periodLabel(s.period)} · shortfall {formatBDT(shortfall(s))}
              </option>
          )}
          </select>
        </FormField>
      }
      <FormField label="Amount (BDT)" htmlFor="lg-amt" required>
        <input id="lg-amt" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
      </FormField>
      <FormField label="Reference / description" htmlFor="lg-desc" required>
        <input id="lg-desc" className={fieldInput} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </FormField>
    </CrmDialog>);

}