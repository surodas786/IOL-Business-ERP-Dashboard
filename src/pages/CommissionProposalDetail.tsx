import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, LockIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { canAccessModule } from '../utils/access';
import { formatBDT, formatDhaka, formatDhakaDate } from '../utils/format';
import { userName } from '../utils/relations';
import { canConfirmEvent, canDecideRates, canPrepare, canSeeCommission, effectiveMrcPct, effectiveOtcPct, financialEffect, periodLabel, usesMrc, usesOtc } from '../utils/agentRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { fieldInput } from '../components/field/fieldStyles';
import { StatusBadge } from '../components/records/StatusBadge';
import { EffectSummary } from '../components/agents/EffectSummary';
import { DecisionDialog } from '../components/agents/DecisionDialog';
import { MoneyEntryDialog } from '../components/associates/MoneyEntryDialog';

function Fact({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-slate-800">{children}</dd>
    </div>);

}

type Dialog = 'decide' | 'event' | 'Cancellation' | 'Refund' | null;

export function CommissionProposalDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [wo, setWo] = useState('');
  if (!canAccessModule(role, 'agents') || !canSeeCommission(role)) return <AccessDenied title="Commission proposals" module="agents" />;
  const p = db.commissionProposals.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">Proposal not found.</p>
        <Link to="/sales-agents/proposals" className={`${linkBtn} mt-2 inline-block`}>
          All proposals
        </Link>
      </div>);

  }
  const agent = db.salesAgents.find((a) => a.id === p.agentId);
  const customer = db.customers.find((c) => c.id === p.customerId);
  const approved = p.status === 'Approved' || p.status === 'Cancelled';
  const proposedFx = financialEffect(p, p.proposedMrcPct, p.proposedOtcPct);
  const approvedFx = financialEffect(p, effectiveMrcPct(p), effectiveOtcPct(p));
  const accruals = db.commissionAccruals.filter((a) => a.proposalId === p.id).sort((a, b) => a.period.localeCompare(b.period));
  const lock = p.workOrderId ? db.workOrders.find((w) => w.id === p.workOrderId)?.commissionLock : undefined;
  const linkable = db.workOrders.filter((w) => w.customerId === p.customerId && !w.commissionLock && w.status !== 'Cancelled');
  const self = p.preparedById === user.id;
  const conn = p.connectionId ? db.connections.find((c) => c.id === p.connectionId) : undefined;
  const hint =
  p.qualifyingEvent === 'Service activation' && conn?.activatedAt ?
  `${conn.id} was activated ${formatDhakaDate(conn.activatedAt)}.` :
  p.qualifyingEvent === 'Service activation' ?
  'No activation recorded yet on the linked service.' :
  undefined;

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/sales-agents/proposals" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> All proposals
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">{p.id}</p>
          <h1 className="text-[19px] font-bold text-slate-900">
            {p.selfSale ? 'Self-Sale' : <Link to={`/sales-agents/records/${agent?.id}`} className="hover:text-primary">{agent?.name}</Link>} —{' '}
            <Link to={`/customers/${p.customerId}`} className="hover:text-primary">
              {customer?.name}
            </Link>
          </h1>
          <p className="text-[12px] text-slate-600">
            Salesperson {userName(p.salespersonId)} · prepared by {userName(p.preparedById)} {formatDhaka(p.preparedAt, { year: true })}
          </p>
          <div className="mt-1.5">
            <StatusBadge status={p.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === 'Pending Approval' && canDecideRates(role) &&
          <button type="button" className={primaryBtn} disabled={self} title={self ? 'You prepared this proposal' : undefined} onClick={() => setDialog('decide')}>
              Approve, revise or reject
            </button>
          }
          {p.status === 'Approved' && !p.event && canConfirmEvent(role) &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('event')}>
              Confirm {p.qualifyingEvent.toLowerCase()}
            </button>
          }
          {p.status === 'Approved' && canConfirmEvent(role) &&
          <>
              <button type="button" className={secondaryBtn} onClick={() => setDialog('Cancellation')}>
                Record cancellation
              </button>
              <button type="button" className={secondaryBtn} onClick={() => setDialog('Refund')}>
                Record refund
              </button>
            </>
          }
        </div>
      </header>

      {p.status === 'Pending Approval' &&
      <p role="status" className="mb-3 rounded-md bg-amber-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          Awaiting the Business Head (Sales Head). {self ? 'You prepared this proposal, so you cannot decide it.' : canDecideRates(role) ? '' : 'Your role cannot approve commission rates.'}
        </p>
      }

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-3">
          <AdminPanel title={p.selfSale ? 'Self-Sale' : 'Commission terms'}>
            {p.selfSale ?
            <p className="px-4 py-3 text-[12.5px] text-slate-700">Sold directly by {userName(p.salespersonId)}. No agent commission accrues on this customer’s sale.</p> :

            <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                <Fact label="Calculation base">
                  {p.basis}
                  {usesMrc(p.basis) && <span className="block text-[11.5px] text-slate-500">MRC {formatBDT(p.mrc)}{conn ? ` (${conn.id})` : ''}</span>}
                  {usesOtc(p.basis) && <span className="block text-[11.5px] text-slate-500">OTC {formatBDT(p.otc)}</span>}
                </Fact>
                <Fact label="Proposed rate">
                  {usesMrc(p.basis) && <span className="block">{p.proposedMrcPct}% of MRC</span>}
                  {usesOtc(p.basis) && <span className="block">{p.proposedOtcPct}% of OTC</span>}
                </Fact>
                <Fact label="Approved rate">
                  {approved ?
                <>
                      {usesMrc(p.basis) && <span className={`block ${p.approvedMrcPct !== p.proposedMrcPct ? 'font-semibold text-status-warning' : ''}`}>{p.approvedMrcPct}% of MRC</span>}
                      {usesOtc(p.basis) && <span className={`block ${p.approvedOtcPct !== p.proposedOtcPct ? 'font-semibold text-status-warning' : ''}`}>{p.approvedOtcPct}% of OTC</span>}
                    </> :

                '—'
                }
                </Fact>
                <Fact label="Arrangement and duration">{usesMrc(p.basis) ? p.arrangement === 'Recurring' ? `Recurring · ${p.months} months` : 'One-time · first month MRC' : 'One-time'}</Fact>
                <Fact label="Qualifying event">
                  {p.qualifyingEvent}
                  {p.event && <span className="block text-[11.5px] text-status-ok">Confirmed {formatDhakaDate(p.event.at)} · {p.event.evidence}</span>}
                </Fact>
                <Fact label="Cancellation / refund">
                  {p.cancellationTreatment}
                  {p.clawbackMonths > 0 && <span className="block text-[11.5px] text-slate-500">Clawback window {p.clawbackMonths} months after the event</span>}
                </Fact>
                <Fact label="Validity">{`${formatDhakaDate(p.validFrom)} – ${formatDhakaDate(p.validTo)}`}</Fact>
                {p.decidedById && <Fact label="Decided by">{`${userName(p.decidedById)} · ${formatDhakaDate(p.decidedAt!)}`}</Fact>}
              </dl>
            }
          </AdminPanel>

          {!p.selfSale &&
          <div className="grid gap-3 lg:grid-cols-2">
              <AdminPanel title="Financial effect — proposed">
                <div className="p-3">
                  <EffectSummary effect={proposedFx} compact />
                </div>
              </AdminPanel>
              {approved &&
            <AdminPanel title="Financial effect — approved">
                  <div className="p-3">
                    <EffectSummary effect={approvedFx} compact />
                  </div>
                </AdminPanel>
            }
            </div>
          }

          {p.revisions.length > 0 &&
          <AdminPanel title="Rate changes during approval" description="Every change is recorded with its reason.">
              <ul className="divide-y divide-slate-100">
                {p.revisions.map((r, i) =>
              <li key={i} className="px-4 py-2.5 text-[12.5px]">
                    <span className="font-semibold text-slate-900">
                      {r.field}: {r.from}% → {r.to}%
                    </span>
                    <span className="block text-slate-700">{r.reason}</span>
                    <span className="block text-[11px] text-slate-500">
                      {userName(r.byId)} · {formatDhaka(r.at)}
                    </span>
                  </li>
              )}
              </ul>
            </AdminPanel>
          }

          {!p.selfSale &&
          <AdminPanel title="Accruals" description={p.event ? undefined : `Nothing accrues until the ${p.qualifyingEvent.toLowerCase()} is confirmed.`}>
              <ul className="divide-y divide-slate-100">
                {accruals.map((a) =>
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[12px]">
                    <span>
                      <span className="font-semibold text-slate-900">{periodLabel(a.period)}</span> · {a.component === 'Clawback' ? 'Clawback of paid commission' : `${a.pct}% of ${a.component}`}
                      {a.reversalReason && <span className="block text-[11px] text-slate-500">{a.reversalReason}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`tabular-nums ${a.status === 'Reversed' ? 'text-slate-400 line-through' : a.amount < 0 ? 'text-status-critical' : 'text-slate-900'}`}>{formatBDT(a.amount)}</span>
                      <StatusBadge status={a.status} />
                    </span>
                  </li>
              )}
                {!accruals.length && <li className="px-4 py-5 text-center text-[12px] text-slate-500">No accruals yet.</li>}
              </ul>
            </AdminPanel>
          }
        </div>

        <div className="space-y-3">
          <AdminPanel title="Work order lock">
            <div className="px-4 py-3 text-[12.5px]">
              {lock ?
              <p className="flex items-start gap-2 text-slate-700">
                  <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  <span>
                    Locked into{' '}
                    <Link to={`/quotations/wo/${p.workOrderId}`} className="font-semibold text-primary hover:text-primary-hover">
                      {p.workOrderId}
                    </Link>{' '}
                    on {formatDhakaDate(lock.lockedAt)} — {lock.selfSale ? 'Self-Sale, no commission' : `${usesMrc(lock.basis) ? `${lock.mrcPct}% MRC` : ''}${usesMrc(lock.basis) && usesOtc(lock.basis) ? ' + ' : ''}${usesOtc(lock.basis) ? `${lock.otcPct}% OTC` : ''}`}. The rate cannot change on this order.
                  </span>
                </p> :
              p.workOrderId ?
              <p className="text-slate-600">{p.workOrderId} will receive the rate when the proposal is approved.</p> :
              (p.status === 'Approved' || p.status === 'Self-Sale') && canPrepare(role) ?
              <div className="flex gap-2">
                  <select aria-label="Work order" className={fieldInput} value={wo} onChange={(e) => setWo(e.target.value)}>
                    <option value="">Choose work order…</option>
                    {linkable.map((w) =>
                  <option key={w.id} value={w.id}>
                        {w.id} · {w.type}
                      </option>
                  )}
                  </select>
                  <button type="button" className={primaryBtn} disabled={!wo} onClick={() => runAction({ type: 'AGT_LINK_WORK_ORDER', proposalId: p.id, workOrderId: wo }) && setWo('')}>
                    Lock
                  </button>
                </div> :

              <p className="text-slate-500">No work order linked.</p>
              }
            </div>
          </AdminPanel>

          <AdminPanel title="History">
            <ol className="divide-y divide-slate-100">
              {[...p.history].reverse().map((h, i) =>
              <li key={i} className="px-4 py-2 text-[12px]">
                  <span className="text-slate-800">{h.detail}</span>
                  <span className="block text-[11px] text-slate-500">
                    {userName(h.byId)} · {formatDhaka(h.at)}
                  </span>
                </li>
              )}
            </ol>
          </AdminPanel>
        </div>
      </div>

      <AnimatePresence>
        {dialog === 'decide' && <DecisionDialog key="d" proposal={p} onClose={() => setDialog(null)} />}
        {dialog === 'event' &&
        <MoneyEntryDialog
          key="e"
          title={`Confirm ${p.qualifyingEvent.toLowerCase()}`}
          description={`Commission accrues only from this event. It must fall within the validity (${formatDhakaDate(p.validFrom)} – ${formatDhakaDate(p.validTo)}).${hint ? ` ${hint}` : ''}`}
          submitLabel="Confirm and accrue"
          fields={{ reference: 'Evidence (activation record, invoice or receipt number)', date: 'Event date' }}
          onSubmit={(v) => runAction({ type: 'AGT_CONFIRM_EVENT', proposalId: p.id, at: v.at, evidence: v.reference })}
          onClose={() => setDialog(null)} />

        }
        {(dialog === 'Cancellation' || dialog === 'Refund') &&
        <MoneyEntryDialog
          key="c"
          title={`Record ${dialog.toLowerCase()}`}
          description={`Treatment: ${p.cancellationTreatment.toLowerCase()}${p.clawbackMonths ? ` (${p.clawbackMonths}-month window)` : ''}. Unpaid accruals are reversed and no further months accrue.`}
          submitLabel={`Record ${dialog.toLowerCase()}`}
          fields={{ date: `${dialog} date`, text: { label: 'What happened', min: 10 } }}
          onSubmit={(v) => runAction({ type: 'AGT_RECORD_CANCELLATION', proposalId: p.id, at: v.at, kind: dialog, note: v.text })}
          onClose={() => setDialog(null)} />

        }
      </AnimatePresence>
    </div>);

}