import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, GitPullRequestArrowIcon, LockIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { hasPermission, inUserScope } from '../utils/access';
import { formatDhaka } from '../utils/format';
import { customerName, userName } from '../utils/relations';
import { redactAmounts } from '../utils/customerProfile';
import { canOpenQuotePage, canOpenWorkOrderPage, currentSnapshot, seesAccountsHandover, seesQuoteMoney, seesTechnicalHandover } from '../utils/quoteRules';
import { canSeeCommission as seesCommission } from '../utils/agentRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { HandoverPanel } from '../components/quotations/HandoverPanel';
import { WoChangeDialog } from '../components/quotations/WoChangeDialog';
import type { Department } from '../types/quotation';

export function WorkOrderDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const [changing, setChanging] = useState(false);
  const [viewVersion, setViewVersion] = useState<number | null>(null);

  if (!canOpenWorkOrderPage(role)) return <AccessDenied title="Work orders" module="quotations" />;
  const w = db.workOrders.find((x) => x.id === id);
  const latest = w && currentSnapshot(w);
  if (!w || !inUserScope(user, w.branchId) || !latest) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{w && !inUserScope(user, w.branchId) ? 'This work order is outside your branch scope.' : w ? 'This work order was raised before versioned snapshots and has no handover.' : 'Work order not found.'}</p>
        <Link to="/" className={`${linkBtn} mt-2 inline-block`}>
          Back to dashboard
        </Link>
      </div>);

  }

  const s = w.snapshots!.find((x) => x.version === viewVersion) ?? latest;
  const departments: Department[] = [...(seesTechnicalHandover(role) ? ['Technical'] as const : []), ...(seesAccountsHandover(role) ? ['Accounts'] as const : [])];
  const job = db.installationJobs.find((j) => j.workOrderId === w.id);
  const changes = db.changeRequests.filter((c) => c.target.id === w.id);
  const canChange = (hasPermission(role, 'createQuotation') || hasPermission(role, 'manageWorkOrders')) && w.status !== 'Cancelled' && w.status !== 'Completed';
  const money = seesQuoteMoney(role);
  const hiddenDept = 2 - departments.length;

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to={role.modules.includes('quotations') ? '/quotations/work-orders' : '/'} className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> {role.modules.includes('quotations') ? 'Work orders' : 'Dashboard'}
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {w.id} · from {canOpenQuotePage(role) ? <Link to={`/quotations/records/${s.quotationId}`} className="text-primary hover:text-primary-hover">{s.quotationId} v{s.quotationVersion}</Link> : `${s.quotationId} v${s.quotationVersion}`}
            {job && ` · ${job.id}`}
          </p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{customerName(db, w.customerId)}</h1>
          <p className="text-[12.5px] text-slate-600">
            {w.type} · {s.terms.siteName} · {s.terms.serviceType} {s.terms.bandwidthMbps} Mbps
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={w.status} />
            <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500">
              <LockIcon className="h-3 w-3" aria-hidden /> Snapshot v{latest.version} locked {formatDhaka(latest.lockedAt)} by {userName(latest.lockedById)}
            </span>
          </div>
        </div>
        {canChange &&
        <button type="button" className={secondaryBtn} onClick={() => setChanging(true)} disabled={changes.some((c) => c.status === 'Pending')}>
            <GitPullRequestArrowIcon className="h-3.5 w-3.5" aria-hidden /> Request revision or cancellation
          </button>
        }
      </header>

      {w.status === 'Cancelled' && w.cancelReason &&
      <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          <span className="font-semibold">Cancelled:</span> {w.cancelReason}. Locked snapshots are kept for audit.
        </p>
      }
      {s.version !== latest.version &&
      <p className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          Viewing superseded snapshot v{s.version}.
          <button type="button" className={linkBtn} onClick={() => setViewVersion(null)}>
            Back to current v{latest.version}
          </button>
        </p>
      }

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {departments.map((d) =>
          <HandoverPanel key={`${d}-${s.version}`} workOrder={w} snapshot={s} department={d} />
          )}
          {hiddenDept > 0 &&
          <p className="text-[11px] text-slate-400">
              The {departments.includes('Technical') ? 'Accounts' : 'Technical'} handover is hidden for {role.label}.{' '}
              {departments.includes('Technical') ? 'Billing terms, margins and commissions are not shown to technical roles.' : 'Network configuration is not shown to accounts roles.'}
            </p>
          }
        </div>

        <aside className="space-y-3">
          {w.commissionLock &&
          <section aria-label="Agent commission lock" className="rounded-md border border-slate-200 bg-white px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
                <LockIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden /> Agent commission
              </h2>
              <p className="mt-1 text-[12px] text-slate-700">
                {w.commissionLock.selfSale ?
              'Self-Sale — no agent commission.' :
              `${db.salesAgents.find((a) => a.id === w.commissionLock!.agentId)?.name ?? 'Agent'} · ${
              seesCommission(role) ?
              [w.commissionLock.basis !== 'OTC' ? `${w.commissionLock.mrcPct}% of MRC${w.commissionLock.arrangement === 'Recurring' ? ` × ${w.commissionLock.months} months` : ' (first month)'}` : '', w.commissionLock.basis !== 'MRC' ? `${w.commissionLock.otcPct}% of OTC` : ''].filter(Boolean).join(' + ') :
              'rate hidden for your role'}`
              }
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Approved rate locked {formatDhaka(w.commissionLock.lockedAt)} from{' '}
                {role.modules.includes('agents') && seesCommission(role) ?
              <Link to={`/sales-agents/proposals/${w.commissionLock.proposalId}`} className="text-primary hover:text-primary-hover">
                    {w.commissionLock.proposalId}
                  </Link> :

              w.commissionLock.proposalId
              }
              </p>
            </section>
          }
          <section aria-label="Release checklist at lock" className="rounded-md border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-[13px] font-bold text-slate-900">Release checklist (as locked)</h2>
            </header>
            <ul className="divide-y divide-slate-100">
              {s.checklist.map((c) =>
              <li key={c.key} className="px-4 py-1.5 text-[12px]">
                  <span className={c.applicable ? 'font-semibold text-slate-800' : 'text-slate-500'}>{c.label}</span>
                  <span className="block text-[11px] text-slate-500">{money ? c.detail : redactAmounts(c.detail)}</span>
                </li>
              )}
            </ul>
          </section>

          <section aria-label="Snapshots and change requests" className="rounded-md border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-[13px] font-bold text-slate-900">Snapshots and changes</h2>
              <p className="text-[11px] text-slate-500">Earlier snapshots are never edited.</p>
            </header>
            <ul className="divide-y divide-slate-100">
              {[...w.snapshots!].reverse().map((x) =>
              <li key={x.version}>
                  <button type="button" onClick={() => setViewVersion(x.version)} className={`block w-full px-4 py-2 text-left transition-colors duration-150 ${x.version === s.version ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
                    <span className="flex items-center justify-between gap-2 text-[12.5px] font-semibold text-slate-900">
                      Snapshot v{x.version}
                      <StatusBadge status={x.version === latest.version ? w.status === 'Cancelled' ? 'Cancelled' : 'Active' : 'Superseded'} />
                    </span>
                    <span className="block text-[11px] text-slate-600">{x.reason}</span>
                    <span className="block text-[10.5px] text-slate-400">
                      {userName(x.lockedById)} · {formatDhaka(x.lockedAt)}
                    </span>
                  </button>
                </li>
              )}
              {changes.map((c) =>
              <li key={c.id} className="px-4 py-2">
                  <span className="flex items-center justify-between gap-2 text-[12.5px] font-semibold text-slate-900">
                    {c.id} · {c.kind}
                    <StatusBadge status={c.status} />
                  </span>
                  <span className="block text-[11px] text-slate-600">{c.reason}</span>
                  {c.proposed &&
                <span className="block text-[11px] text-slate-500">
                      Proposed:{' '}
                      {Object.entries(c.proposed).
                  filter(([k]) => money || k !== 'mrc').
                  map(([k, v]) => `${k === 'bandwidthMbps' ? 'bandwidth' : k === 'leadTimeDays' ? 'lead time' : k === 'contractMonths' ? 'contract' : 'MRC'} ${v}`).
                  join(', ')}
                    </span>
                }
                  <span className="block text-[10.5px] text-slate-400">
                    {userName(c.requestedById)} · {formatDhaka(c.requestedAt)}
                    {c.decidedAt && ` · ${c.status.toLowerCase()} by ${userName(c.decidedById)}`}
                  </span>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <AnimatePresence>{changing && <WoChangeDialog key="change" workOrderId={w.id} snapshot={latest} showMoney={money} onClose={() => setChanging(false)} />}</AnimatePresence>
    </div>);

}