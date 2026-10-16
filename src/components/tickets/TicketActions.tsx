import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PaperclipIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canCloseTicket, canDispatch, canReopen, canWorkOn, isOpen } from '../../utils/ticketRules';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { FilePickButton } from '../field/FilePickButton';
import { AssignTicketDialog } from './AssignTicketDialog';
import { HoldDialog } from './HoldDialog';
import { ResolveDialog } from './ResolveDialog';
import { EscalateDialog } from './EscalateDialog';
import { ConfirmationDialog } from './ConfirmationDialog';
import { TextDialog } from './TextDialog';
import type { Ticket } from '../../types/records';

type Dialog = 'assign' | 'respond' | 'hold' | 'resume' | 'resolve' | 'escalate' | 'confirm' | 'reopen' | 'note' | null;

/** Next steps for the ticket, limited to what the current role may do. */
export function TicketActions({ ticket: t }: {ticket: Ticket;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const work = canWorkOn(role, user.name, t);
  const dispatch = canDispatch(role);
  const open = isOpen(t);
  const close = () => setDialog(null);

  const primary: React.ReactNode[] = [];
  const secondary: React.ReactNode[] = [];
  const btn = (label: string, onClick: () => void, main = false) => {
    const el =
    <button key={label} type="button" className={main ? primaryBtn : secondaryBtn} onClick={onClick}>
        {label}
      </button>;

    (main ? primary : secondary).push(el);
  };

  if (t.status === 'Open' && dispatch) btn('Assign', () => setDialog('assign'), true);
  if (open && !t.firstResponseAt && work) btn('Record first response', () => setDialog('respond'), t.status !== 'Open' || !dispatch);
  if (t.status === 'Assigned' && work) btn('Start work', () => runAction({ type: 'TKT_START', ticketId: t.id }), true);
  if (t.status === 'In Progress' && work) btn('Resolve', () => setDialog('resolve'), true);
  if (t.status === 'On Hold' && work) btn('Resume', () => setDialog('resume'), true);
  if (t.status === 'Resolved' && t.resolution?.confirmation !== 'Confirmed by customer' && (work || canCloseTicket(role))) btn('Record confirmation', () => setDialog('confirm'), t.resolution?.confirmation === 'Confirmation pending');
  if (t.status === 'Resolved' && canCloseTicket(role)) btn('Close ticket', () => runAction({ type: 'TKT_CLOSE', ticketId: t.id }), t.resolution?.confirmation !== 'Confirmation pending');
  if ((t.status === 'Assigned' || t.status === 'In Progress') && work) btn('Put on hold', () => setDialog('hold'));
  if (open && t.status !== 'Open' && dispatch) btn('Reassign', () => setDialog('assign'));
  if (open && (work || dispatch)) btn('Escalate', () => setDialog('escalate'));
  if ((t.status === 'Resolved' || t.status === 'Closed') && canReopen(role)) btn('Reopen', () => setDialog('reopen'));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {primary}
        {secondary}
        <button type="button" className={secondaryBtn} onClick={() => setDialog('note')}>
          Add note
        </button>
        <FilePickButton label="Attach" multiple className="!h-8 !text-[12px]" icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} onPick={(files) => runAction({ type: 'TKT_ATTACH', ticketId: t.id, files })} />
      </div>
      <AnimatePresence>
        {dialog === 'assign' && <AssignTicketDialog key="a" ticket={t} onClose={close} />}
        {dialog === 'hold' && <HoldDialog key="h" ticket={t} onClose={close} />}
        {dialog === 'resolve' && <ResolveDialog key="r" ticket={t} onClose={close} />}
        {dialog === 'escalate' && <EscalateDialog key="e" ticket={t} onClose={close} />}
        {dialog === 'confirm' && <ConfirmationDialog key="c" ticket={t} onClose={close} />}
        {dialog === 'respond' &&
        <TextDialog key="rp" title="Record first response" description="Stops the first-response clock. Assigning a technician does not count." label="Response given to the customer" submitLabel="Record response" onSubmit={(note) => runAction({ type: 'TKT_RESPOND', ticketId: t.id, note })} onClose={close} />
        }
        {dialog === 'resume' && <TextDialog key="rs" title={`Resume ${t.id}`} label="What changed" min={3} submitLabel="Resume" onSubmit={(note) => runAction({ type: 'TKT_RESUME', ticketId: t.id, note })} onClose={close} />}
        {dialog === 'reopen' &&
        <TextDialog key="ro" title={`Reopen ${t.id}`} description="The previous resolution is kept in history. The original resolution target still applies." label="Reason for reopening" submitLabel="Reopen" danger onSubmit={(reason) => runAction({ type: 'TKT_REOPEN', ticketId: t.id, reason })} onClose={close} />
        }
        {dialog === 'note' && <TextDialog key="n" title="Add note" label="Note" min={3} submitLabel="Add note" onSubmit={(note) => runAction({ type: 'TKT_NOTE', ticketId: t.id, note })} onClose={close} />}
      </AnimatePresence>
    </>);

}