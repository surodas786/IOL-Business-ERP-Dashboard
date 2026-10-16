import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, ChevronRightIcon, LockIcon, XIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useSession } from '../../contexts/SessionContext';
import { useWorkItems } from '../../hooks/useWorkItems';
import { canOpenRecord, hasPermission, isVisibleTo } from '../../utils/access';
import { describeRecord } from '../../utils/recordDetails';
import { canOpenQuotePage, canOpenWorkOrderPage } from '../../utils/quoteRules';
import { canOpenJobPage } from '../../utils/installationRules';
import { canAccessModule as canOpenBilling } from '../../utils/access';
import { ENTITY_LABEL, recordName, sameRef } from '../../utils/relations';
import { formatDhaka } from '../../utils/format';
import { StatusBadge } from './StatusBadge';
import { WorkItemActions } from './WorkItemActions';

const redactAmounts = (text: string) => text.replace(/৳ [\d,]+/g, '৳ •••');

export function RecordDrawer() {
  const { current, history, openRecord, back, close } = useRecordDrawer();
  const { db } = useData();
  const { user, role } = useSession();
  const { all } = useWorkItems();
  const fin = hasPermission(role, 'viewFinancials');

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  const allowed = current ? canOpenRecord(db, current, user, role) : false;
  const detail = useMemo(() => current && allowed ? describeRecord(db, current, role) : null, [db, current, allowed, role]);
  const items = useMemo(
    () => current ? all.filter((i) => (sameRef(i.entity, current) || sameRef(i.subject, current)) && isVisibleTo(i, user, role)) : [],
    [all, current, user, role]
  );
  const fullPath = useMemo(() => {
    if (current?.type === 'expenseClaim' && allowed) return `/field-activities/expenses?claim=${current.id}`;
    if (current?.type === 'customer' && allowed) return `/customers/${current.id}`;
    if (current?.type === 'survey' && allowed && role.modules.includes('surveys')) return `/surveys/records/${current.id}`;
    if (current?.type === 'installationJob' && canOpenJobPage(role)) return `/installations/jobs/${current.id}`;
    if (current?.type === 'serviceChange' && allowed && role.modules.includes('serviceChanges')) return `/service-changes/records/${current.id}`;
    if (current && allowed && canOpenBilling(role, 'billing')) {
      if (current.type === 'invoice') return `/billing/invoice/${current.id}`;
      if (current.type === 'receipt') return `/billing/receipt/${current.id}`;
      if (current.type === 'billingAccount') return `/billing/statement/${current.id}`;
    }
    if (current?.type === 'quotation' && allowed && canOpenQuotePage(role)) return `/quotations/records/${current.id}`;
    if (current?.type === 'workOrder' && allowed && canOpenWorkOrderPage(role) && db.workOrders.find((w) => w.id === current.id)?.snapshots?.length) return `/quotations/wo/${current.id}`;
    if (!current || !allowed || !role.modules.includes('crm')) return null;
    if (current.type === 'opportunity') return `/sales-crm/opportunities/${current.id}`;
    if (current.type === 'tender') return `/sales-crm/tenders/${current.id}`;
    if (current.type === 'lead') {
      const opp = db.opportunities.find((o) => o.leadId === current.id);
      return opp ? `/sales-crm/opportunities/${opp.id}` : null;
    }
    return null;
  }, [current, allowed, role, db.opportunities, db.workOrders]);
  const timeline = useMemo(
    () =>
    current ?
    db.auditEvents.
    filter((e) => sameRef(e.entity, current) || e.related.some((r) => sameRef(r, current))).
    sort((a, b) => b.at.localeCompare(a.at)) :
    [],
    [db.auditEvents, current]
  );

  return (
    <AnimatePresence>
      {current &&
      <div className="fixed inset-0 z-40">
          <motion.button
          type="button"
          aria-label="Close record"
          className="absolute inset-0 bg-slate-900/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close} />
        
          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`${ENTITY_LABEL[current.type]} ${current.id}`}
          className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl shadow-slate-900/10 sm:w-[480px]"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              {history.length > 1 &&
            <button type="button" onClick={back} aria-label="Back to previous record" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                </button>
            }
              <span className="text-[11px] font-semibold text-slate-500">
                {ENTITY_LABEL[current.type]} · <span className="font-mono">{current.id}</span>
              </span>
              <button type="button" onClick={close} aria-label="Close" className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-100">
                <XIcon className="h-4 w-4" aria-hidden />
              </button>
            </header>

            {!detail ?
          <div className="flex items-start gap-3 px-4 py-6">
                <LockIcon className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                <p className="text-[12.5px] text-slate-600">This record isn’t available to the {role.label} account.</p>
              </div> :

          <div className="flex-1 overflow-y-auto">
                <div className="px-4 pb-3 pt-3.5">
                  <h2 className="text-[16px] font-bold leading-snug text-slate-900">{detail.title}</h2>
                  {detail.titleBn && <p className="text-[12.5px] text-slate-500">{detail.titleBn}</p>}
                  {detail.status &&
              <div className="mt-1.5">
                      <StatusBadge status={detail.status} />
                    </div>
              }
                  {fullPath &&
              <Link to={fullPath} onClick={close} className="mt-2 inline-block text-[12px] font-semibold text-primary hover:text-primary-hover">
                      Open full {current?.type === 'tender' ? 'tender' : current?.type === 'expenseClaim' ? 'claim' : current?.type === 'customer' ? 'customer' : current?.type === 'survey' ? 'survey' : 'opportunity'} →
                    </Link>
              }
                </div>

                {items.length > 0 &&
            <section aria-label="Pending actions" className="mx-4 mb-3 space-y-2.5 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                    {items.map((item) =>
              <div key={item.id}>
                        <p className="text-[12px] font-semibold text-slate-900">{item.title}</p>
                        <p className="mb-1.5 text-[11px] text-slate-600">{fin ? item.detail : redactAmounts(item.detail)}</p>
                        <WorkItemActions item={item} size="md" />
                      </div>
              )}
                  </section>
            }

                <dl className="mx-4 grid grid-cols-1 gap-x-4 border-t border-slate-100 sm:grid-cols-2">
                  {detail.fields.map((fld) =>
              <div key={fld.label} className="border-b border-slate-100 py-2">
                      <dt className="text-[10.5px] text-slate-400">{fld.label}</dt>
                      <dd className="text-[12.5px] text-slate-800">{fld.value}</dd>
                    </div>
              )}
                </dl>
                {detail.restrictedNote && <p className="mx-4 mt-2 text-[11px] italic text-slate-400">{detail.restrictedNote}</p>}

                {detail.related.length > 0 &&
            <section className="px-4 pt-4">
                    <h3 className="mb-1.5 text-[12px] font-bold text-slate-900">Related records</h3>
                    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                      {detail.related.map((r) => {
                  const open = canOpenRecord(db, r, user, role);
                  return (
                    <li key={`${r.type}-${r.id}`}>
                            <button
                        type="button"
                        disabled={!open}
                        onClick={() => openRecord(r)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-100 hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent">
                        
                              <span className="w-28 flex-shrink-0 text-[10.5px] text-slate-400">{ENTITY_LABEL[r.type]}</span>
                              <span className="min-w-0 flex-1 truncate text-[12px] text-slate-800">
                                <span className="font-mono text-[11px] text-slate-500">{r.id}</span>{' '}
                                {open ? recordName(db, r) : <span className="italic text-slate-400">Restricted for this role</span>}
                              </span>
                              {open ? <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300" aria-hidden /> : <LockIcon className="h-3 w-3 text-slate-300" aria-hidden />}
                            </button>
                          </li>);

                })}
                    </ul>
                  </section>
            }

                <section className="px-4 pb-6 pt-4">
                  <h3 className="mb-2 text-[12px] font-bold text-slate-900">Timeline</h3>
                  {timeline.length === 0 ?
              <p className="text-[11.5px] text-slate-400">No activity recorded yet.</p> :

              <ol className="relative ml-1 border-l border-slate-200">
                      {timeline.map((e) =>
                <li key={e.id} className="relative pb-3 pl-4">
                          <span className="absolute -left-[4px] top-1.5 h-[7px] w-[7px] rounded-full bg-slate-300" aria-hidden />
                          <p className="text-[11.5px] font-semibold text-slate-800">{e.action}</p>
                          <p className="text-[11px] text-slate-600">{fin ? e.summary : redactAmounts(e.summary)}</p>
                          <p className="text-[10px] text-slate-400">
                            {e.actorName} · {formatDhaka(e.at, { year: true })}
                          </p>
                        </li>
                )}
                    </ol>
              }
                </section>
              </div>
          }
            <footer className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">Fictional demo data · times in Asia/Dhaka</footer>
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}