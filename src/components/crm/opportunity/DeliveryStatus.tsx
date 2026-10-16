import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { canRequestSurvey, surveyLabel } from '../../../utils/surveyRules';
import { RequestSurveyDialog } from '../../surveys/RequestSurveyDialog';
import { RequestBypassDialog } from '../../surveys/RequestBypassDialog';
import { useData } from '../../../contexts/DataContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { useSession } from '../../../contexts/SessionContext';
import { hasPermission } from '../../../utils/access';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../../utils/format';
import { userName } from '../../../utils/relations';
import { StatusBadge } from '../../records/StatusBadge';
import { AdminPanel, linkBtn } from '../../admin/AdminPanel';
import type { Opportunity } from '../../../types/records';

/** Survey, quotation, work order and tender status kept visible on the opportunity. */
export function DeliveryStatus({ opportunity: o }: {opportunity: Opportunity;}) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const pipe = hasPermission(role, 'viewPipeline');
  const surveys = db.surveys.filter((s) => s.opportunityId === o.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const quotations = db.quotations.filter((q) => q.opportunityId === o.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const workOrders = db.workOrders.filter((w) => quotations.some((q) => q.id === w.quotationId));
  const jobs = db.installationJobs.filter((j) => workOrders.some((w) => w.id === j.workOrderId));
  const tender = db.tenders.find((t) => t.opportunityId === o.id);
  const bypass = db.surveyBypasses.find((b) => b.opportunityId === o.id && b.status !== 'Rejected');
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'survey' | 'bypass' | null>(null);

  return (
    <AdminPanel title="Survey and quotation" description="Click any record to open it.">
      <dl className="divide-y divide-slate-100">
        <Row label="Survey">
          {surveys.length === 0 && !bypass && <span className="text-slate-500">Not requested yet</span>}
          {surveys.map((s) =>
          <button
            key={s.id}
            type="button"
            onClick={() => role.modules.includes('surveys') ? navigate(`/surveys/records/${s.id}`) : openRecord({ type: 'survey', id: s.id })}
            className="block w-full text-left hover:text-primary">
            
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-500">{s.id}</span>
                <StatusBadge status={surveyLabel(s)} />
              </span>
              <span className="block text-[11px] text-slate-500">
                {s.technicianName || 'No technician yet'}
                {s.fibreDistanceM !== undefined && ` · ${s.fibreDistanceM} m fibre`} · {formatDhaka(s.completedAt ?? s.scheduledAt ?? s.requestedAt)}
              </span>
            </button>
          )}
          {bypass &&
          <span className="block">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-500">{bypass.id}</span>
                <StatusBadge status={`Bypass ${bypass.status.toLowerCase()}`} />
              </span>
              <span className="block text-[11px] text-slate-500">{bypass.reason}</span>
            </span>
          }
          {o.status === 'Open' && canRequestSurvey(role) &&
          <span className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              <button type="button" className={linkBtn} onClick={() => setDialog('survey')}>
                Request survey
              </button>
              {!bypass && !surveys.some((s) => s.status === 'Approved') &&
            <button type="button" className={linkBtn} onClick={() => setDialog('bypass')}>
                  Request bypass
                </button>
            }
            </span>
          }
        </Row>
        <Row label="Quotation">
          {quotations.length === 0 ?
          <span className="text-slate-500">None yet</span> :

          quotations.map((q) =>
          <button key={q.id} type="button" onClick={() => openRecord({ type: 'quotation', id: q.id })} className="block w-full text-left hover:text-primary">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-500">{q.id}</span>
                  <StatusBadge status={q.status} />
                </span>
                <span className="block text-[11px] text-slate-500">
                  {pipe && `${formatBDT(q.mrc)}/mo · `}by {userName(q.preparedById)} · valid to {formatDhakaDate(q.validUntil)}
                </span>
              </button>
          )
          }
        </Row>
        {(workOrders.length > 0 || jobs.length > 0) &&
        <Row label="Delivery">
            {workOrders.map((w) =>
          <button key={w.id} type="button" onClick={() => openRecord({ type: 'workOrder', id: w.id })} className="flex flex-wrap items-center gap-1.5 hover:text-primary">
                <span className="font-mono text-[11px] text-slate-500">{w.id}</span>
                <StatusBadge status={w.status} />
              </button>
          )}
            {jobs.map((j) =>
          <button key={j.id} type="button" onClick={() => openRecord({ type: 'installationJob', id: j.id })} className="mt-1 flex flex-wrap items-center gap-1.5 hover:text-primary">
                <span className="font-mono text-[11px] text-slate-500">{j.id}</span>
                <StatusBadge status={j.status} />
              </button>
          )}
          </Row>
        }
        {tender &&
        <Row label="Tender">
            <Link to={`/sales-crm/tenders/${tender.id}`} className="block hover:text-primary">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-700">{tender.reference}</span>
                <StatusBadge status={tender.outcome === 'Pending' ? tender.submissionStatus : tender.outcome} />
              </span>
              <span className="block text-[11px] text-slate-500">
                Submission {formatDhaka(tender.submissionDeadline)} · {tender.winProbability}% win probability
              </span>
            </Link>
          </Row>
        }
      </dl>
      <AnimatePresence>
        {dialog === 'survey' && <RequestSurveyDialog key="survey" opportunity={o} onClose={() => setDialog(null)} />}
        {dialog === 'bypass' && <RequestBypassDialog key="bypass" opportunity={o} onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </AdminPanel>);

}

function Row({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2 px-4 py-2.5 text-[12px] text-slate-800">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="min-w-0 space-y-1.5">{children}</dd>
    </div>);

}