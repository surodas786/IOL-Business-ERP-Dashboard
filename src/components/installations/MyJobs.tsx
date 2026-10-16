import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { dhakaInputValue, demoNow } from '../../utils/format';
import { customerName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { TechJobCard } from './TechJobCard';

/** Mobile-first list of the signed-in technician's jobs. */
export function MyJobs() {
  const { db } = useData();
  const { user } = useSession();
  const mine = db.installationJobs.filter((j) => j.technicianUserId === user.id && !['Closed', 'Cancelled', 'Verified'].includes(j.status)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const done = db.installationJobs.filter((j) => j.technicianUserId === user.id && ['Verified', 'Closed'].includes(j.status));
  const today = dhakaInputValue(demoNow().toISOString());

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {mine.length === 0 && <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-[13px] text-slate-600">No open jobs assigned to you.</p>}
      {mine.map((j) =>
      <TechJobCard key={j.id} job={j} isToday={dhakaInputValue(j.scheduledAt) === today} />
      )}
      {done.length > 0 &&
      <section className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <h2 className="text-[12.5px] font-bold text-slate-900">Handed over</h2>
          <ul className="mt-1 space-y-1">
            {done.map((j) =>
          <li key={j.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <Link to={`/installations/jobs/${j.id}`} className="font-semibold text-primary hover:text-primary-hover">
                  {customerName(db, j.customerId)}
                </Link>
                <StatusBadge status={j.status} />
              </li>
          )}
          </ul>
        </section>
      }
    </div>);

}