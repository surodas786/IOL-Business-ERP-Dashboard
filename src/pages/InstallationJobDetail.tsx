import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { formatDhaka } from '../utils/format';
import { branchName, customerName, userName, zoneName } from '../utils/relations';
import { canOpenJobPage, canWorkJob, canDispatch, jobNextStep, seesTechnicalForms } from '../utils/installationRules';
import { canOpenWorkOrderPage } from '../utils/quoteRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn } from '../components/admin/AdminPanel';
import { JobActions } from '../components/installations/JobActions';
import { JobDates } from '../components/installations/JobDates';
import { BillingReviewPanel } from '../components/installations/BillingReviewPanel';
import { MaterialsPanel } from '../components/installations/MaterialsPanel';
import { useJobDialogs } from '../components/installations/useJobDialogs';
import { JOB_FLOW } from '../types/installation';

export function InstallationJobDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const job = db.installationJobs.find((j) => j.id === id);
  const { open, node } = useJobDialogs(job);

  if (!canOpenJobPage(role)) return <AccessDenied title="Installation Jobs" module="installations" />;
  if (!job || !inUserScope(user, job.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{job ? 'This job is outside your branch scope.' : 'Installation job not found.'}</p>
        <Link to="/" className={`${linkBtn} mt-2 inline-block`}>
          Back to dashboard
        </Link>
      </div>);

  }

  const tech = seesTechnicalForms(role);
  const site = db.sites.find((s) => s.id === job.siteId);
  const conn = db.connections.find((c) => c.id === job.connectionId);
  const c = job.completion;
  const flowIndex = JOB_FLOW.indexOf(job.status === 'On Hold' ? job.hold?.resumeTo ?? 'Scheduled' : job.status);
  const canRequest = canWorkJob(role, user, job) || canDispatch(role);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to={canAccessModule(role, 'installations') ? '/installations' : '/'} className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> {canAccessModule(role, 'installations') ? 'Installation jobs' : 'Dashboard'}
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {job.id} ·{' '}
            {canOpenWorkOrderPage(role) ?
            <Link to={`/quotations/wo/${job.workOrderId}`} className="text-primary hover:text-primary-hover">
                {job.workOrderId}
              </Link> :

            job.workOrderId
            }{' '}
            · {job.connectionId}
          </p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{customerName(db, job.customerId)}</h1>
          <p className="text-[12.5px] text-slate-600">
            {conn ? `${conn.serviceType} · ${conn.bandwidthMbps} Mbps` : 'Service'} · {site?.name} — {site?.address}
          </p>
          <p className="text-[12px] text-slate-500">
            {branchName(job.branchId)}, {zoneName(job.zoneId)} · Technician {job.technicianName || 'not assigned'} · {job.status === 'Pending Assignment' || job.status === 'Assigned' ? 'target' : 'visit'} {formatDhaka(job.scheduledAt, { year: true })}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-[11.5px] text-slate-500">{jobNextStep(job)}</span>
          </div>
        </div>
        {tech && <JobActions job={job} open={open} />}
      </header>

      <ol aria-label="Job progress" className="mb-3 flex overflow-x-auto rounded-md border border-slate-200 bg-white">
        {JOB_FLOW.filter((s) => s !== 'On Hold').map((s, i) => {
          const idx = JOB_FLOW.indexOf(s);
          const done = idx < flowIndex || job.status === 'Closed';
          const current = s === job.status || job.status === 'On Hold' && idx === flowIndex;
          return (
            <li key={s} className={`flex-1 whitespace-nowrap border-l border-slate-100 px-3 py-2 text-[11.5px] first:border-l-0 ${current ? 'bg-primary-soft font-bold text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`} aria-current={current ? 'step' : undefined}>
              <span className="mr-1 tabular-nums text-slate-400">{i + 1}</span>
              {s}
              {current && job.status === 'On Hold' && <span className="ml-1 text-status-warning">(on hold)</span>}
            </li>);

        })}
      </ol>

      {job.status === 'On Hold' && job.hold &&
      <section aria-label="Hold" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          <p className="font-semibold">On hold — {job.hold.reason}</p>
          <p className="text-[11.5px] text-slate-600">
            Responsible: {job.hold.party} · next review {formatDhaka(job.hold.nextReviewAt, { year: true })} · since {formatDhaka(job.hold.since)} by {userName(job.hold.byId)}
          </p>
        </section>
      }

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          {tech ?
          <>
              {c &&
            <section aria-label="Completion" className="rounded-md border border-slate-200 bg-white">
                  <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-[13px] font-bold text-slate-900">Completion form</h2>
                    <StatusBadge status={c.tests.result} />
                  </header>
                  <dl className="divide-y divide-slate-100 text-[12.5px]">
                    {(
                [
                ['Work performed', c.workPerformed],
                ['Installation timestamp', formatDhaka(c.installedAt, { year: true })],
                ['Tests', [c.tests.opticalPowerDbm !== undefined && `${c.tests.opticalPowerDbm} dBm`, c.tests.throughputMbps !== undefined && `${c.tests.throughputMbps} Mbps`, c.tests.latencyMs !== undefined && `${c.tests.latencyMs} ms`, c.tests.packetLossPct !== undefined && `${c.tests.packetLossPct}% loss`].filter(Boolean).join(' · ') || '—'],
                ['Photos', c.photos.map((p) => p.name).join(', ') || '—'],
                ['Customer acknowledgement', c.acknowledgement ? `${c.acknowledgement.name}${c.acknowledgement.designation ? `, ${c.acknowledgement.designation}` : ''} · ${c.acknowledgement.method} · ${formatDhaka(c.acknowledgement.at, { year: true })}` : 'Not recorded'],
                ['Outstanding issues', c.outstandingIssues || 'None'],
                ...(job.verificationNote ? [['Verification note', job.verificationNote]] : [])] as
                [string, string][]).
                map(([k, v]) =>
                <div key={k} className="grid gap-1 px-4 py-1.5 sm:grid-cols-[190px_1fr] sm:gap-3">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-slate-900">{v}</dd>
                      </div>
                )}
                  </dl>
                </section>
            }

              <section aria-label="Equipment" className="rounded-md border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                  <h2 className="text-[13px] font-bold text-slate-900">Equipment and serial numbers</h2>
                  {canWorkJob(role, user, job) && ['Scheduled', 'In Progress', 'Work Completed'].includes(job.status) &&
                <button type="button" className={linkBtn} onClick={() => open('equipment')}>
                      Edit
                    </button>
                }
                </header>
                {job.equipment?.length ?
              <ul className="divide-y divide-slate-100">
                    {job.equipment.map((e) =>
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-1.5 text-[12.5px]">
                        <span className="text-slate-900">{e.item}</span>
                        <span className="font-mono text-slate-700">{e.serial}</span>
                        <span className="text-[11px] text-slate-500">{e.ownership}</span>
                      </li>
                )}
                  </ul> :

              <p className="px-4 py-3 text-[12px] text-slate-500">No serials recorded yet.</p>
              }
              </section>

              <MaterialsPanel job={job} canRequest={canRequest} onRequest={(kind) => open({ material: kind })} />

              <section aria-label="Work notes and history" className="rounded-md border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                  <h2 className="text-[13px] font-bold text-slate-900">Notes and history</h2>
                  {canRequest && job.status !== 'Cancelled' &&
                <button type="button" className={linkBtn} onClick={() => open('note')}>
                      Add note
                    </button>
                }
                </header>
                <ol className="divide-y divide-slate-100">
                  {[...(job.notes ?? []).map((n) => ({ at: n.at, byId: n.byId, kind: 'Note', detail: n.text })), ...(job.history ?? []).filter((h) => h.kind !== 'Note')].
                sort((a, b) => b.at.localeCompare(a.at)).
                map((h, i) =>
                <li key={`${h.at}-${i}`} className="px-4 py-2">
                        <p className="text-[12.5px] text-slate-900">
                          <span className={`mr-1.5 text-[10.5px] font-bold uppercase ${h.kind === 'Note' ? 'text-primary' : h.kind === 'Hold' ? 'text-status-warning' : 'text-slate-400'}`}>{h.kind}</span>
                          {h.detail}
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          {userName(h.byId)} · {formatDhaka(h.at, { year: true })}
                        </p>
                      </li>
                )}
                </ol>
              </section>
            </> :

          <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600">
              Technical details — equipment configuration, materials, test results and work notes — are not shown to {role.label}. The milestone dates and billing review are shown here.
            </p>
          }
        </div>
        <aside className="space-y-3">
          <JobDates job={job} />
          <BillingReviewPanel job={job} />
        </aside>
      </div>
      {node}
    </div>);

}