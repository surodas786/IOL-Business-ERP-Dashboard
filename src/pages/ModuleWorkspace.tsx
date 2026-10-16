import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { navItems } from '../data/navigation';
import { AccessDenied } from '../components/shell/AccessDenied';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRecordDrawer } from '../contexts/RecordDrawerContext';
import { useWorkItems } from '../hooks/useWorkItems';
import { canAccessModule, inUserScope } from '../utils/access';
import { RecordTable } from '../components/records/RecordTable';
import { getModuleTabs } from '../components/records/tabs/moduleTabs';

export function ModuleWorkspace() {
  const { moduleSlug } = useParams();
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();
  const { openRecord } = useRecordDrawer();
  const { visible: workItems } = useWorkItems();
  const item = navItems.find((n) => n.path === `/${moduleSlug}`);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => setActiveTab(0), [moduleSlug]);

  const tabs = useMemo(() => {
    if (!item) return [];
    return getModuleTabs(item.id, db, role).map((t) => ({
      ...t,
      rows: t.rows.filter(
        (r) =>
        inUserScope(user, r.branchId) && (
        branchFilter === 'all' || !r.branchId || r.branchId === branchFilter) && (
        zoneFilter === 'all' || !r.zoneId || r.zoneId === zoneFilter)
      )
    }));
  }, [item, db, role, user, branchFilter, zoneFilter]);

  if (!item) return <Navigate to="/" replace />;

  const allowed = canAccessModule(role, item.id);
  const pending = workItems.filter((w) => w.module === item.id).length;
  const tab = tabs[Math.min(activeTab, tabs.length - 1)];

  if (!allowed) return <AccessDenied title={item.label} module={item.id} />;

  return (
    <div className="px-4 pb-6 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">{item.label}</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">{item.description}</p>
        </div>
        {pending > 0 &&
        <p className="text-[11.5px] font-semibold text-status-warning">
            {pending} item{pending === 1 ? '' : 's'} need attention — open a record to act
          </p>
        }
      </div>

      {tab ?
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          {tabs.length > 1 &&
        <div role="tablist" aria-label={`${item.label} views`} className="flex gap-1 border-b border-slate-200 px-3 pt-2">
              {tabs.map((t, i) =>
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            onClick={() => setActiveTab(i)}
            className={`-mb-px border-b-2 px-2.5 pb-2 text-[12px] font-semibold transition-colors duration-150 ${
            i === activeTab ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
                  {t.label} <span className="ml-0.5 font-normal text-slate-400">{t.rows.length}</span>
                </button>
          )}
            </div>
        }
          <RecordTable columns={tab.columns} rows={tab.rows} onOpen={openRecord} emptyText="No records match your branch and zone filters." />
          <p className="border-t border-slate-100 px-3 py-1.5 text-[10.5px] text-slate-400">
            Fictional demo data · shared across every module · changes are saved in this browser
          </p>
        </section> :

      <p className="text-[12.5px] text-slate-500">No records for this module.</p>
      }
    </div>);

}