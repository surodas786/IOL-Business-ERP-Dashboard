import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangleIcon, ArrowLeftIcon, BellIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { formatDhaka, formatDhakaDate } from '../utils/format';
import { customerName, userName } from '../utils/relations';
import { canSeeCommercial, canSeePayback, resumptionState } from '../utils/serviceChangeRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn } from '../components/admin/AdminPanel';
import { ChangeStatusTrack } from '../components/serviceChanges/ChangeStatusTrack';
import { ChangeSummary } from '../components/serviceChanges/ChangeSummary';
import { ImpactPanel } from '../components/serviceChanges/ImpactPanel';
import { ClearancePanel } from '../components/serviceChanges/ClearancePanel';
import { ChangeActions } from '../components/serviceChanges/ChangeActions';
import { ChangeHistory } from '../components/serviceChanges/ChangeHistory';

export function ServiceChangeDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  if (!canAccessModule(role, 'serviceChanges')) return <AccessDenied title="Service Changes" module="serviceChanges" />;
  const s = db.serviceChanges.find((x) => x.id === id);
  if (!s || !inUserScope(user, s.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{s ? 'This service change is outside your branch scope.' : 'Service change not found.'}</p>
        <Link to="/service-changes/requests" className={`${linkBtn} mt-2 inline-block`}>
          All requests
        </Link>
      </div>);

  }
  const fin = canSeeCommercial(role);
  const rs = resumptionState(s);
  const resumption = s.resumptionId ? db.serviceChanges.find((x) => x.id === s.resumptionId) : undefined;

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/service-changes/requests" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> All requests
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {s.id} · {s.connectionId}
          </p>
          <h1 className="text-[19px] font-bold text-slate-900">
            {s.type} —{' '}
            <Link to={`/customers/${s.customerId}/service-changes`} className="hover:text-primary">
              {customerName(db, s.customerId)}
            </Link>
          </h1>
          <p className="text-[12px] text-slate-600">
            Requested by {userName(s.requestedById)} · {formatDhaka(s.requestedAt, { year: true })}
          </p>
          <div className="mt-1.5">
            <StatusBadge status={s.status} />
          </div>
        </div>
        <ChangeActions change={s} showAmounts={fin} />
      </header>

      {rs !== 'not-due' &&
      <p role="status" className={`mb-3 flex items-start gap-2 rounded-md px-4 py-2.5 text-[12.5px] text-slate-800 ${rs === 'overdue' ? 'bg-rose-50' : 'bg-amber-50'}`}>
          {rs === 'overdue' ? <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" aria-hidden /> : <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden />}
          {rs === 'overdue' ? `Expected resumption ${formatDhakaDate(s.expectedResumption!)} has passed. The service stays stopped` : `Resumption expected ${formatDhakaDate(s.expectedResumption!)}. Reminder is due`}
          {resumption ? ` — ${resumption.id} is awaiting Technical verification.` : ' — raise a resumption request; Technical must verify before reactivation.'}
        </p>
      }

      <div className="space-y-3">
        <ChangeStatusTrack change={s} />
        <ChangeSummary change={s} showAmounts={fin} />
        {s.type === 'Discontinuation' && <ClearancePanel change={s} showAmounts={fin} />}
        <div className="grid gap-3 xl:grid-cols-2">
          <ImpactPanel change={s} showAmounts={fin} showPayback={canSeePayback(role)} />
          <ChangeHistory change={s} showAmounts={fin} />
        </div>
      </div>
    </div>);

}