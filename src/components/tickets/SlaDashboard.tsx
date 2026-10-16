import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useDemoNow } from '../../hooks/useDemoNow';
import { slaPolicies } from '../../data/supportConfig';
import { formatDhaka } from '../../utils/format';
import { escalationHistory, formatSpan, isOpen, resolutionClock, responseClock } from '../../utils/ticketRules';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { SlaChip } from './SlaChip';
import type { Ticket } from '../../types/records';

const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—';
const hrs = (m: number) => m < 60 ? `${m} min` : `${m / 60} h`;

export function SlaDashboard({ tickets }: {tickets: Ticket[];}) {
  const { db } = useData();
  const now = useDemoNow();
  const open = tickets.filter(isOpen);
  const res = open.map((t) => ({ t, r: resolutionClock(t, now), s: responseClock(t, now) }));
  const breached = res.filter((x) => x.r.state === 'breached');
  const atRisk = res.filter((x) => x.r.state !== 'breached' && x.r.usedPct >= 75);
  const awaitingResponse = res.filter((x) => !x.t.firstResponseAt);
  const responded = tickets.filter((t) => t.firstResponseAt);
  const responseMet = responded.filter((t) => responseClock(t, now).state === 'met').length;
  const done = tickets.filter((t) => t.resolution && !isOpen(t));
  const resolutionMet = done.filter((t) => resolutionClock(t, now).state === 'met').length;
  const queue = [...res].sort((a, b) => a.r.remainingMs - b.r.remainingMs);
  const escalations = tickets.
  flatMap((t) => escalationHistory(t, now).map((e) => ({ ...e, t }))).
  sort((a, b) => b.at.localeCompare(a.at)).
  slice(0, 12);

  const figure = (label: string, value: React.ReactNode, note: string, tone = 'text-slate-900') =>
  <div className="px-4 py-3">
      <dt className="text-[11.5px] font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-[22px] font-bold tabular-nums ${tone}`}>{value}</dd>
      <p className="text-[11px] text-slate-500">{note}</p>
    </div>;


  return (
    <div className="space-y-3">
      <dl className="grid divide-y divide-slate-100 rounded-md border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
        <div className="lg:col-span-1">{figure('Resolution breached', breached.length, 'Open tickets past their target', breached.length ? 'text-status-critical' : 'text-slate-900')}</div>
        {figure('At risk', atRisk.length, '75%+ of the window used', atRisk.length ? 'text-status-warning' : 'text-slate-900')}
        {figure('Awaiting first response', awaitingResponse.length, `${awaitingResponse.filter((x) => x.s.state === 'breached').length} past the response target`)}
        {figure('First response met', pct(responseMet, responded.length), `${responseMet} of ${responded.length} responded tickets`)}
        {figure('Resolution met', pct(resolutionMet, done.length), `${resolutionMet} of ${done.length} resolved or closed`)}
      </dl>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminPanel title="Countdown queue" description="Open tickets, nearest resolution target first. Paused clocks only where the configured policy allows.">
          <ul className="divide-y divide-slate-100">
            {queue.map(({ t }) =>
            <li key={t.id}>
                <Link to={`/support-tickets/records/${t.id}`} className="grid gap-1 px-4 py-2.5 transition-colors duration-150 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_130px_150px] sm:items-center">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[10.5px] text-slate-400">{t.id}</span>
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-slate-900">{t.subject}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {db.customers.find((c) => c.id === t.customerId)?.name} · {t.assigneeName ?? 'Unassigned'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Response
                    <span className="block">
                      <SlaChip ticket={t} kind="response" />
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Resolution
                    <span className="block">
                      <SlaChip ticket={t} kind="resolution" />
                    </span>
                  </span>
                </Link>
              </li>
            )}
            {!queue.length && <li className="px-4 py-8 text-center text-[12px] text-slate-500">No open tickets.</li>}
          </ul>
        </AdminPanel>

        <AdminPanel title="Escalation history" description="Automatic steps come from the policy thresholds; manual escalations carry a reason.">
          <ol className="divide-y divide-slate-100">
            {escalations.map((e, i) =>
            <li key={`${e.t.id}-${i}`} className="px-4 py-2.5 text-[12px]">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">Level {e.level}</span>
                  <span className="text-slate-600">→ {e.to}</span>
                </p>
                <p className="text-slate-700">
                  <Link to={`/support-tickets/records/${e.t.id}`} className="font-mono text-[11px] text-primary hover:text-primary-hover">
                    {e.t.id}
                  </Link>{' '}
                  · {e.reason}
                </p>
                <p className="text-[11px] text-slate-500">
                  {e.kind === 'Automatic' ? 'Automatic' : `Manual · ${e.byName}`} · {formatDhaka(e.at)}
                </p>
              </li>
            )}
            {!escalations.length && <li className="px-4 py-8 text-center text-[12px] text-slate-500">No escalations.</li>}
          </ol>
        </AdminPanel>
      </div>

      <AdminPanel title="SLA policy and compliance by priority" description="Configured policy. Timers pause on hold only for the listed reasons; reopened tickets keep their original resolution target.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                {['Priority', 'First response', 'Resolution', 'Escalates at', 'Hold reasons that pause', 'Open', 'Response met', 'Resolution met'].map((h) =>
                <th key={h} className={thClass}>
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {slaPolicies.map((p) => {
                const mine = tickets.filter((t) => t.priority === p.priority);
                const r = mine.filter((t) => t.firstResponseAt);
                const d = mine.filter((t) => t.resolution && !isOpen(t));
                return (
                  <tr key={p.priority}>
                    <td className={tdClass}>
                      <StatusBadge status={p.priority} />
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{hrs(p.responseMinutes)}</td>
                    <td className={`${tdClass} tabular-nums`}>{hrs(p.resolutionMinutes)}</td>
                    <td className={`${tdClass} tabular-nums`}>{p.warnAtPct}% · breach</td>
                    <td className={`${tdClass} text-[11.5px]`}>{p.pauseReasons.length ? p.pauseReasons.join(', ') : <span className="font-semibold text-slate-800">Never pauses</span>}</td>
                    <td className={`${tdClass} tabular-nums`}>{mine.filter(isOpen).length}</td>
                    <td className={`${tdClass} tabular-nums`}>{pct(r.filter((t) => responseClock(t, now).state === 'met').length, r.length)}</td>
                    <td className={`${tdClass} tabular-nums`}>{pct(d.filter((t) => resolutionClock(t, now).state === 'met').length, d.length)}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Longest open breach: {breached.length ? formatSpan(Math.min(...breached.map((b) => b.r.remainingMs))) : 'none'}.</p>
      </AdminPanel>
    </div>);

}