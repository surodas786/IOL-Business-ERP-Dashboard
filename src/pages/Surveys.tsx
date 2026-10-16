import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { canSuperviseSurveys } from '../utils/surveyRules';
import { surveyViews } from '../data/surveyViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { SurveyQueue } from '../components/surveys/SurveyQueue';
import { BypassRequests } from '../components/surveys/BypassRequests';
import { CostAnalysisList } from '../components/surveys/CostAnalysisList';
import { SurveySettings } from '../components/surveys/SurveySettings';

export function Surveys() {
  const { view } = useParams();
  const { db } = useData();
  const { user, role } = useSession();

  if (!canAccessModule(role, 'surveys')) return <AccessDenied title="Surveys and Feasibility" module="surveys" />;
  const views = surveyViews.filter((v) => v.visible(role));
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/surveys" replace />;

  const pendingBypass = canSuperviseSurveys(role) ? db.surveyBypasses.filter((b) => b.status === 'Pending' && b.requestedById !== user.id && inUserScope(user, b.branchId)).length : 0;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Surveys and Feasibility</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Site surveys from request to technical review, with BOM estimates and stock checks · fictional demo data · estimates never reduce physical stock
        </p>
      </div>

      <nav aria-label="Survey views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'queue' ? '/surveys' : `/surveys/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${
          isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`

          }>
          
            {v.label}
            {v.id === 'bypass' && pendingBypass > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-status-warning">{pendingBypass}</span>}
          </NavLink>
        )}
      </nav>

      {current.id === 'queue' && <SurveyQueue />}
      {current.id === 'bypass' && <BypassRequests />}
      {current.id === 'cost' && <CostAnalysisList />}
      {current.id === 'settings' && <SurveySettings />}
    </div>);

}