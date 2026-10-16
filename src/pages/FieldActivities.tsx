import React, { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MapPinPlusIcon, ReceiptIcon } from 'lucide-react';
import { fieldViews } from '../data/fieldViews';
import { useSession } from '../contexts/SessionContext';
import { useFieldData } from '../hooks/useFieldData';
import { canAccessModule } from '../utils/access';
import { canDecideClaim, canLogVisits, canPayClaim, followUpOverdue } from '../utils/fieldRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { DailyTimeline } from '../components/field/DailyTimeline';
import { VisitsByPerson } from '../components/field/VisitsByPerson';
import { PendingFollowUps } from '../components/field/PendingFollowUps';
import { ExpensesView } from '../components/field/ExpensesView';
import { TargetsView } from '../components/field/TargetsView';
import { LogVisitDialog } from '../components/field/LogVisitDialog';
import { AddExpenseDialog } from '../components/field/AddExpenseDialog';

export function FieldActivities() {
  const { view } = useParams();
  const { role } = useSession();
  const { db, user, visits, claims } = useFieldData();
  const [dialog, setDialog] = useState<'visit' | 'expense' | null>(null);

  if (!canAccessModule(role, 'field')) return <AccessDenied title="Field Activities" module="field" />;
  const views = fieldViews.filter((v) => v.visible(role));
  const current = views.find((v) => v.id === view);
  if (!current) return <Navigate to={`/field-activities/${views[0]?.id ?? 'expenses'}`} replace />;

  const canLog = canLogVisits(role);
  const overdue = visits.filter(followUpOverdue).length;
  const toAct = claims.filter((c) => !canDecideClaim(c, user, role, db) || !canPayClaim(c, user, role)).length;
  const badge: Record<string, number> = { 'follow-ups': overdue, expenses: toAct };

  return (
    <div className={`px-4 pt-4 lg:px-5 ${canLog ? 'pb-24 sm:pb-8' : 'pb-8'}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Field Activities</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Visits, follow-ups and expense claims · fictional demo data · location stamps are reference only, not proof of a visit
          </p>
        </div>
        {canLog &&
        <div className="hidden items-center gap-2 sm:flex">
            <button type="button" className={secondaryBtn} onClick={() => setDialog('expense')}>
              <ReceiptIcon className="h-3.5 w-3.5" aria-hidden /> Add expense
            </button>
            <button type="button" className={primaryBtn} onClick={() => setDialog('visit')}>
              <MapPinPlusIcon className="h-3.5 w-3.5" aria-hidden /> Log visit
            </button>
          </div>
        }
      </div>

      <nav aria-label="Field Activities views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) => {
          const Icon = v.icon;
          const n = badge[v.id];
          return (
            <NavLink
              key={v.id}
              to={`/field-activities/${v.id}`}
              className={({ isActive }) =>
              `-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${
              isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`

              }>
              
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {v.label}
              {!!n && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-status-warning">{n}</span>}
            </NavLink>);

        })}
      </nav>

      {current.id === 'day' && <DailyTimeline />}
      {current.id === 'visits' && <VisitsByPerson />}
      {current.id === 'follow-ups' && <PendingFollowUps />}
      {current.id === 'expenses' && <ExpensesView />}
      {current.id === 'targets' && <TargetsView />}

      {canLog &&
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <button type="button" className={`${secondaryBtn} h-11 justify-center text-[13px]`} onClick={() => setDialog('expense')}>
            <ReceiptIcon className="h-4 w-4" aria-hidden /> Add expense
          </button>
          <button type="button" className={`${primaryBtn} h-11 justify-center text-[13px]`} onClick={() => setDialog('visit')}>
            <MapPinPlusIcon className="h-4 w-4" aria-hidden /> Log visit
          </button>
        </div>
      }

      <AnimatePresence>
        {dialog === 'visit' && <LogVisitDialog key="visit" onClose={() => setDialog(null)} />}
        {dialog === 'expense' && <AddExpenseDialog key="expense" onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}