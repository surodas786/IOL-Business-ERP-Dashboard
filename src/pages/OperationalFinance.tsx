import React, { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, hasPermission } from '../utils/access';
import { canRecordOps } from '../utils/opsFinanceWorkflow';
import { AccessDenied } from '../components/shell/AccessDenied';
import { primaryBtn } from '../components/admin/AdminPanel';
import { OpsRegister } from '../components/finance/OpsRegister';
import { RecurringView } from '../components/finance/RecurringView';
import { NewOpsPaymentDialog } from '../components/finance/NewOpsPaymentDialog';

const VIEWS = [
{ id: 'register', label: 'Payment register' },
{ id: 'recurring', label: 'Recurring reminders' }] as
const;

export function OperationalFinance() {
  const { view } = useParams();
  const { role } = useSession();
  const [creating, setCreating] = useState(false);
  if (!canAccessModule(role, 'finance') || !hasPermission(role, 'viewFinancials')) return <AccessDenied module="finance" />;
  if (!view || !VIEWS.some((v) => v.id === view)) return <Navigate to="/operational-finance/register" replace />;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Operational Finance</h1>
          <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">Operational payments with evidence, approval and payment reference. This is a register — not a general ledger, and it produces no statutory financial statements. Salary rows record payments only.</p>
        </div>
        {canRecordOps(role.permissions) &&
        <button type="button" className={primaryBtn} onClick={() => setCreating(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Record payment
          </button>
        }
      </div>
      <nav aria-label="Operational finance views" className="mb-3 flex gap-1 border-b border-slate-200">
        {VIEWS.map((x) =>
        <NavLink key={x.id} to={`/operational-finance/${x.id}`} className={({ isActive }) => `-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {x.label}
          </NavLink>
        )}
      </nav>
      {view === 'register' ? <OpsRegister /> : <RecurringView />}
      <AnimatePresence>{creating && <NewOpsPaymentDialog key="n" onClose={() => setCreating(false)} />}</AnimatePresence>
    </div>);

}