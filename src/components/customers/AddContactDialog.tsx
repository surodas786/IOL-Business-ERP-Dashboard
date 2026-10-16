import React, { useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canViewBillingContact } from '../../utils/customerProfile';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { CONTACT_ROLES, type ContactRole } from '../../types/customer';
import type { Customer } from '../../types/records';

export function AddContactDialog({ customer: c, onClose }: {customer: Customer;onClose: () => void;}) {
  const { role } = useSession();
  const runAction = useRunAction();
  const roleOptions = CONTACT_ROLES.filter((r) => r !== 'Billing' || canViewBillingContact(role));
  const [v, setV] = useState({ role: roleOptions[0] as ContactRole, name: '', nameBn: '', designation: '', phone: '', email: '' });
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  return (
    <CrmDialog
      title="Add contact"
      description={`${c.name} · contacts are not locked fields and can be added at any stage.`}
      onClose={onClose}
      submitLabel="Add contact"
      submitDisabled={!v.name.trim() || !v.phone.trim() && !v.email.trim()}
      onSubmit={() => runAction({ type: 'CUST_ADD_CONTACT', customerId: c.id, contact: { ...v, nameBn: v.nameBn.trim() || undefined } }) && onClose()}>
      
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Contact type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {roleOptions.map((r) =>
          <label key={r} className={`flex h-10 cursor-pointer items-center justify-center rounded-md border text-[12.5px] font-semibold transition-colors duration-150 ${v.role === r ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <input type="radio" name="ct-role" className="sr-only" checked={v.role === r} onChange={() => set('role', r)} />
              {r}
            </label>
          )}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="ct-name" required>
          <input id="ct-name" className={fieldInput} value={v.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Name (Bangla)" htmlFor="ct-namebn">
          <input id="ct-namebn" lang="bn" className={fieldInput} value={v.nameBn} onChange={(e) => set('nameBn', e.target.value)} />
        </FormField>
        <FormField label="Designation" htmlFor="ct-des" className="sm:col-span-2">
          <input id="ct-des" className={fieldInput} value={v.designation} onChange={(e) => set('designation', e.target.value)} />
        </FormField>
        <FormField label="Mobile" htmlFor="ct-phone">
          <input id="ct-phone" inputMode="tel" className={fieldInput} value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+880 1711-000000" />
        </FormField>
        <FormField label="Email" htmlFor="ct-email">
          <input id="ct-email" type="email" className={fieldInput} value={v.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
      </div>
    </CrmDialog>);

}