import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileTextIcon, LockIcon, MailIcon, PhoneIcon, PlusIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { AdminPanel, secondaryBtn } from '../../admin/AdminPanel';
import { CustomerTable } from '../CustomerTable';
import { AddContactDialog } from '../AddContactDialog';
import { hasPermission } from '../../../utils/access';
import { formatDhaka } from '../../../utils/format';
import { userName } from '../../../utils/relations';
import { canEditProfile, canViewBillingContact, canViewIdentity, canViewPaymentDetails, maskReference, profileContacts } from '../../../utils/customerProfile';
import { CONTACT_ROLES, type CustomerDocument } from '../../../types/customer';
import type { Customer } from '../../../types/records';

const ROLE_HELP: Record<string, string> = {
  Primary: 'Day-to-day relationship',
  Technical: 'Link faults and site access',
  Billing: 'Invoices and payments',
  Authorised: 'Signs orders and changes'
};

export function ContactsTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const [adding, setAdding] = useState(false);
  const contacts = profileContacts(db, c);
  const billingOk = canViewBillingContact(role);
  const identityOk = canViewIdentity(role);
  const paymentOk = canViewPaymentDetails(role);
  const fin = hasPermission(role, 'viewFinancials');
  const canAdd = canEditProfile(role) || hasPermission(role, 'assignTickets');

  const docReference = (d: CustomerDocument) => {
    if (d.sensitivity === 'identity' && !identityOk) return <Restricted />;
    if (d.sensitivity === 'payment') {
      if (paymentOk) return d.reference;
      if (fin) return <span title="Full number visible to Accounts and Finance only">{maskReference(d.reference)}</span>;
      return <Restricted />;
    }
    return d.reference;
  };

  return (
    <div className="space-y-3">
      <AdminPanel
        title="Contacts"
        description="Primary, technical, billing and authorised contacts are captured separately."
        actions={
        canAdd &&
        <button type="button" className={secondaryBtn} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add contact
            </button>

        }>
        
        <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {CONTACT_ROLES.map((r) => {
            const list = contacts.filter((x) => x.role === r);
            return (
              <section key={r} aria-label={`${r} contacts`} className="px-4 py-3">
                <h3 className="text-[12.5px] font-bold text-slate-900">{r}</h3>
                <p className="text-[10.5px] text-slate-400">{ROLE_HELP[r]}</p>
                {r === 'Billing' && !billingOk ?
                <p className="mt-2 flex items-center gap-1 text-[11.5px] italic text-slate-400">
                    <LockIcon className="h-3 w-3" aria-hidden /> Hidden for {role.label}
                  </p> :
                list.length === 0 ?
                <p className="mt-2 text-[11.5px] text-status-warning">Not captured yet</p> :

                <ul className="mt-2 space-y-2.5">
                    {list.map((x) =>
                  <li key={x.id}>
                        <p className="text-[12.5px] font-semibold text-slate-900">{x.name}</p>
                        {x.nameBn &&
                    <p lang="bn" className="text-[11px] text-slate-500">
                            {x.nameBn}
                          </p>
                    }
                        {x.designation && <p className="text-[11px] text-slate-500">{x.designation}</p>}
                        {x.phone &&
                    <a href={`tel:${x.phone.replace(/[\s-]/g, '')}`} className="mt-0.5 flex items-center gap-1 text-[11.5px] text-primary hover:text-primary-hover">
                            <PhoneIcon className="h-3 w-3" aria-hidden /> {x.phone}
                          </a>
                    }
                        {x.email &&
                    <a href={`mailto:${x.email}`} className="flex items-center gap-1 break-all text-[11.5px] text-primary hover:text-primary-hover">
                            <MailIcon className="h-3 w-3 shrink-0" aria-hidden /> {x.email}
                          </a>
                    }
                      </li>
                  )}
                  </ul>
                }
              </section>);

          })}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Documents"
        description={
        identityOk && paymentOk ?
        'Identity documents and payment instructions are restricted to authorised roles.' :
        `Identity documents${paymentOk ? '' : ' and full payment details'} are restricted for ${role.label}.`
        }>
        
        <CustomerTable
          rows={c.documents ?? []}
          rowKey={(d) => d.id}
          empty="No documents on file."
          columns={[
          {
            label: 'Document',
            cell: (d) =>
            <span className="flex items-center gap-2">
                  <FileTextIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  <span>
                    <span className="block font-semibold text-slate-900">{d.type}</span>
                    <span className="block text-[11px] text-slate-500">{d.sensitivity === 'identity' && !identityOk ? 'File restricted' : d.fileName}</span>
                  </span>
                </span>

          },
          { label: 'Reference', cell: docReference },
          {
            label: 'Sensitivity',
            cell: (d) => <span className={`text-[11px] font-semibold ${d.sensitivity === 'general' ? 'text-slate-500' : 'text-status-warning'}`}>{d.sensitivity === 'identity' ? 'Identity' : d.sensitivity === 'payment' ? 'Payment' : 'General'}</span>
          },
          { label: 'Uploaded', cell: (d) => `${userName(d.byId)} · ${formatDhaka(d.uploadedAt)}` }]
          } />
        
        <p className="border-t border-slate-100 px-4 py-2 text-[10.5px] text-slate-400">Demo only: these restrictions are applied in the browser. Production access to identity and payment data must also be enforced on the server.</p>
      </AdminPanel>

      <AnimatePresence>{adding && <AddContactDialog key="add" customer={c} onClose={() => setAdding(false)} />}</AnimatePresence>
    </div>);

}

function Restricted() {
  return (
    <span className="inline-flex items-center gap-1 italic text-slate-400">
      <LockIcon className="h-3 w-3" aria-hidden /> Restricted
    </span>);

}