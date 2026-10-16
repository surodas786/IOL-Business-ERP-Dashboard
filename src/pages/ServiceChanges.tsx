import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { serviceChangeViews } from '../data/serviceChangeViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { ChangeOverview } from '../components/serviceChanges/ChangeOverview';
import { ChangeList } from '../components/serviceChanges/ChangeList';
import { StopsView } from '../components/serviceChanges/StopsView';
import { ClearancesView } from '../components/serviceChanges/ClearancesView';

export function ServiceChanges() {
  const { view } = useParams();
  const { role } = useSession();
  if (!canAccessModule(role, 'serviceChanges')) return <AccessDenied title="Service Changes" module="serviceChanges" />;
  const current = view ? serviceChangeViews.find((v) => v.id === view) : serviceChangeViews[0];
  if (!current) return <Navigate to="/service-changes" replace />;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Service Changes</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">Shifting, upgrades, downgrades, temporary stops, resumptions and discontinuations on existing services · billing follows approved effective dates · Asia/Dhaka · fictional demo data</p>
      </div>
      <nav aria-label="Service change views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {serviceChangeViews.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'overview' ? '/service-changes' : `/service-changes/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>
      {current.id === 'overview' && <ChangeOverview />}
      {current.id === 'requests' && <ChangeList />}
      {current.id === 'stops' && <StopsView />}
      {current.id === 'clearances' && <ClearancesView />}
    </div>);

}