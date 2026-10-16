import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon, PhoneIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatDhaka } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { jobNextStep } from '../../utils/installationRules';
import { StatusBadge } from '../records/StatusBadge';
import { JobActions } from './JobActions';
import { useJobDialogs } from './useJobDialogs';
import type { InstallationJob } from '../../types/records';

/** One assigned job with large touch targets and short forms. */
export function TechJobCard({ job, isToday }: {job: InstallationJob;isToday: boolean;}) {
  const { db } = useData();
  const site = db.sites.find((s) => s.id === job.siteId);
  const conn = db.connections.find((c) => c.id === job.connectionId);
  const { open, node } = useJobDialogs(job);
  const lastNote = job.notes?.[job.notes.length - 1];
  const returnable = job.materialLines?.some((m) => m.issued - m.consumed - m.returned > 0) && job.status !== 'Scheduled';

  return (
    <article className={`rounded-md border bg-white ${isToday ? 'border-primary' : 'border-slate-200'}`}>
      <header className="flex items-start justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-slate-500">
            {isToday ? 'Today · ' : ''}
            {formatDhaka(job.scheduledAt)}
          </p>
          <Link to={`/installations/jobs/${job.id}`} className="block text-[16px] font-bold leading-snug text-slate-900 hover:text-primary">
            {customerName(db, job.customerId)}
          </Link>
          <p className="font-mono text-[11px] text-slate-400">
            {job.id} · {conn ? `${conn.serviceType} ${conn.bandwidthMbps} Mbps` : job.connectionId}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </header>
      <div className="space-y-1 px-4 py-2 text-[13px] text-slate-700">
        {site &&
        <p className="flex items-start gap-1.5">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {site.name} — {site.address}
          </p>
        }
        {site?.contactName &&
        <p className="flex flex-wrap items-center gap-1.5">
            <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            {site.contactName}
            {site.contactPhone &&
          <a href={`tel:${site.contactPhone.replace(/[^\d+]/g, '')}`} className="font-semibold text-primary">
                {site.contactPhone}
              </a>
          }
          </p>
        }
        {job.hold &&
        <p className="rounded bg-amber-50 px-2 py-1 text-[12.5px] text-slate-800">
            On hold — {job.hold.party}: {job.hold.reason}
          </p>
        }
        {lastNote && <p className="text-[12px] text-slate-500">Last note: {lastNote.text}</p>}
        <p className="text-[12px] text-slate-500">{jobNextStep(job)}</p>
      </div>
      <footer className="space-y-2 border-t border-slate-100 px-4 py-3">
        <JobActions job={job} open={open} touch />
        {(job.materialLines?.length ?? 0) > 0 && job.status !== 'Work Completed' &&
        <div className="flex flex-wrap gap-4 text-[13px]">
            <button type="button" className="py-1 font-semibold text-primary" onClick={() => open({ material: 'Issue' })}>
              Request materials
            </button>
            {returnable &&
          <button type="button" className="py-1 font-semibold text-primary" onClick={() => open({ material: 'Return' })}>
                Return unused
              </button>
          }
          </div>
        }
      </footer>
      {node}
    </article>);

}