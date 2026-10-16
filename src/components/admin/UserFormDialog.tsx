import React from 'react';
import { motion } from 'framer-motion';
import { InfoIcon, XIcon } from 'lucide-react';
import { roles } from '../../data/roles';
import { branches } from '../../data/branches';
import { branchName } from '../../utils/relations';
import { FormField, inputClass } from './FormField';
import { useUserForm } from './useUserForm';
import type { BranchId, DemoUser, RoleId, ScopeType } from '../../types/erp';

interface UserFormDialogProps {
  user: DemoUser | null;
  onClose: () => void;
}

const SCOPE_OPTIONS: {id: ScopeType;label: string;help: string;}[] = [
{ id: 'branch', label: 'One branch', help: 'Works with every zone in a single branch.' },
{ id: 'zones', label: 'Selected zones', help: 'Limited to chosen operational zones in one branch.' },
{ id: 'company', label: 'Authorised company-wide', help: 'All branches. Only for roles with company-wide authority.' }];


export function UserFormDialog({ user, onClose }: UserFormDialogProps) {
  const { draft, set, errors, isSelf, managerOptions, manager, roleDisabledReason, submit, orgNodes, orgLevels } = useUserForm(user);
  const stationDiffers = manager && draft.stationBranchId && manager.stationBranchId !== draft.stationBranchId;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submit()) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} aria-hidden />
      <motion.form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        noValidate
        className="relative flex max-h-[94vh] w-full max-w-2xl flex-col rounded-t-lg bg-white shadow-xl sm:rounded-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
        
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 id="user-form-title" className="text-[15px] font-bold text-slate-900">
              {user ? `Edit ${user.name}` : 'New user'}
            </h2>
            <p className="text-[11.5px] text-slate-500">{isSelf ? 'You are editing your own account.' : 'Fields marked * are required. Bangla and English are both accepted.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-[12.5px] font-bold text-slate-900">Identity</legend>
            <FormField label="Name" htmlFor="uf-name" required error={errors.name}>
              <input id="uf-name" className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Name in Bangla" htmlFor="uf-namebn">
              <input id="uf-namebn" lang="bn" className={inputClass} value={draft.nameBn} onChange={(e) => set('nameBn', e.target.value)} placeholder="যেমন: তারেক আজিজ" />
            </FormField>
            <FormField label="Email" htmlFor="uf-email" required error={errors.email}>
              <input id="uf-email" type="email" className={inputClass} value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="name@iol.demo" />
            </FormField>
            <FormField label="Mobile" htmlFor="uf-phone" required error={errors.phone}>
              <input id="uf-phone" type="tel" inputMode="tel" className={inputClass} value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+880 1712-345678" />
            </FormField>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[12.5px] font-bold text-slate-900">Role</legend>
            <FormField
              label="Role (exactly one)"
              htmlFor="uf-role"
              required
              error={errors.role}
              help="Each account holds one role. To change someone’s duties, replace the role — a second role can’t be added.">
              
              <select id="uf-role" className={inputClass} value={draft.role} onChange={(e) => set('role', e.target.value as RoleId)}>
                <option value="">Select a role…</option>
                {roles.map((r) => {
                  const reason = roleDisabledReason(r.id);
                  return (
                    <option key={r.id} value={r.id} disabled={!!reason}>
                      {r.label}
                      {reason ? ` — ${reason}` : ''}
                    </option>);

                })}
              </select>
            </FormField>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-[12.5px] font-bold text-slate-900">Placement</legend>
            <FormField label="Department" htmlFor="uf-dept" required error={errors.departmentId}>
              <select id="uf-dept" className={inputClass} value={draft.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                <option value="">Select…</option>
                {orgNodes.map((n) =>
                <option key={n.id} value={n.id}>
                    {'\u00A0\u00A0'.repeat(n.level)}
                    {n.name} · {orgLevels[n.level]}
                  </option>
                )}
              </select>
            </FormField>
            <FormField label="Station or branch" htmlFor="uf-station" required error={errors.stationBranchId} help="Where the person is based.">
              <select id="uf-station" className={inputClass} value={draft.stationBranchId} onChange={(e) => set('stationBranchId', e.target.value as BranchId)}>
                <option value="">Select…</option>
                {branches.map((b) =>
                <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                )}
              </select>
            </FormField>
            <FormField label="Reporting manager" htmlFor="uf-manager" error={errors.managerId} className="sm:col-span-2" help="Can be in any branch. The reporting line never changes the branch or zone tags on records.">
              <select id="uf-manager" className={inputClass} value={draft.managerId} onChange={(e) => set('managerId', e.target.value)}>
                <option value="">No manager</option>
                {managerOptions.map((m) =>
                <option key={m.id} value={m.id}>
                    {m.name} · {roles.find((r) => r.id === m.role)?.label} · {branchName(m.stationBranchId)}
                  </option>
                )}
              </select>
            </FormField>
            {stationDiffers && manager &&
            <p className="flex gap-2 rounded-md bg-blue-50 px-3 py-2 text-[11.5px] leading-snug text-slate-700 sm:col-span-2">
                <InfoIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-status-info" aria-hidden />
                Stationed in {branchName(draft.stationBranchId)}, reporting to {manager.name} in {branchName(manager.stationBranchId)}. Records keep their own
                branch and zone tags — work done in {branchName(draft.stationBranchId)} stays tagged {branchName(draft.stationBranchId)}.
              </p>
            }
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[12.5px] font-bold text-slate-900">Assigned operational scope</legend>
            <div role="radiogroup" aria-label="Operational scope" className="grid gap-2 sm:grid-cols-3">
              {SCOPE_OPTIONS.map((o) =>
              <label
                key={o.id}
                className={`cursor-pointer rounded-md border px-3 py-2.5 transition-colors duration-150 ${
                draft.scopeType === o.id ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:border-slate-300'}`
                }>
                
                  <input type="radio" name="scope" className="sr-only" checked={draft.scopeType === o.id} onChange={() => set('scopeType', o.id)} />
                  <span className="block text-[12.5px] font-semibold text-slate-900">{o.label}</span>
                  <span className="block text-[11px] leading-snug text-slate-500">{o.help}</span>
                </label>
              )}
            </div>
            {draft.scopeType === 'branch' &&
            <FormField label="Branch" htmlFor="uf-scope-branch" className="mt-3 sm:max-w-xs">
                <select id="uf-scope-branch" className={inputClass} value={draft.scopeBranchId} onChange={(e) => set('scopeBranchId', e.target.value as BranchId)}>
                  <option value="">Select…</option>
                  {branches.map((b) =>
                <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                )}
                </select>
              </FormField>
            }
            {draft.scopeType === 'zones' &&
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {branches.map((b) =>
              <div key={b.id}>
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">{b.name}</p>
                    {b.zones.map((z) =>
                <label key={z.id} className="flex items-center gap-2 py-0.5 text-[12.5px] text-slate-700">
                        <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={draft.zoneIds.includes(z.id)}
                    onChange={(e) => set('zoneIds', e.target.checked ? [...draft.zoneIds, z.id] : draft.zoneIds.filter((x) => x !== z.id))} />
                  
                        {z.name}
                      </label>
                )}
                  </div>
              )}
              </div>
            }
            {errors.scopeType &&
            <p role="alert" className="mt-2 text-[11.5px] text-status-critical">
                {errors.scopeType}
              </p>
            }
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[12.5px] font-bold text-slate-900">Account status</legend>
            <FormField
              label="Status"
              htmlFor="uf-status"
              error={errors.status}
              help={user ? 'To deactivate an existing account use “Deactivate”, which hands open work to a successor and keeps ownership history.' : undefined}
              className="sm:max-w-xs">
              
              <select id="uf-status" className={inputClass} value={draft.status} disabled={!!user} onChange={(e) => set('status', e.target.value as 'Active' | 'Inactive')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </fieldset>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="h-9 rounded-md bg-primary px-4 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover">
            {user ? 'Save changes' : 'Create user'}
          </button>
        </footer>
      </motion.form>
    </div>);

}