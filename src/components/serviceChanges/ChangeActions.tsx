import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { hasPermission } from '../../utils/access';
import { demoNow } from '../../utils/format';
import {
  canAssessTechnical,
  canClearAccounts,
  canCloseChange,
  canDecideChange,
  canEditCommercial,
  canImplement,
  canRequestChange,
  clearanceDone,
  closureGaps,
  needsCommercial } from
'../../utils/serviceChangeRules';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import { TechAssessDialog } from './TechAssessDialog';
import { CommercialDialog } from './CommercialDialog';
import { DecisionDialog } from './DecisionDialog';
import { EvidenceDialog } from './EvidenceDialog';
import { ClearanceDialog } from './ClearanceDialog';
import type { ServiceChange } from '../../types/records';

type Dlg =
'tech' | 'commercial' | 'approve' | 'reject' | 'evidence' | 'resume' | 'cancel' |
'clear-technical' | 'clear-accounts' | 'exc-technical' | 'exc-accounts' | null;

const IMPLEMENT_LABEL: Record<ServiceChange['type'], string> = {
  Shifting: 'Record shift',
  Upgrade: 'Record upgrade',
  Downgrade: 'Record downgrade',
  'Temporary Stop': 'Record stop',
  Resumption: 'Verify resumption',
  Discontinuation: 'Record service stop'
};

