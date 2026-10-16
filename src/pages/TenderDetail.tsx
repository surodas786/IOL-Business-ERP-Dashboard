import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckSquareIcon, SquareIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { canAccessModule, hasPermission, inUserScope } from '../utils/access';
import { canEditOpportunity } from '../utils/crmRules';
import { demoNow, formatBDT, formatDhaka } from '../utils/format';
import { userName } from '../utils/relations';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { FormField, inputClass } from '../components/admin/FormField';
import { CrmDialog } from '../components/crm/CrmDialog';
import type { Tender } from '../types/crm';

export function TenderDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [prob, setProb] = useState<string | null>(null);
  const [comp, setComp] = useState({ name: '', note: '' });
  const [outcome, setOutcome] = useState<Tender['outcome'] | null>(null);
  const [note, setNote] = useState('');

  if (!canAccessModule(role, 'crm')) return <AccessDenied title="Sales CRM" module="crm" />;
  const t = db.tenders.find((x) => x.id === id);
  const o = t && db.opportunities.find((x) => x.id === t.opportunityId);
  if (!t || !o || !inUserScope(user, t.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">Tender not found in your scope.</p>
        <Link to="/sales-crm/tenders" className={`${linkBtn} mt-2 inline-block`}>
          Back to tenders
        </Link>
      </div>);

  }

  const canEdit = canEditOpportunity(o, user, role);
  const pipe = hasPermission(role, 'viewPipeline');
  const preparing = t.submissionStatus === 'Preparing';
  const req = t.documents.filter((d) => d.required);
  const ready = req.filter((d) => d.done).length;
  const left = (iso: string) => {
    const ms = new Date(iso).getTime() - demoNow().getTime();
    if (ms < 0) return 'passed';
    const d = Math.floor(ms / 86400000);
    return d > 0 ? `${d} d ${Math.floor(ms % 86400000 / 3600000)} h left` : `${Math.floor(ms / 3600000)} h left`;
  };

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/sales-crm/tenders" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Tenders
      </Link>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-semibold text-slate-500">{t.reference}</p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{t.title}</h1>
          <p className="text-[12.5px] text-slate-600">
            {t.issuingOrganisation} · <span lang="bn">{t.issuingOrganisationBn}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={t.outcome === 'Pending' ? t.submissionStatus : t.outcome} />
            <Link to={`/sales-crm/opportunities/${o.id}`} className={linkBtn}>
              Opportunity {o.id}
            </Link>
            <span className="text-[11.5px] text-slate-500">Owner {userName(t.ownerId)}</span>
          </div>
        </div>
        {canEdit &&
        <div className="flex flex-wrap gap-2">
            {preparing &&
          <button type="button" className={primaryBtn} disabled={ready < req.length} title={ready < req.length ? 'Complete every required document first' : undefined} onClick={() => runAction({ type: 'CRM_SUBMIT_TENDER', tenderId: t.id })}>
                Mark submitted
              </button>
          }
            {t.outcome === 'Pending' &&
          <>
                {!preparing &&
            <>
                    <button type="button" className={secondaryBtn} onClick={() => setOutcome('Won')}>
                      Record win
                    </button>
                    <button type="button" className={secondaryBtn} onClick={() => setOutcome('Lost')}>
                      Record loss
                    </button>
                  </>
            }
                <button type="button" className={secondaryBtn} onClick={() => setOutcome('Cancelled')}>
                  Cancelled
                </button>
              </>
          }
          </div>
        }
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <AdminPanel title="Required document checklist" description={`${ready} of ${req.length} required documents ready${preparing ? '' : ' · locked after submission'}`}>
            <div className="h-1.5 bg-slate-100" aria-hidden>
              <div className={`h-full ${ready === req.length ? 'bg-status-ok' : 'bg-status-warning'}`} style={{ width: `${req.length ? ready / req.length * 100 : 0}%` }} />
            </div>
            <ul className="divide-y divide-slate-100">
              {t.documents.map((d) =>
              <li key={d.id}>
                  <button
                  type="button"
                  disabled={!canEdit || !preparing}
                  aria-pressed={d.done}
                  onClick={() => runAction({ type: 'CRM_TOGGLE_TENDER_DOC', tenderId: t.id, docId: d.id })}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[12.5px] transition-colors duration-100 enabled:hover:bg-slate-50 disabled:cursor-default">
                  
                    {d.done ? <CheckSquareIcon className="h-4 w-4 text-status-ok" aria-hidden /> : <SquareIcon className="h-4 w-4 text-slate-300" aria-hidden />}
                    <span className={d.done ? 'text-slate-800' : 'text-slate-600'}>{d.name}</span>
                    <span className="ml-auto text-[10.5px] text-slate-400">{d.required ? 'Required' : 'Optional'}</span>
                  </button>
                </li>
              )}
            </ul>
          </AdminPanel>

          <AdminPanel title="Competitors">
            {t.competitors.length === 0 ?
            <p className="px-4 py-4 text-[12px] text-slate-500">No competitor information yet.</p> :

            <ul className="divide-y divide-slate-100">
                {t.competitors.map((c, i) =>
              <li key={`${c.name}-${i}`} className="px-4 py-2">
                    <p className="text-[12.5px] font-semibold text-slate-900">{c.name}</p>
                    {c.note && <p className="text-[11.5px] text-slate-600">{c.note}</p>}
                  </li>
              )}
              </ul>
            }
            {canEdit && t.outcome === 'Pending' &&
            <form
              className="grid gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-[1fr_1.4fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (runAction({ type: 'CRM_ADD_COMPETITOR', tenderId: t.id, ...comp })) setComp({ name: '', note: '' });
              }}>
              
                <input aria-label="Competitor name" placeholder="Competitor" className={inputClass} value={comp.name} onChange={(e) => setComp({ ...comp, name: e.target.value })} />
                <input aria-label="Note" placeholder="Pricing, strengths, incumbent sites…" className={inputClass} value={comp.note} onChange={(e) => setComp({ ...comp, note: e.target.value })} />
                <button type="submit" className={`${secondaryBtn} h-9`} disabled={!comp.name.trim()}>
                  Add
                </button>
              </form>
            }
          </AdminPanel>
        </div>

        <AdminPanel title="Tender facts">
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 px-4 py-3 text-[12.5px]">
            <dt className="text-slate-500">Published</dt>
            <dd>{formatDhaka(t.publishedAt, { year: true })}</dd>
            <dt className="text-slate-500">Clarification</dt>
            <dd>
              {formatDhaka(t.clarificationDeadline, { year: true })}
              {preparing && <span className="block text-[11px] text-slate-500">{left(t.clarificationDeadline)}</span>}
            </dd>
            <dt className="text-slate-500">Submission</dt>
            <dd>
              {formatDhaka(t.submissionDeadline, { year: true })}
              {preparing && <span className="block text-[11px] font-semibold text-status-warning">{left(t.submissionDeadline)}</span>}
            </dd>
            {t.submittedAt &&
            <>
                <dt className="text-slate-500">Submitted</dt>
                <dd>{formatDhaka(t.submittedAt, { year: true })}</dd>
              </>
            }
            <dt className="text-slate-500">Win probability</dt>
            <dd>
              {canEdit && t.outcome === 'Pending' ?
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (prob !== null && runAction({ type: 'CRM_UPDATE_TENDER', tenderId: t.id, winProbability: Number(prob) })) setProb(null);
                }}>
                
                  <input aria-label="Win probability (%)" type="number" min={0} max={100} className={`${inputClass} h-8 w-20`} value={prob ?? String(t.winProbability)} onChange={(e) => setProb(e.target.value)} />
                  <span>%</span>
                  {prob !== null && Number(prob) !== t.winProbability &&
                <button type="submit" className={linkBtn}>
                      Save
                    </button>
                }
                </form> :

              `${t.winProbability}%`
              }
            </dd>
            {pipe &&
            <>
                <dt className="text-slate-500">Estimated MRC</dt>
                <dd>{formatBDT(t.estimatedValue)}</dd>
                <dt className="text-slate-500">Weighted</dt>
                <dd>{formatBDT(Math.round(t.estimatedValue * t.winProbability / 100))}</dd>
              </>
            }
            <dt className="text-slate-500">Submission</dt>
            <dd>{t.submissionStatus}</dd>
            <dt className="text-slate-500">Outcome</dt>
            <dd>
              {t.outcome}
              {t.outcomeNote && <span className="block text-[11.5px] text-slate-600">{t.outcomeNote}</span>}
            </dd>
          </dl>
        </AdminPanel>
      </div>

      <AnimatePresence>
        {outcome &&
        <CrmDialog
          key="outcome"
          title={outcome === 'Won' ? 'Record tender win' : outcome === 'Lost' ? 'Record tender loss' : 'Tender cancelled'}
          description={`${t.reference} · ${t.issuingOrganisation}`}
          onClose={() => setOutcome(null)}
          submitTone={outcome === 'Won' ? 'primary' : 'danger'}
          submitLabel="Record outcome"
          submitDisabled={outcome !== 'Won' && note.trim().length < 8}
          onSubmit={() => {
            if (runAction({ type: 'CRM_TENDER_OUTCOME', tenderId: t.id, outcome, note })) {
              setOutcome(null);
              setNote('');
            }
          }}>
          
            <FormField label={outcome === 'Won' ? 'Note (optional)' : 'Reason'} htmlFor="outcome-note" required={outcome !== 'Won'} help={outcome === 'Won' ? 'The opportunity stays open for the contract quotation.' : 'The linked opportunity is marked lost with this reason.'}>
              <textarea id="outcome-note" rows={3} className={`${inputClass} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          </CrmDialog>
        }
      </AnimatePresence>
    </div>);

}