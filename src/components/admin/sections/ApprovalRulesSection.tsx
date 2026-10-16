import React, { useState } from 'react';
import { roles } from '../../../data/roles';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { ruleCondition } from '../../../utils/approvalRules';
import { roleLabel } from '../../../utils/relations';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn, tdClass, thClass } from '../AdminPanel';
import { FormField, inputClass } from '../FormField';
import type { ApprovalRule } from '../../../types/admin';
import type { RoleId } from '../../../types/erp';

function RuleEditor({ rule, onDone }: {rule: ApprovalRule;onDone: () => void;}) {
  const runAction = useRunAction();
  const [threshold, setThreshold] = useState(String(rule.thresholdBdt ?? ''));
  const [sla, setSla] = useState(String(rule.slaHours));
  const [approvers, setApprovers] = useState<RoleId[]>(rule.approverRoles);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = runAction({
      type: 'ADMIN_UPDATE_APPROVAL_RULE',
      ruleId: rule.id,
      thresholdBdt: rule.comparator === 'any' ? undefined : Number(threshold.replace(/,/g, '')),
      approverRoles: approvers,
      slaHours: Number(sla)
    });
    if (ok) onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4 bg-slate-50 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-lg">
        {rule.comparator !== 'any' &&
        <FormField label="Threshold (BDT)" htmlFor={`thr-${rule.id}`} help="Shared with the paired rule for this approval type.">
            <input id={`thr-${rule.id}`} inputMode="numeric" className={inputClass} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </FormField>
        }
        <FormField label="SLA (hours)" htmlFor={`sla-${rule.id}`}>
          <input id={`sla-${rule.id}`} type="number" min={1} className={inputClass} value={sla} onChange={(e) => setSla(e.target.value)} />
        </FormField>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Approver roles</legend>
        <p className="mb-2 text-[11px] text-slate-500">Only roles that already hold the required authority can be chosen. Granting authority itself is a role change, not a rule edit.</p>
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
          {roles.map((r) => {
            const eligible = r.permissions.includes(rule.requiredPermission);
            return (
              <label key={r.id} className={`flex items-center gap-2 py-0.5 text-[12.5px] ${eligible ? 'text-slate-700' : 'text-slate-400'}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  disabled={!eligible}
                  checked={approvers.includes(r.id)}
                  onChange={(e) => setApprovers(e.target.checked ? [...approvers, r.id] : approvers.filter((x) => x !== r.id))} />
                
                {r.label}
                {!eligible && <span className="text-[10.5px]">· no authority</span>}
              </label>);

          })}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className={primaryBtn}>Save rule</button>
        <button type="button" className={secondaryBtn} onClick={onDone}>Cancel</button>
      </div>
    </form>);

}

export function ApprovalRulesSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <AdminPanel
      title="Approval rules"
      description="Rules decide who may approve each request in the Approvals queue. Management has no commission authority and System Administrators have no financial approval authority unless their role says so.">
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr>
              <th className={thClass}>Rule</th>
              <th className={thClass}>Applies to</th>
              <th className={thClass}>Condition</th>
              <th className={thClass}>Approvers</th>
              <th className={`${thClass} text-right`}>SLA</th>
              {canEdit && <th className={thClass}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {db.approvalRules.map((r) =>
            <React.Fragment key={r.id}>
                <tr>
                  <td className={tdClass}>
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    {r.note && <div className="text-[11px] text-slate-500">{r.note}</div>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{r.approvalType}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{ruleCondition(r)}</td>
                  <td className={tdClass}>{r.approverRoles.map(roleLabel).join(', ')}</td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>{r.slaHours} h</td>
                  {canEdit &&
                <td className={`${tdClass} text-right`}>
                      <button type="button" className={linkBtn} onClick={() => setEditing(editing === r.id ? null : r.id)} aria-expanded={editing === r.id}>
                        {editing === r.id ? 'Close' : 'Edit'}
                      </button>
                    </td>
                }
                </tr>
                {editing === r.id &&
              <tr>
                    <td colSpan={6} className="border-t border-slate-100 p-0">
                      <RuleEditor rule={r} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
              }
              </React.Fragment>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>);

}