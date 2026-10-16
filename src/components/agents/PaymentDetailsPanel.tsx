import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LockIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canPay, canSeePayment, maskAccount } from '../../utils/agentRules';
import { AdminPanel, linkBtn } from '../admin/AdminPanel';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import type { SalesAgent } from '../../types/records';
import type { AgentPaymentDetails } from '../../types/agent';

/** Restricted: full details for Accounts and the Finance Approver only. */
export function PaymentDetailsPanel({ agent: a }: {agent: SalesAgent;}) {
  const { role } = useSession();
  const [editing, setEditing] = useState(false);
  const p = a.payment;
  const full = canSeePayment(role);

  return (
    <AdminPanel
      title="Payment details"
      description={full ? 'Restricted — visible to Accounts and the Finance Approver only.' : undefined}
      actions={
      canPay(role) &&
      <button type="button" className={linkBtn} onClick={() => setEditing(true)}>
            {p ? 'Change' : 'Add'}
          </button>

      }>
      
      <div className="px-4 py-3 text-[12.5px]">
        {!p ?
        <p className="text-slate-500">No payment details on file. Payments are blocked until Accounts adds them.</p> :
        full ?
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-slate-500">Method</dt>
            <dd className="text-slate-900">{p.method}</dd>
            <dt className="text-slate-500">Account name</dt>
            <dd className="text-slate-900">{p.accountName}</dd>
            <dt className="text-slate-500">{p.method === 'Bank transfer' ? 'Account no.' : 'Wallet no.'}</dt>
            <dd className="font-mono text-slate-900">{p.accountNumber}</dd>
            {p.bankName &&
          <>
                <dt className="text-slate-500">Bank</dt>
                <dd className="text-slate-900">
                  {p.bankName}
                  {p.branchName ? `, ${p.branchName}` : ''}
                  {p.routingNo ? ` · routing ${p.routingNo}` : ''}
                </dd>
              </>
          }
            {p.updatedAt &&
          <>
                <dt className="text-slate-500">Last changed</dt>
                <dd className="text-slate-600">
                  {formatDhakaDate(p.updatedAt)} by {userName(p.updatedById)}
                </dd>
              </>
          }
          </dl> :

        <p className="flex items-center gap-2 text-slate-600">
            <LockIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {p.method} {maskAccount(p.accountNumber)} · full details restricted to Accounts and the Finance Approver
          </p>
        }
      </div>
      <AnimatePresence>{editing && <PaymentDialog key="p" agent={a} onClose={() => setEditing(false)} />}</AnimatePresence>
    </AdminPanel>);

}

function PaymentDialog({ agent, onClose }: {agent: SalesAgent;onClose: () => void;}) {
  const runAction = useRunAction();
  const [p, setP] = useState<AgentPaymentDetails>(agent.payment ?? { method: 'Bank transfer', accountName: agent.name, accountNumber: '' });
  const set = (k: keyof AgentPaymentDetails) => (v: string) => setP((x) => ({ ...x, [k]: v }));
  const bank = p.method === 'Bank transfer';
  return (
    <CrmDialog title={`Payment details — ${agent.name}`} description="Changes are audited. Pending payments use the details on file when paid." onClose={onClose} submitLabel="Save" onSubmit={() => runAction({ type: 'AGT_SET_PAYMENT', agentId: agent.id, payment: p }) && onClose()}>
      <FormField label="Method" htmlFor="pd-m" required>
        <select id="pd-m" className={fieldInput} value={p.method} onChange={(e) => set('method')(e.target.value)}>
          <option>Bank transfer</option>
          <option>bKash</option>
          <option>Nagad</option>
        </select>
      </FormField>
      <FormField label="Account holder" htmlFor="pd-n" required>
        <input id="pd-n" className={fieldInput} value={p.accountName} onChange={(e) => set('accountName')(e.target.value)} />
      </FormField>
      <FormField label={bank ? 'Account number' : 'Wallet number'} htmlFor="pd-a" required>
        <input id="pd-a" inputMode="numeric" className={`${fieldInput} font-mono`} value={p.accountNumber} onChange={(e) => set('accountNumber')(e.target.value)} />
      </FormField>
      {bank &&
      <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Bank" htmlFor="pd-b" required>
            <input id="pd-b" className={fieldInput} value={p.bankName ?? ''} onChange={(e) => set('bankName')(e.target.value)} />
          </FormField>
          <FormField label="Branch" htmlFor="pd-br">
            <input id="pd-br" className={fieldInput} value={p.branchName ?? ''} onChange={(e) => set('branchName')(e.target.value)} />
          </FormField>
          <FormField label="Routing no." htmlFor="pd-r">
            <input id="pd-r" className={fieldInput} value={p.routingNo ?? ''} onChange={(e) => set('routingNo')(e.target.value)} />
          </FormField>
        </div>
      }
    </CrmDialog>);

}