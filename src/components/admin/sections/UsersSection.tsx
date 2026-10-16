import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { branchName, recordName, roleLabel, userName } from '../../../utils/relations';
import { formatDhaka } from '../../../utils/format';
import { StatusBadge } from '../../records/StatusBadge';
import { AdminPanel, linkBtn, primaryBtn, tdClass, thClass } from '../AdminPanel';
import { UserFormDialog } from '../UserFormDialog';
import { DeactivateUserDialog } from '../DeactivateUserDialog';
import { inputClass } from '../FormField';
import type { DemoUser } from '../../../types/erp';

export function UsersSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const { user: actor } = useSession();
  const runAction = useRunAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [editing, setEditing] = useState<DemoUser | null | 'new'>(null);
  const [deactivating, setDeactivating] = useState<DemoUser | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.users.filter(
      (u) =>
      (status === 'all' || u.status === status) && (
      !q || [u.name, u.nameBn, u.email, u.phone, roleLabel(u.role)].some((v) => v.toLowerCase().includes(q)))
    );
  }, [db.users, query, status]);

  const scopeLabel = (u: DemoUser) => {
    if (u.scopeType === 'company') return 'Company-wide';
    if (u.scopeType === 'branch') return `Branch · ${branchName(u.branch)}`;
    const names = u.zoneIds.map((z) => db.operationalZones.find((x) => x.id === z)?.name ?? z);
    return `Zones · ${names.join(', ')}`;
  };

  const history = db.ownershipChanges.slice(0, 12);

  return (
    <div className="space-y-4">
      <AdminPanel
        title={`Users (${db.users.length})`}
        description="One account per person, exactly one role per account. Station, reporting line and operational scope are set independently."
        actions={
        canEdit &&
        <button type="button" className={primaryBtn} onClick={() => setEditing('new')}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New user
            </button>

        }>
        
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              aria-label="Search users"
              className={`${inputClass} h-8 pl-8 text-[12px]`}
              placeholder="Name, নাম, email, mobile or role"
              value={query}
              onChange={(e) => setQuery(e.target.value)} />
            
          </div>
          <div role="group" aria-label="Status filter" className="flex rounded-md border border-slate-200 p-0.5">
            {(['all', 'Active', 'Inactive'] as const).map((s) =>
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${status === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              
                {s === 'all' ? 'All' : s}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <th className={thClass}>User</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Department</th>
                <th className={thClass}>Station</th>
                <th className={thClass}>Operational scope</th>
                <th className={thClass}>Reports to</th>
                <th className={thClass}>Status</th>
                {canEdit && <th className={`${thClass} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const manager = db.users.find((m) => m.id === u.managerId);
                const crossBranch = manager && manager.stationBranchId !== u.stationBranchId;
                return (
                  <tr key={u.id} className={u.status === 'Inactive' ? 'bg-slate-50/60' : ''}>
                    <td className={tdClass}>
                      <div className="font-semibold text-slate-900">
                        {u.name}
                        {u.id === actor.id && <span className="ml-1.5 text-[10.5px] font-semibold text-primary">You</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span lang="bn">{u.nameBn}</span> · {u.email}
                      </div>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap font-semibold text-slate-800`}>{roleLabel(u.role)}</td>
                    <td className={tdClass}>{recordName(db, { type: 'orgNode', id: u.departmentId })}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{branchName(u.stationBranchId)}</td>
                    <td className={tdClass}>{scopeLabel(u)}</td>
                    <td className={tdClass}>
                      {manager ?
                      <>
                          <div>{manager.name}</div>
                          {crossBranch && <div className="text-[10.5px] text-status-info">Based in {branchName(manager.stationBranchId)}</div>}
                        </> :

                      '—'
                      }
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={u.status} />
                    </td>
                    {canEdit &&
                    <td className={`${tdClass} text-right`}>
                        <div className="flex justify-end gap-3">
                          <button type="button" className={linkBtn} onClick={() => setEditing(u)}>
                            Edit
                          </button>
                          {u.status === 'Active' ?
                        <button
                          type="button"
                          className={linkBtn}
                          disabled={u.id === actor.id}
                          title={u.id === actor.id ? 'You can’t deactivate your own account' : undefined}
                          onClick={() => setDeactivating(u)}>
                          
                              Deactivate
                            </button> :

                        <button type="button" className={linkBtn} onClick={() => runAction({ type: 'ADMIN_REACTIVATE_USER', userId: u.id })}>
                              Reactivate
                            </button>
                        }
                        </div>
                      </td>
                    }
                  </tr>);

              })}
              {rows.length === 0 &&
              <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-slate-500">
                    No users match these filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Ownership history"
        description="When an account is deactivated, open work moves to a successor. Each move is recorded here; closed records keep their original owner.">
        
        {history.length === 0 ?
        <p className="px-4 py-6 text-[12px] text-slate-500">No ownership changes yet. Deactivate a user with open work to see hand-overs recorded here.</p> :

        <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className={thClass}>When</th>
                  <th className={thClass}>Record</th>
                  <th className={thClass}>Field</th>
                  <th className={thClass}>From</th>
                  <th className={thClass}>To</th>
                  <th className={thClass}>By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) =>
              <tr key={h.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDhaka(h.at)}</td>
                    <td className={tdClass}>
                      <span className="font-mono text-[11px] text-slate-500">{h.record.id}</span> {recordName(db, h.record)}
                    </td>
                    <td className={tdClass}>{h.field}</td>
                    <td className={tdClass}>{userName(h.fromUserId)}</td>
                    <td className={tdClass}>{userName(h.toUserId)}</td>
                    <td className={tdClass}>{userName(h.byUserId)}</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </AdminPanel>

      <AnimatePresence>
        {editing && <UserFormDialog key="form" user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
        {deactivating && <DeactivateUserDialog key="deactivate" user={deactivating} onClose={() => setDeactivating(null)} />}
      </AnimatePresence>
    </div>);

}