import React, { useState } from 'react';
import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';
import { roles } from '../../../data/roles';
import { navItems } from '../../../data/navigation';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { FINANCIAL_APPROVAL_CELLS, MATRIX_ACTIONS, RECORD_SCOPES, SUPERVISOR_POLICIES, matrixCell } from '../../../utils/permissionMatrix';
import { StatusBadge } from '../../records/StatusBadge';
import { AdminPanel, tdClass, thClass } from '../AdminPanel';
import type { RoleId } from '../../../types/erp';
import type { RecordScope } from '../../../types/admin';

const ACTION_LABEL: Record<(typeof MATRIX_ACTIONS)[number], string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  submit: 'Submit',
  approve: 'Approve',
  export: 'Export'
};

export function RolesSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [roleId, setRoleId] = useState<RoleId>('management');
  const role = roles.find((r) => r.id === roleId)!;
  const scope = db.policies.find((p) => p.id === `SCOPE-${roleId}`);
  const supervisor = db.policies.find((p) => p.id === 'POL-SUPERVISOR')!;
  const holders = db.users.filter((u) => u.role === roleId && u.status === 'Active');
  const companyAllowed = role.permissions.includes('allBranches');

  return (
    <div className="space-y-4">
      <AdminPanel title="Permission matrix" description="Choose a role to see what it can do in each module. Roles are fixed bundles — an account receives exactly one.">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2.5" role="tablist" aria-label="Roles">
          {roles.map((r) =>
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === roleId}
            onClick={() => setRoleId(r.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${
            r.id === roleId ? 'bg-navy text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`
            }>
            
              {r.label}
            </button>
          )}
        </div>
        <div className="grid lg:grid-cols-[1fr_280px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr>
                  <th className={thClass}>Module</th>
                  {MATRIX_ACTIONS.map((a) =>
                  <th key={a} className={`${thClass} text-center`}>
                      {ACTION_LABEL[a]}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {navItems.map((m) =>
                <tr key={m.id}>
                    <td className={`${tdClass} whitespace-nowrap font-semibold text-slate-800`}>{m.label}</td>
                    {MATRIX_ACTIONS.map((a) => {
                    const cell = matrixCell(role, m.id, a);
                    const financial = FINANCIAL_APPROVAL_CELLS[m.id]?.includes(a);
                    return (
                      <td key={a} className={`${tdClass} text-center ${financial ? 'bg-amber-50/60' : ''}`}>
                          {cell === 'allowed' ?
                        <CheckIcon className="mx-auto h-3.5 w-3.5 text-status-ok" aria-label="Allowed" /> :
                        cell === 'denied' ?
                        <XIcon className="mx-auto h-3.5 w-3.5 text-slate-300" aria-label="Not allowed" /> :

                        <MinusIcon className="mx-auto h-3.5 w-3.5 text-slate-200" aria-label="No module access" />
                        }
                        </td>);

                  })}
                  </tr>
                )}
              </tbody>
            </table>
            <p className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-2 text-[10.5px] text-slate-500">
              <span className="flex items-center gap-1"><CheckIcon className="h-3 w-3 text-status-ok" aria-hidden /> Allowed</span>
              <span className="flex items-center gap-1"><XIcon className="h-3 w-3 text-slate-300" aria-hidden /> Module visible, action not allowed</span>
              <span className="flex items-center gap-1"><MinusIcon className="h-3 w-3 text-slate-300" aria-hidden /> No module access (hidden in navigation)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-100" aria-hidden /> Financial approval authority</span>
            </p>
          </div>

          <aside className="space-y-4 border-t border-slate-200 px-4 py-4 lg:border-l lg:border-t-0">
            <div>
              <h3 className="text-[12.5px] font-bold text-slate-900">{role.label}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {holders.length} active account{holders.length === 1 ? '' : 's'}: {holders.map((h) => h.name).join(', ') || 'none'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-status-ok">Can</p>
              <ul className="mt-1 space-y-0.5 text-[11.5px] text-slate-700">
                {role.can.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <p className="mt-2.5 text-[11px] font-semibold text-status-critical">Cannot</p>
              <ul className="mt-1 space-y-0.5 text-[11.5px] text-slate-500">
                {role.cannot.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <fieldset>
              <legend className="text-[12px] font-bold text-slate-900">Record scope</legend>
              <p className="mb-2 text-[11px] text-slate-500">Which records this role can reach inside the modules it sees.</p>
              <div className="space-y-1.5">
                {RECORD_SCOPES.map((s) => {
                  const disabled = !canEdit || s.id === 'company' && !companyAllowed;
                  const checked = scope?.value === s.id;
                  return (
                    <label
                      key={s.id}
                      className={`block rounded-md border px-2.5 py-2 transition-colors duration-150 ${checked ? 'border-primary bg-primary-soft' : 'border-slate-200'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-300'}`}>
                      
                      <input
                        type="radio"
                        name="record-scope"
                        className="sr-only"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => runAction({ type: 'ADMIN_SET_RECORD_SCOPE', roleId, scope: s.id as RecordScope })} />
                      
                      <span className="block text-[12px] font-semibold text-slate-900">{s.label}</span>
                      <span className="block text-[10.5px] leading-snug text-slate-500">
                        {s.id === 'company' && !companyAllowed ? 'Not available — role lacks company-wide authority.' : s.help}
                      </span>
                    </label>);

                })}
              </div>
            </fieldset>
          </aside>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Supervisor visibility policy"
        description="How far a supervisor’s view reaches through the reporting line. Configurable; IOL has not yet confirmed which option applies."
        actions={<StatusBadge status={supervisor.status} />}>
        
        <div role="radiogroup" aria-label="Supervisor visibility" className="grid gap-2 px-4 py-4 sm:grid-cols-3">
          {SUPERVISOR_POLICIES.map((p) => {
            const checked = supervisor.value === p.id;
            return (
              <label
                key={p.id}
                className={`rounded-md border px-3 py-2.5 transition-colors duration-150 ${checked ? 'border-primary bg-primary-soft' : 'border-slate-200'} ${canEdit ? 'cursor-pointer hover:border-slate-300' : 'cursor-not-allowed opacity-70'}`}>
                
                <input type="radio" name="supervisor" className="sr-only" checked={checked} disabled={!canEdit} onChange={() => runAction({ type: 'ADMIN_SET_SUPERVISOR_POLICY', value: p.id })} />
                <span className="block text-[12.5px] font-semibold text-slate-900">
                  {p.label}
                  {checked && <span className="ml-1.5 text-[10.5px] font-semibold text-status-warning">Draft</span>}
                </span>
                <span className="block text-[11px] leading-snug text-slate-500">{p.help}</span>
              </label>);

          })}
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
          The demo stores this choice but doesn’t yet change record visibility. It stays marked “Awaiting IOL confirmation” until the policy is agreed.
        </p>
      </AdminPanel>
    </div>);

}