import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { branches } from '../../data/branches';
import { LOAD_POINTS, technicianProfiles } from '../../data/supportConfig';
import { onDuty, shiftOf, workloadOf } from '../../utils/ticketRules';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { LoadBar } from './LoadBar';

const zoneName = (id: string) => branches.flatMap((b) => b.zones).find((z) => z.id === id)?.name ?? id;

export function WorkloadView() {
  const { db } = useData();
  const { branchFilter } = useSession();
  const rows = technicianProfiles.
  filter((p) => branchFilter === 'all' || p.branchId === branchFilter).
  map((p) => ({ p, load: workloadOf(db, p.name), shift: shiftOf(db, p.name) })).
  sort((a, b) => b.load.points / b.load.capacity - a.load.points / a.load.capacity);

  return (
    <AdminPanel
      title="Technician workload"
      description={`Points: Urgent ${LOAD_POINTS.Urgent}, High ${LOAD_POINTS.High}, Normal/Low ${LOAD_POINTS.Normal} per open ticket, plus ${LOAD_POINTS.job} per active installation job.`}>
      
      <ul className="divide-y divide-slate-100">
        {rows.map(({ p, load, shift }) =>
        <li key={p.name} className="grid gap-3 px-4 py-3 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
            <div>
              <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
              <p className="text-[11.5px] text-slate-500">
                {branches.find((b) => b.id === p.branchId)?.name} · {p.team}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px]">
                <span className="text-slate-500">Today</span>
                {shift ? <StatusBadge status={onDuty(shift) ? shift : shift === 'Leave' ? 'On Leave' : 'Off duty'} /> : <span className="text-slate-400">Not rostered</span>}
              </p>
            </div>
            <div className="min-w-0 text-[11.5px]">
              <p className="text-slate-600">
                <span className="text-slate-400">Zones</span> {p.zoneIds.map(zoneName).join(', ')}
              </p>
              <p className="mt-0.5 text-slate-600">
                <span className="text-slate-400">Skills</span> {p.skills.join(' · ')}
              </p>
              {load.tickets.length > 0 ?
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {load.tickets.map((t) =>
              <li key={t.id}>
                      <Link to={`/support-tickets/records/${t.id}`} className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 transition-colors duration-150 hover:bg-slate-50">
                        <span className="font-mono text-slate-400">{t.id}</span> {t.priority} · {t.status}
                      </Link>
                    </li>
              )}
                </ul> :

            <p className="mt-1.5 text-slate-400">No open tickets</p>
            }
            </div>
            <div className="lg:text-right">
              <div className="lg:flex lg:justify-end">
                <LoadBar points={load.points} capacity={load.capacity} />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {load.tickets.length} ticket{load.tickets.length === 1 ? '' : 's'} · {load.jobs} installation job{load.jobs === 1 ? '' : 's'}
              </p>
            </div>
          </li>
        )}
      </ul>
    </AdminPanel>);

}