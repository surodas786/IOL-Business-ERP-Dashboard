import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { canEditAssociate, canPrepareSettlement, canSeeAssociateMoney, dueState, tierOf } from '../utils/associateRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { ProfileFacts } from '../components/associates/ProfileFacts';
import { BalancesPanel } from '../components/associates/BalancesPanel';
import { ControlsPanel } from '../components/associates/ControlsPanel';
import { SettlementTable } from '../components/associates/SettlementTable';
import { RulesView } from '../components/associates/RulesView';
import { AssociateFormDialog } from '../components/associates/AssociateFormDialog';
import { NewSettlementDialog } from '../components/associates/NewSettlementDialog';

export function AssociateDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const [dialog, setDialog] = useState<'edit' | 'settlement' | null>(null);
  if (!canAccessModule(role, 'associates')) return <AccessDenied title="Associates" module="associates" />;
  const a = db.associates.find((x) => x.id === id);
  if (!a || !inUserScope(user, a.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{a ? 'This associate is outside your branch scope.' : 'Associate not found.'}</p>
        <Link to="/associates" className={`${linkBtn} mt-2 inline-block`}>
          All associates
        </Link>
      </div>);

  }
  const money = canSeeAssociateMoney(role);
  const settlements = db.associateSettlements.filter((s) => s.associateId === a.id).sort((x, y) => y.period.localeCompare(x.period));
  const pastGrace = settlements.some((s) => dueState(a, s) === 'suspension');

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/associates" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> All associates
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {a.id} · prefix {a.clientIdPrefix ?? '—'} · tier {tierOf(db, a.id)}
          </p>
          <h1 className="text-[19px] font-bold text-slate-900">{a.name}</h1>
          <p className="text-[12px] text-slate-600">
            {a.nameBn} · {a.collectionModel} · {a.subscribers.toLocaleString('en-IN')} subscribers
          </p>
          <div className="mt-1.5">
            <StatusBadge status={a.status ?? 'Active'} />
          </div>
        </div>
        <div className="flex gap-2">
          {canEditAssociate(role) &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('edit')}>
              Edit profile
            </button>
          }
          {money && canPrepareSettlement(role) &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('settlement')}>
              Draft settlement
            </button>
          }
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          {money && <BalancesPanel associate={a} />}
          {money &&
          <AdminPanel title="Settlements">
              <SettlementTable rows={settlements} showAssociate={false} showMoney={money} empty="No settlements yet." />
            </AdminPanel>
          }
          <ProfileFacts associate={a} money={money} />
          {money && <RulesView associateId={a.id} />}
        </div>
        <div className="space-y-3">
          <ControlsPanel associate={a} pastGrace={pastGrace} />
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-[12px] text-slate-500">Associate self-service portal (declarations, statements and remittance upload by the associate) is a future feature.</p>
        </div>
      </div>

      <AnimatePresence>
        {dialog === 'edit' && <AssociateFormDialog key="e" associate={a} onClose={() => setDialog(null)} />}
        {dialog === 'settlement' && <NewSettlementDialog key="s" associateId={a.id} onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}