import React, { useState } from 'react';
import { branches } from '../../data/branches';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { nextId } from '../../utils/relations';
import { profileCategory } from '../../utils/customerProfile';
import { validateProfileDraft, type ProfileDraft } from '../../utils/customerWorkflow';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { CUSTOMER_PROFILE_CATEGORIES, type CustomerProfileCategory } from '../../types/customer';
import type { BranchId } from '../../types/erp';
import type { Customer } from '../../types/records';

interface ProfileDialogProps {
  /** Omit to create a new draft profile. */
  customer?: Customer;
  onClose: () => void;
  onSaved?: (id?: string) => void;
}

/** Create or edit a Draft customer profile. Locked profiles never reach this dialog. */
export function ProfileDialog({ customer: c, onClose, onSaved }: ProfileDialogProps) {
  const { db } = useData();
  const { user } = useSession();
  const runAction = useRunAction();
  const homeBranch = (user.branch ?? user.stationBranchId) as BranchId;
  const [d, setD] = useState<ProfileDraft>(() => ({
    name: c?.name ?? '',
    nameBn: c?.nameBn ?? '',
    category: c ? profileCategory(c) : 'Corporate',
    registeredAddress: c?.registeredAddress ?? '',
    tradeLicenceNo: c?.tradeLicenceNo ?? '',
    tin: c?.tin ?? '',
    branchId: c?.branchId ?? homeBranch,
    zoneId: c?.zoneId ?? branches.find((b) => b.id === homeBranch)?.zones[0].id ?? '',
    contactName: '',
    contactPhone: '',
    contactEmail: ''
  }));
  const [tried, setTried] = useState(false);
  const errors = tried ? validateProfileDraft(d, !c) : {};
  const set = <K extends keyof ProfileDraft,>(k: K, v: ProfileDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const branch = branches.find((b) => b.id === d.branchId);

  const submit = () => {
    setTried(true);
    if (Object.keys(validateProfileDraft(d, !c)).length) return;
    const newId = c ? undefined : nextId(db.customers, 'CU-', 4);
    if (runAction({ type: 'CUST_SAVE_DRAFT', customerId: c?.id, draft: d })) {
      onClose();
      onSaved?.(newId);
    }
  };

  return (
    <CrmDialog
      title={c ? 'Edit draft profile' : 'New draft customer profile'}
      description="Core fields stay editable while the profile is a Draft. Submitting into Survey or Negotiation locks them. Bangla or English."
      onClose={onClose}
      onSubmit={submit}
      submitLabel={c ? 'Save draft' : 'Create draft'}
      size="lg">
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Legal name" htmlFor="pf-name" required error={errors.name}>
          <input id="pf-name" className={fieldInput} value={d.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Legal name (Bangla)" htmlFor="pf-namebn">
          <input id="pf-namebn" lang="bn" className={fieldInput} value={d.nameBn} onChange={(e) => set('nameBn', e.target.value)} placeholder="বাংলায় নাম" />
        </FormField>
        <FormField label="Customer category" htmlFor="pf-cat">
          <select id="pf-cat" className={fieldInput} value={d.category} onChange={(e) => set('category', e.target.value as CustomerProfileCategory)}>
            {CUSTOMER_PROFILE_CATEGORIES.map((x) =>
            <option key={x}>{x}</option>
            )}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Branch" htmlFor="pf-branch">
            <select
              id="pf-branch"
              className={fieldInput}
              value={d.branchId}
              disabled={!!user.branch}
              onChange={(e) => {
                const b = branches.find((x) => x.id === e.target.value)!;
                setD((p) => ({ ...p, branchId: b.id, zoneId: b.zones[0].id }));
              }}>
              
              {branches.map((b) =>
              <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              )}
            </select>
          </FormField>
          <FormField label="Zone" htmlFor="pf-zone" error={errors.zoneId}>
            <select id="pf-zone" className={fieldInput} value={d.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
              {branch?.zones.map((z) =>
              <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              )}
            </select>
          </FormField>
        </div>
        <FormField label="Registered address" htmlFor="pf-addr" required error={errors.registeredAddress} className="sm:col-span-2">
          <input id="pf-addr" className={fieldInput} value={d.registeredAddress} onChange={(e) => set('registeredAddress', e.target.value)} placeholder="House, road, area, city and post code" />
        </FormField>
        <FormField label="Trade licence no." htmlFor="pf-tl" help="Restricted identity field.">
          <input id="pf-tl" className={fieldInput} value={d.tradeLicenceNo} onChange={(e) => set('tradeLicenceNo', e.target.value)} />
        </FormField>
        <FormField label="TIN" htmlFor="pf-tin" help="Restricted identity field.">
          <input id="pf-tin" className={fieldInput} value={d.tin} onChange={(e) => set('tin', e.target.value)} placeholder="000-000-0000" />
        </FormField>
      </div>
      {!c &&
      <fieldset className="border-t border-slate-200 pt-4">
          <legend className="mb-3 text-[13px] font-bold text-slate-900">Primary contact</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Name" htmlFor="pf-cn" required error={errors.contactName}>
              <input id="pf-cn" className={fieldInput} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} />
            </FormField>
            <FormField label="Mobile" htmlFor="pf-cp" required error={errors.contactPhone}>
              <input id="pf-cp" inputMode="tel" className={fieldInput} value={d.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="01711-330245" />
            </FormField>
            <FormField label="Email" htmlFor="pf-ce" error={errors.contactEmail}>
              <input id="pf-ce" type="email" className={fieldInput} value={d.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
            </FormField>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Technical, billing and authorised contacts are added on the Contacts and Documents tab.</p>
        </fieldset>
      }
    </CrmDialog>);

}