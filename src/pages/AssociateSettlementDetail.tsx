import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangleIcon, ArrowLeftIcon, BellIcon, LockIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { formatBDT, formatDhaka, formatDhakaDate } from '../utils/format';
import { userName } from '../utils/relations';
import { DUE_LABEL, canSeeAssociateMoney, dueState, periodLabel, rulesChangedSince } from '../utils/associateRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, linkBtn } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { SettlementActions } from '../components/associates/SettlementActions';
import { SettlementPosition } from '../components/associates/SettlementPosition';
import { SETTLEMENT_FLOW } from '../types/associate';

export function AssociateSettlementDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  if (!canAccessModule(role, 'associates') || !canSeeAssociateMoney(role)) return <AccessDenied title="Associate settlements" module="associates" />;
  const s = db.associateSettlements.find((x) => x.id === id);
  const a = s && db.associates.find((x) => x.id === s.associateId);
  if (!s || !a || !inUserScope(user, a.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">Settlement not found or outside your scope.</p>
        <Link to="/associates/settlements" className={`${linkBtn} mt-2 inline-block`}>
          All settlements
        </Link>
      </div>);

  }
  const st = dueState(a, s);
  const locked = s.status !== 'Draft';
  const changed = locked && rulesChangedSince(db, s);
  const step = SETTLEMENT_FLOW.indexOf(s.status);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/associates/settlements" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> All settlements
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {s.id} · {s.model}
          </p>
          <h1 className="text-[19px] font-bold text-slate-900">
            {periodLabel(s.period)} —{' '}
            <Link to={`/associates/records/${a.id}`} className="hover:text-primary">
              {a.name}
            </Link>
          </h1>
          <p className="text-[12px] text-slate-600">
            {s.payout ? `IOL pays ${formatBDT(s.payout)}` : `Associate owes ${formatBDT(s.receivable)}`} · due {formatDhakaDate(s.dueDate)}
          </p>
        </div>
        <SettlementActions settlement={s} />
      </header>

      <ol aria-label="Settlement progress" className="mb-3 flex flex-wrap gap-1">
        {SETTLEMENT_FLOW.map((f, i) =>
        <li key={f} aria-current={i === step ? 'step' : undefined} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${i < step ? 'bg-emerald-50 text-status-ok' : i === step ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>
            {f}
          </li>
        )}
      </ol>

      {(st === 'suspension' || st === 'overdue' || st === 'reminder') &&
      <p role="status" className={`mb-3 flex items-start gap-2 rounded-md px-4 py-2.5 text-[12.5px] text-slate-800 ${st === 'reminder' ? 'bg-amber-50' : 'bg-rose-50'}`}>
          {st === 'reminder' ? <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden /> : <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" aria-hidden />}
          {DUE_LABEL[st]} — due {formatDhakaDate(s.dueDate)}, grace {a.graceDays ?? 0} days.
          {st === 'suspension' && ` Associate status: ${a.status ?? 'Active'}.`}
        </p>
      }
      {changed &&
      <p role="status" className="mb-3 flex items-start gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-[12.5px] text-slate-800">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          Settlement rules for this month changed after these figures were calculated. The settlement has not been recalculated; raise a dispute or adjust a future settlement if needed.
        </p>
      }

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-3">
          <AdminPanel title="Calculation" description={`Calculated ${formatDhaka(s.calculatedAt)}${locked ? ' · locked' : ' · recalculates with current rules until reviewed'}`}>
            <dl className="divide-y divide-slate-100">
              {s.lines.map((l, i) =>
              <div key={i} className="flex items-baseline justify-between gap-4 px-4 py-2 text-[12.5px]">
                  <dt className="text-slate-700">
                    {l.label}
                    {l.note && <span className="block text-[11px] text-slate-500">{l.note}</span>}
                  </dt>
                  <dd className={`shrink-0 tabular-nums ${i === s.lines.length - 1 ? 'text-[14px] font-bold text-slate-900' : l.amount < 0 ? 'text-slate-500' : 'text-slate-900'}`}>{formatBDT(l.amount)}</dd>
                </div>
              )}
            </dl>
            <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
              Inputs: invoiced {formatBDT(s.inputs.invoiced)} · collected {formatBDT(s.inputs.collected)} · {s.inputs.subscribers} subscribers
              {s.declaration && ` · declaration ${s.declaration.reference}`}
              {s.rulesUsed.length > 0 && ` · rules ${s.rulesUsed.map((r) => r.id).join(', ')}`}
            </p>
          </AdminPanel>
          {s.receivable > 0 && <SettlementPosition settlement={s} />}
          {s.payout > 0 && s.paymentReference &&
          <AdminPanel title="Payout">
              <p className="px-4 py-3 text-[12.5px] text-slate-700">
                {formatBDT(s.payout)} paid {s.paidAt ? formatDhakaDate(s.paidAt) : ''} · {s.paymentReference}
              </p>
            </AdminPanel>
          }
        </div>
        <AdminPanel title="History">
          <ol className="divide-y divide-slate-100">
            {[...s.history].reverse().map((h, i) =>
            <li key={i} className="px-4 py-2 text-[12px]">
                <span className="text-slate-800">{h.detail}</span>
                <span className="block text-[11px] text-slate-500">
                  {userName(h.byId)} · {formatDhaka(h.at)}
                </span>
              </li>
            )}
          </ol>
          <div className="border-t border-slate-100 px-4 py-2">
            <StatusBadge status={s.status} />
          </div>
        </AdminPanel>
      </div>
    </div>);

}