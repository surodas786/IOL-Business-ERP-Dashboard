import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { userName } from '../utils/relations';
import { formatDhaka } from '../utils/format';
import { surveyContext, surveyLabel } from '../utils/surveyRules';
import { surveyTabs, type SurveyTabId } from '../data/surveyViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn } from '../components/admin/AdminPanel';
import { SurveyStatusTrack } from '../components/surveys/SurveyStatusTrack';
import { SurveyActions } from '../components/surveys/SurveyActions';
import { SurveyRequestInfo } from '../components/surveys/SurveyRequestInfo';
import { TechnicalForm } from '../components/surveys/TechnicalForm';
import { BomTable } from '../components/surveys/BomTable';
import { SurveyAttachments } from '../components/surveys/SurveyAttachments';
import { CostAnalysisPanel } from '../components/surveys/CostAnalysisPanel';
import { SurveyHistory } from '../components/surveys/SurveyHistory';
import type { Survey } from '../types/records';

const VIEWS: Record<SurveyTabId, React.ComponentType<{survey: Survey;}>> = {
  request: SurveyRequestInfo,
  technical: TechnicalForm,
  bom: BomTable,
  attachments: SurveyAttachments,
  cost: CostAnalysisPanel,
  history: SurveyHistory
};

export function SurveyDetail() {
  const { id, tab } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const navigate = useNavigate();

  if (!canAccessModule(role, 'surveys')) return <AccessDenied title="Surveys and Feasibility" module="surveys" />;
  const s = db.surveys.find((x) => x.id === id);
  if (!s || !inUserScope(user, s.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{s ? 'This survey is outside your branch scope.' : 'Survey not found.'}</p>
        <Link to="/surveys" className={`${linkBtn} mt-2 inline-block`}>
          Back to surveys
        </Link>
      </div>);

  }

  const tabs = surveyTabs.filter((t) => t.visible(role));
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const View = VIEWS[active.id];
  const ctx = surveyContext(db, s);
  const hidden = surveyTabs.length - tabs.length;

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/surveys" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Survey queue
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {s.id} · {s.opportunityId}
          </p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{ctx.name}</h1>
          <p className="text-[12.5px] text-slate-600">
            {s.siteLabel ? `${s.siteLabel} · ` : ''}
            {s.requestedService}
            {s.requestedBandwidthMbps ? ` · ${s.requestedBandwidthMbps} Mbps` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={surveyLabel(s)} />
            <span className="text-[11.5px] text-slate-500">
              {s.technicianName ? `Technician ${s.technicianName}` : 'No technician yet'}
              {s.scheduledAt && ` · visit ${formatDhaka(s.scheduledAt)}`}
              {s.requestedById && ` · requested by ${userName(s.requestedById)}`}
            </span>
          </div>
        </div>
      </header>

      <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3">
        <SurveyStatusTrack survey={s} />
      </div>

      {s.status === 'Returned' && s.reviewNote &&
      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          <span className="font-semibold">Returned by {s.reviewedById ? userName(s.reviewedById) : 'review'}:</span> {s.reviewNote}
        </p>
      }

      <div className="mb-3">
        <SurveyActions survey={s} />
      </div>

      <nav aria-label="Survey sections" className="-mx-4 mb-3 overflow-x-auto border-b border-slate-200 px-4 lg:-mx-5 lg:px-5">
        <ul className="flex gap-1" role="tablist">
          {tabs.map((t) =>
          <li key={t.id}>
              <button
              type="button"
              role="tab"
              aria-selected={t.id === active.id}
              onClick={() => navigate(`/surveys/records/${s.id}/${t.id}`, { replace: true })}
              className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${t.id === active.id ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              
                {t.label}
              </button>
            </li>
          )}
        </ul>
      </nav>
      {hidden > 0 && <p className="-mt-1 mb-3 text-[11px] text-slate-400">Commercial analysis is hidden for {role.label}.</p>}

      <View key={`${s.id}-${active.id}`} survey={s} />
    </div>);

}