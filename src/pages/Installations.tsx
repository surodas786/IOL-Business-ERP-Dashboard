import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { installationViews } from '../data/installationViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { JobList } from '../components/installations/JobList';
import { JobBoard } from '../components/installations/JobBoard';
import { JobSchedule } from '../components/installations/JobSchedule';
import { MyJobs } from '../components/installations/MyJobs';

export function Installations() {
  const { view } = useParams();
  const { role } = useSession();

  if (!canAccessModule(role, 'installations')) return <AccessDenied title="Installation Jobs" module="installations" />;
  const views = installationViews.filter((v) => v.visible(role));
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/installations" replace />;
  const base = views[0].id;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Installation Jobs</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">Every job comes from an approved work order · marking a job done never starts billing · fictional demo data</p>
      </div>
      <nav aria-label="Installation views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === base ? '/installations' : `/installations/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>
      {current.id === 'my-jobs' && <MyJobs />}
      {current.id === 'list' && <JobList />}
      {current.id === 'board' && <JobBoard />}
      {current.id === 'schedule' && <JobSchedule />}
    </div>);

}