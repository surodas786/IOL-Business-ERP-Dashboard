import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatBDT } from '../../utils/format';
import { canApproveSettlement, canPrepareSettlement, openDisputes, owedAmount, shortfall } from '../../utils/associateRules';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import { MoneyEntryDialog } from './MoneyEntryDialog';
import type { AssociateSettlement } from '../../types/associate';

type Dialog = 'return' | 'payout' | 'remit' | 'dispute' | null;

export function SettlementActions({ settlement: s }: {settlement: AssociateSettlement;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const prep = canPrepareSettlement(role);
  const approver = canApproveSettlement(role);
  const reviewer = s.history.find((h) => h.detail.startsWith('Reviewed'))?.byId;
  const btns: React.ReactNode[] = [];

  if (s.status === 'Draft' && prep) {
    btns.push(<button key="rc" type="button" className={secondaryBtn} onClick={() => runAction({ type: 'ASC_RECALCULATE', settlementId: s.id })}>Recalculate</button>);
    btns.push(<button key="rv" type="button" className={primaryBtn} onClick={() => runAction({ type: 'ASC_REVIEW', settlementId: s.id })}>Mark reviewed</button>);
  }
  if (s.status === 'Reviewed') {
    if (prep || approver) btns.push(<button key="rd" type="button" className={secondaryBtn} onClick={() => setDialog('return')}>Return to draft</button>);
    if (approver && s.approvalId) {
      const self = reviewer === user.id;
      btns.push(<ApprovalButtons key="ap" approvalId={s.approvalId} disabled={self} disabledReason={self ? 'The reviewer cannot approve' : undefined} />);
    }
  }
  if (s.status === 'Approved' && prep) {
    if (s.payout) btns.push(<button key="py" type="button" className={primaryBtn} onClick={() => setDialog('payout')}>Record payout</button>);
    if (s.receivable) btns.push(<button key="rm" type="button" className={primaryBtn} onClick={() => setDialog('remit')}>Record remittance</button>);
  }
  if (['Approved', 'Paid/Remitted'].includes(s.status) && prep) btns.push(<button key="dp" type="button" className={secondaryBtn} onClick={() => setDialog('dispute')}>Raise dispute</button>);
  if (s.status === 'Paid/Remitted' && prep) {
    const blocked = openDisputes(s).length > 0 || s.remittances.some((r) => !r.verified);
    btns.push(<button key="rec" type="button" disabled={blocked} title={blocked ? 'Resolve disputes and verify remittances first' : undefined} className={primaryBtn} onClick={() => runAction({ type: 'ASC_RECONCILE', settlementId: s.id })}>Reconcile</button>);
  }
  if (!btns.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {btns}
      <AnimatePresence>
        {dialog === 'return' && <BillingReasonDialog key="r" title="Return to draft" description="Withdraws the pending approval so the figures can be corrected." submitLabel="Return to draft" onSubmit={(reason) => runAction({ type: 'ASC_RETURN_TO_DRAFT', settlementId: s.id, reason })} onClose={() => setDialog(null)} />}
        {dialog === 'payout' &&
        <MoneyEntryDialog key="p" title="Record payout" description={`Approved share ${formatBDT(s.payout)} paid to the associate.`} submitLabel="Record payout" fields={{ amount: s.payout, reference: 'Bank or BEFTN reference', date: 'Paid on' }}
        onSubmit={(v) => runAction({ type: 'ASC_RECORD_PAYOUT', settlementId: s.id, reference: v.reference, paidAt: v.at })} onClose={() => setDialog(null)} />
        }
        {dialog === 'remit' &&
        <MoneyEntryDialog key="m" title="Record remittance" description={`Received from the associate. Counts against the ${formatBDT(owedAmount(s))} receivable only after a second person verifies it. Current shortfall ${formatBDT(shortfall(s))}.`} submitLabel="Record remittance" fields={{ amount: true, reference: 'Bank, bKash or deposit slip reference', date: 'Received on' }}
        onSubmit={(v) => runAction({ type: 'ASC_RECORD_REMITTANCE', settlementId: s.id, amount: v.amount, reference: v.reference, at: v.at })} onClose={() => setDialog(null)} />
        }
        {dialog === 'dispute' &&
        <MoneyEntryDialog key="d" title="Raise dispute" description="Disputed amounts are tracked separately from the shortfall. Approved figures are not changed." submitLabel="Raise dispute" fields={{ amount: true, text: { label: 'What is disputed', min: 20 } }}
        onSubmit={(v) => runAction({ type: 'ASC_RAISE_DISPUTE', settlementId: s.id, amount: v.amount, reason: v.text })} onClose={() => setDialog(null)} />
        }
      </AnimatePresence>
    </div>);

}