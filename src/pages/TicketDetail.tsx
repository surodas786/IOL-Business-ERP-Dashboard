import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PaperclipIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useDemoNow } from '../hooks/useDemoNow';
import { canAccessModule, inUserScope } from '../utils/access';
import { formatDhaka } from '../utils/format';
import { userName } from '../utils/relations';
import { escalationHistory } from '../utils/ticketRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, linkBtn } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { SlaClocks } from '../components/tickets/SlaClocks';
import { TicketActions } from '../components/tickets/TicketActions';
import { ResolutionPanel } from '../components/tickets/ResolutionPanel';

function Fact({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-slate-800">{children}</dd>
    </div>);

}

export function TicketDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const now = useDemoNow();
  if (!canAccessModule(role, 'tickets')) return <AccessDenied title="Support Tickets" module="tickets" />;
  const t = db.tickets.find((x) => x.id === id);
  if (!t || !inUserScope(user, t.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{t ? 'This ticket is outside your branch scope.' : 'Ticket not found.'}</p>
        <Link to="/support-tickets" className={`${linkBtn} mt-2 inline-block`}>
          All tickets
        </Link>
      </div>);

  }
  const customer = db.customers.find((c) => c.id === t.customerId);
  const site = db.sites.find((s) => s.id === t.siteId);
  const conn = t.connectionId ? db.connections.find((c) => c.id === t.connectionId) : undefined;
  const escalations = escalationHistory(t, now);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/support-tickets" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> All tickets
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {t.id} · created {formatDhaka(t.openedAt, { year: true })}
          </p>
          <h1 className="text-[19px] font-bold text-slate-900">{t.subject}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={t.status} />
            <StatusBadge status={t.priority} />
            {t.simulated && <span className="rounded bg-slate-100 px-1.5 py-px text-[10.5px] font-semibold text-slate-600">Simulated incoming {t.simulated.toLowerCase()} — sample data</span>}
            {(t.reopenCount ?? 0) > 0 && <span className="text-[11px] font-semibold text-status-warning">Reopened {t.reopenCount}×</span>}
          </div>
        </div>
        <TicketActions ticket={t} />
      </header>

      <div className="mb-3">
        <SlaClocks ticket={t} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-3">
          <AdminPanel title="Ticket">
            <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Customer">
                <Link to={`/customers/${t.customerId}/tickets`} className="font-semibold text-primary hover:text-primary-hover">
                  {customer?.name}
                </Link>
                {customer && <span className="block text-[11px] text-slate-500">Account Manager {userName(customer.accountManagerId)}</span>}
              </Fact>
              <Fact label="Service">{conn ? `${conn.id} · ${conn.serviceType} ${conn.bandwidthMbps} Mbps` : 'Not service-specific'}</Fact>
              <Fact label="Site">
                {site?.name}
                <span className="block text-[11px] text-slate-500">{site?.address}</span>
              </Fact>
              <Fact label="Source">{t.source ?? '—'}</Fact>
              <Fact label="Issue category">{t.category ?? '—'}</Fact>
              <Fact label="Reported by">
                {t.callerName ?? '—'}
                {t.callerContact && <span className="block text-[11px] text-slate-500">{t.callerContact}</span>}
              </Fact>
              <Fact label="Assigned team">{t.team ?? '—'}</Fact>
              <Fact label="Technician">{t.assigneeName ?? <span className="text-status-warning">Unassigned</span>}</Fact>
              <Fact label="Created by">{t.createdByName ?? '—'}</Fact>
            </dl>
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10.5px] font-semibold text-slate-400">Description</p>
              <p className="mt-0.5 whitespace-pre-line text-[12.5px] text-slate-800">{t.description ?? '—'}</p>
              {t.firstResponseAt &&
              <p className="mt-2 text-[12px] text-slate-700">
                  <span className="font-semibold">First response</span> by {t.firstResponseByName} · {formatDhaka(t.firstResponseAt)} — {t.firstResponseNote}
                </p>
              }
            </div>
          </AdminPanel>

          <ResolutionPanel ticket={t} />

          {(t.holds ?? []).length > 0 &&
          <AdminPanel title="Holds">
              <ul className="divide-y divide-slate-100">
                {t.holds!.map((h, i) =>
              <li key={i} className="px-4 py-2.5 text-[12px]">
                    <p className="font-semibold text-slate-900">{h.reason}</p>
                    <p className="text-slate-700">{h.note}</p>
                    <p className="text-[11px] text-slate-500">
                      {h.byName} · {formatDhaka(h.from)} – {h.to ? formatDhaka(h.to) : 'ongoing'} · {h.pausesSla ? 'SLA paused (policy allows)' : 'SLA kept running'}
                    </p>
                  </li>
              )}
              </ul>
            </AdminPanel>
          }
        </div>

        <div className="space-y-3">
          <AdminPanel title="Escalation history">
            <ol className="divide-y divide-slate-100">
              {escalations.map((e, i) =>
              <li key={i} className="px-4 py-2.5 text-[12px]">
                  <p>
                    <span className="font-semibold text-slate-900">Level {e.level}</span> <span className="text-slate-600">→ {e.to}</span>
                  </p>
                  <p className="text-slate-700">{e.reason}</p>
                  <p className="text-[11px] text-slate-500">
                    {e.kind === 'Automatic' ? 'Automatic (policy)' : `Manual · ${e.byName}`} · {formatDhaka(e.at)}
                  </p>
                </li>
              )}
              {!escalations.length && <li className="px-4 py-5 text-center text-[12px] text-slate-500">No escalations.</li>}
            </ol>
          </AdminPanel>

          <AdminPanel title="Attachments" description="File names only in this demo.">
            <ul className="divide-y divide-slate-100">
              {(t.attachments ?? []).map((a, i) =>
              <li key={i} className="flex items-center gap-2 px-4 py-2 text-[12px]">
                  <PaperclipIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-slate-800">{a.name}</span>
                  <span className="whitespace-nowrap text-[11px] text-slate-500">
                    {a.sizeKb} KB · {a.byName}
                  </span>
                </li>
              )}
              {!(t.attachments ?? []).length && <li className="px-4 py-5 text-center text-[12px] text-slate-500">No attachments.</li>}
            </ul>
          </AdminPanel>

          <AdminPanel title="Activity">
            <ol className="divide-y divide-slate-100">
              {[...(t.events ?? [])].reverse().map((e, i) =>
              <li key={i} className="px-4 py-2 text-[12px]">
                  <p>
                    <span className="font-semibold text-slate-900">{e.kind}</span> <span className="text-slate-700">{e.detail}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {e.byName} · {formatDhaka(e.at)}
                  </p>
                </li>
              )}
            </ol>
          </AdminPanel>
        </div>
      </div>
    </div>);

}