import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { quotationViews } from '../data/quotationViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { QuoteList } from '../components/quotations/QuoteList';
import { WorkOrderList } from '../components/quotations/WorkOrderList';
import { QuoteSettings } from '../components/quotations/QuoteSettings';

export function Quotations() {
  const { view } = useParams();
  const { role } = useSession();

  if (!canAccessModule(role, 'quotations')) return <AccessDenied title="Quotations and Work Orders" module="quotations" />;
  const views = quotationViews.filter((v) => v.visible(role));
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/quotations" replace />;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Quotations and Work Orders</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">Versioned quotations, routed approvals and work orders released against a checklist · fictional demo data · tax is illustrative</p>
      </div>
      <nav aria-label="Quotation views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'quotations' ? '/quotations' : `/quotations/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${
          isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`

          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>
      {current.id === 'quotations' && <QuoteList />}
      {current.id === 'work-orders' && <WorkOrderList />}
      {current.id === 'settings' && <QuoteSettings />}
    </div>);

}