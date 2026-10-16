import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CalendarClockIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, hasPermission, inUserScope } from '../utils/access';
import { canEditOpportunity, canManageSales, displayStatus, isActive, opportunityFlags } from '../utils/crmRules';
import { formatBDT, formatDhaka } from '../utils/format';
import { userName } from '../utils/relations';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { OpportunityFlags } from '../components/crm/OpportunityFlags';
import { OpportunityActionDialog, type OpportunityDialogMode } from '../components/crm/OpportunityActionDialog';
import { StageTrack } from '../components/crm/opportunity/StageTrack';
import { DeliveryStatus } from '../components/crm/opportunity/DeliveryStatus';
import { OpportunityFacts } from '../components/crm/opportunity/OpportunityFacts';
import { ActivityLog } from '../components/crm/opportunity/ActivityLog';

export function OpportunityDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const [dialog, setDialog] = useState<OpportunityDialogMode | null>(null);

  if (!canAccessModule(role, 'crm')) return <AccessDenied title="Sales CRM" module="crm" />;
  const o = db.opportunities.find((x) => x.id === id);
  const lead = o && db.leads.find((l) => l.id === o.leadId);
  if (!o || !lead || !inUserScope(user, o.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{o ? 'This opportunity is outside your branch scope.' : 'Opportunity not found.'}</p>
        <Link to="/sales-crm/pipeline" className={`${linkBtn} mt-2 inline-block`}>
          Back to pipeline
        </Link>
      </div>);

  }

  const canEdit = canEditOpportunity(o, user, role);
  const manager = canManageSales(role);
  const pipe = hasPermission(role, 'viewPipeline');
  const flags = opportunityFlags(db, o);
  const active = isActive(o);
  const canRequest = !canEdit && hasPermission(role, 'createQuotation') && active;
  const conflict = db.crmConflicts.find((c) => c.status === 'Open' && c.opportunityId === o.id);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/sales-crm/pipeline" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Pipeline
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {o.id} · {lead.id}
          </p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{lead.company}</h1>
          <p className="text-[12.5px] text-slate-600">{o.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={displayStatus(db, o)} />
            {o.expansion !== 'New customer' && <StatusBadge status={o.expansion} />}
            <OpportunityFlags opportunity={o} />
            <span className="text-[11.5px] text-slate-500">
              Owner {userName(o.ownerId)}
              {pipe && <> · {formatBDT(o.expectedMrc)}/mo</>}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && o.status === 'Open' &&
          <>
              <button type="button" className={secondaryBtn} onClick={() => setDialog('stalled')}>
                Mark stalled
              </button>
              <button type="button" className={`${secondaryBtn} text-status-critical`} onClick={() => setDialog('lost')}>
                Mark lost
              </button>
            </>
          }
          {canEdit && o.status === 'Stalled' &&
          <button type="button" className={`${secondaryBtn} text-status-critical`} onClick={() => setDialog('lost')}>
              Mark lost
            </button>
          }
          {canEdit && (o.status === 'Lost' || o.status === 'Stalled') &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('reopen')}>
              Reopen
            </button>
          }
          {manager && active &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('reassign')}>
              Reassign
            </button>
          }
          {canRequest &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('requestAssignment')}>
              Ask to work this
            </button>
          }
        </div>
      </header>

      {conflict &&
      <div role="status" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">
          <span className="font-semibold text-status-warning">{conflict.kind} open ({conflict.id}).</span> {conflict.reasons[0]}.{' '}
          {manager ?
        <Link to="/sales-crm/reviews" className={linkBtn}>
              Resolve
            </Link> :

        'A sales manager will decide; nothing is merged automatically.'
        }
        </div>
      }

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <StageTrack opportunity={o} canEdit={canEdit} />

          {(o.status === 'Open' || o.status === 'Stalled') &&
          <section aria-label="Next action" className={`flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 ${flags.overdueFollowUp ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
              <CalendarClockIcon className={`h-5 w-5 flex-shrink-0 ${flags.overdueFollowUp ? 'text-status-critical' : 'text-primary'}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500">Next action</p>
                <p className="text-[13.5px] font-semibold text-slate-900">{o.nextAction || 'None set'}</p>
                {o.nextActionDue &&
              <p className={`text-[11.5px] ${flags.overdueFollowUp ? 'font-semibold text-status-critical' : 'text-slate-600'}`}>
                    {flags.overdueFollowUp ? 'Overdue — was due ' : 'Due '}
                    {formatDhaka(o.nextActionDue)}
                  </p>
              }
              </div>
              {canEdit &&
            <button type="button" className={secondaryBtn} onClick={() => setDialog('nextAction')}>
                  {o.nextAction ? 'Update' : 'Set'} next action
                </button>
            }
            </section>
          }

          <ActivityLog opportunity={o} canEdit={canEdit && o.status !== 'Merged'} onLog={() => setDialog('communication')} onAttach={() => setDialog('attachment')} />
        </div>

        <div className="space-y-4">
          <DeliveryStatus opportunity={o} />
          <OpportunityFacts opportunity={o} lead={lead} canEdit={canEdit} onChangeDate={() => setDialog('decisionDate')} />
          {!canEdit && <p className="text-[11px] text-slate-500">Read-only for {role.label}. Only the owner or an authorised sales manager can change this opportunity.</p>}
        </div>
      </div>

      <AnimatePresence>{dialog && <OpportunityActionDialog key={dialog} mode={dialog} opportunity={o} onClose={() => setDialog(null)} />}</AnimatePresence>
    </div>);

}