/** Role-aware actions for one service change. Each department only sees the steps it owns. */
export function ChangeActions({ change: s, showAmounts }: {change: ServiceChange;showAmounts: boolean;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [dlg, setDlg] = useState<Dlg>(null);
  const ap = db.approvals.find((a) => a.id === s.approvalId);
  const btns: React.ReactNode[] = [];
  const add = (key: string, label: string, onClick: () => void, primary = false, disabledReason?: string) =>
  btns.push(
    <button key={key} type="button" className={primary ? primaryBtn : secondaryBtn} onClick={onClick} disabled={!!disabledReason} title={disabledReason}>
        {label}
      </button>
  );

  if (s.status === 'Requested' && s.type !== 'Resumption') {
    if (canAssessTechnical(role)) add('tech', s.technicalImpact ? 'Update technical assessment' : 'Assess technical impact', () => setDlg('tech'), !s.technicalImpact);
    if (canEditCommercial(role) && needsCommercial(s.type)) add('com', s.commercialImpact ? 'Edit commercial impact' : 'Add commercial impact', () => setDlg('commercial'), !s.commercialImpact);
  }
  if (s.status === 'Pending Approval' && canDecideChange(role)) {
    const own = ap?.requestedById === user.id;
    add('rej', 'Reject', () => setDlg('reject'), false, own ? 'You requested this change' : undefined);
    add('app', 'Approve', () => setDlg('approve'), true, own ? 'You requested this change' : undefined);
  }
  const implementable = s.type === 'Resumption' ? s.status === 'Requested' : s.status === 'Approved';
  if (implementable && canImplement(role)) add('impl', IMPLEMENT_LABEL[s.type], () => setDlg('evidence'), true);
  if (s.type === 'Temporary Stop' && s.status === 'Stopped' && !s.resumptionId && canRequestChange(role)) add('resume', 'Request resumption', () => setDlg('resume'), true);

  if (s.type === 'Discontinuation' && s.clearances && s.status !== 'Closed') {
    const { technical, accounts } = s.clearances;
    if (canImplement(role) && !clearanceDone(technical) && technical.status !== 'Exception Requested') {
      add('tc', 'Give technical clearance', () => setDlg('clear-technical'));
      add('te', 'Request technical exception', () => setDlg('exc-technical'));
    }
    if (canClearAccounts(role) && !clearanceDone(accounts) && accounts.status !== 'Exception Requested') {
      add('ac', 'Give accounts clearance', () => setDlg('clear-accounts'));
      add('ae', 'Request accounts exception', () => setDlg('exc-accounts'));
    }
    (['technical', 'accounts'] as const).forEach((side) => {
      const exc = db.approvals.find((a) => a.id === s.clearances![side].exceptionApprovalId && a.status === 'Pending');
      if (exc && hasPermission(role, exc.requiredPermission) && exc.requestedById !== user.id) {
        btns.push(
          <span key={`x-${side}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1 text-[12px]">
            <span className="font-semibold text-slate-700">{side === 'technical' ? 'Technical' : 'Accounts'} exception:</span>
            <ApprovalButtons approvalId={exc.id} />
          </span>
        );
      }
    });
    if (canCloseChange(role) && (s.status === 'Service Stopped' || s.status === 'Approved')) {
      const gaps = closureGaps(s);
      add('close', 'Close administratively', () => runAction({ type: 'SC_CLOSE', id: s.id }), true, gaps.length ? `Blocked: ${gaps.join('; ')}` : undefined);
    }
  }
  if (s.type === 'Shifting' && s.status === 'Implemented' && s.relocationCharge && !s.relocationInvoiceId && canClearAccounts(role)) add('reloc', 'Invoice relocation charge', () => runAction({ type: 'SC_INVOICE_RELOCATION', id: s.id }), true);
  if ((s.status === 'Requested' || s.status === 'Pending Approval') && (s.requestedById === user.id || canCloseChange(role))) add('cancel', 'Cancel request', () => setDlg('cancel'));

  return (
    <>
      {btns.length > 0 && <div className="flex flex-wrap gap-2">{btns}</div>}
      <AnimatePresence>
        {dlg === 'tech' && <TechAssessDialog key="t" change={s} onClose={() => setDlg(null)} />}
        {dlg === 'commercial' && <CommercialDialog key="c" change={s} onClose={() => setDlg(null)} />}
        {(dlg === 'approve' || dlg === 'reject') && <DecisionDialog key={dlg} change={s} decision={dlg === 'approve' ? 'Approved' : 'Rejected'} onClose={() => setDlg(null)} />}
        {dlg === 'evidence' && <EvidenceDialog key="e" change={s} onClose={() => setDlg(null)} />}
        {(dlg === 'clear-technical' || dlg === 'clear-accounts') && <ClearanceDialog key={dlg} change={s} side={dlg === 'clear-technical' ? 'technical' : 'accounts'} showAmounts={showAmounts} onClose={() => setDlg(null)} />}
        {(dlg === 'exc-technical' || dlg === 'exc-accounts') &&
        <BillingReasonDialog
          key={dlg}
          title={`Request ${dlg === 'exc-technical' ? 'technical' : 'accounts'} clearance exception`}
          description={dlg === 'exc-technical' ? 'For example customer-owned equipment, or a written-off loss. Business Head or Management decides. At least 20 characters.' : 'For example a write-off or deposit held against a dispute. The Finance Approver decides. At least 20 characters.'}
          submitLabel="Send for approval"
          onSubmit={(reason) => runAction({ type: 'SC_REQUEST_EXCEPTION', id: s.id, side: dlg === 'exc-technical' ? 'technical' : 'accounts', reason })}
          onClose={() => setDlg(null)} />

        }
        {dlg === 'resume' &&
        <BillingReasonDialog
          key="r"
          title={`Request resumption of ${s.connectionId}`}
          description="Technical must verify the service before it is reactivated. Billing returns to the full rate from the verified date."
          submitLabel="Raise resumption request"
          onSubmit={(reason) =>
          runAction({ type: 'SC_REQUEST', customerId: s.customerId, connectionId: s.connectionId, type: 'Resumption', reason, requestedDate: demoNow().toISOString(), stopChangeId: s.id })
          }
          onClose={() => setDlg(null)} />

        }
        {dlg === 'cancel' &&
        <BillingReasonDialog key="x" title={`Cancel ${s.id}`} danger submitLabel="Cancel request" description="The request stays in history as cancelled." onSubmit={(reason) => runAction({ type: 'SC_CANCEL', id: s.id, reason })} onClose={() => setDlg(null)} />
        }
      </AnimatePresence>
    </>);

}