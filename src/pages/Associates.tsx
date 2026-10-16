import React, { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangleIcon, BellIcon, PlusIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useScopedAssociates } from '../hooks/useScopedAssociates';
import { canAccessModule } from '../utils/access';
import { canEditAssociate, canPrepareSettlement, canSeeAssociateMoney, dueState } from '../utils/associateRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { AssociateDirectory } from '../components/associates/AssociateDirectory';
import { HierarchyTree } from '../components/associates/HierarchyTree';
import { SettlementTable } from '../components/associates/SettlementTable';
import { RulesView } from '../components/associates/RulesView';
import { AssociateFormDialog } from '../components/associates/AssociateFormDialog';
import { NewSettlementDialog } from '../components/associates/NewSettlementDialog';

const VIEWS = [
{ id: 'directory', label: 'Associates' },
{ id: 'hierarchy', label: 'Hierarchy' },
{ id: 'settlements', label: 'Settlements' },
{ id: 'rules', label: 'Settlement rules' }] as
const;

export function Associates() {
  const { view } = useParams();
  const { db } = useData();
  const { role } = useSession();
  const { settlements } = useScopedAssociates();
  const [dialog, setDialog] = useState<'associate' | 'settlement' | null>(null);
  if (!canAccessModule(role, 'associates')) return <AccessDenied title="Associates" module="associates" />;
  const money = canSeeAssociateMoney(role);
  const views = VIEWS.filter((v) => money || v.id === 'directory' || v.id === 'hierarchy');
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/associates" replace />;

  const withState = settlements.map((s) => ({ s, st: dueState(db.associates.find((a) => a.id === s.associateId)!, s) }));
  const suspension = withState.filter((x) => x.st === 'suspension').length;
  const overdue = withState.filter((x) => x.st === 'overdue').length;
  const reminder = withState.filter((x) => x.st === 'reminder').length;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Associates</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">Local ISP / MAC partners, agreements and monthly settlements · associate self-service portal is a future feature · fictional demo data</p>
        </div>
        <div className="flex gap-2">
          {money && canPrepareSettlement(role) &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('settlement')}>
              Draft settlement
            </button>
          }
          {canEditAssociate(role) &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('associate')}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New associate
            </button>
          }
        </div>
      </div>

      {money && (suspension || overdue || reminder) > 0 &&
      <div role="status" className="mb-3 flex flex-wrap gap-x-5 gap-y-1 rounded-md bg-amber-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          {suspension > 0 &&
        <span className="flex items-center gap-1.5 font-semibold text-status-critical">
              <AlertTriangleIcon className="h-4 w-4" aria-hidden /> {suspension} past grace — suspension review
            </span>
        }
          {overdue > 0 &&
        <span className="flex items-center gap-1.5">
              <AlertTriangleIcon className="h-4 w-4 text-status-warning" aria-hidden /> {overdue} overdue within grace
            </span>
        }
          {reminder > 0 &&
        <span className="flex items-center gap-1.5">
              <BellIcon className="h-4 w-4 text-status-warning" aria-hidden /> {reminder} due in the next 3 days
            </span>
        }
        </div>
      }

      <nav aria-label="Associate views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'directory' ? '/associates' : `/associates/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>

      {current.id === 'directory' && <AssociateDirectory />}
      {current.id === 'hierarchy' && <HierarchyTree />}
      {current.id === 'settlements' &&
      <AdminPanel title="Settlements" description="Draft → Reviewed → Approved → Paid/Remitted → Reconciled. Approved figures are locked.">
          <SettlementTable rows={[...settlements].sort((a, b) => b.period.localeCompare(a.period) || a.associateId.localeCompare(b.associateId))} showMoney={money} />
        </AdminPanel>
      }
      {current.id === 'rules' && <RulesView />}

      <AnimatePresence>
        {dialog === 'associate' && <AssociateFormDialog key="a" onClose={() => setDialog(null)} />}
        {dialog === 'settlement' && <NewSettlementDialog key="s" onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}