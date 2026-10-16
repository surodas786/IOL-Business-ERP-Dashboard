import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, FilePenLineIcon, PencilIcon, SendIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { canAccessModule, inUserScope } from '../utils/access';
import { branchName, userName, zoneName } from '../utils/relations';
import { canEditProfile, canRequestCorrection, correctionsOpen, profileCategory, profileStage } from '../utils/customerProfile';
import { customerTabs, type CustomerTabId } from '../data/customerTabs';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { LockBadge } from '../components/customers/LockBadge';
import { ProfileDialog } from '../components/customers/ProfileDialog';
import { CorrectionDialog } from '../components/customers/CorrectionDialog';
import { CrmDialog as CrmDialogLazy } from '../components/crm/CrmDialog';
import { OverviewTab } from '../components/customers/tabs/OverviewTab';
import { ContactsTab } from '../components/customers/tabs/ContactsTab';
import { SitesTab } from '../components/customers/tabs/SitesTab';
import { SalesTab } from '../components/customers/tabs/SalesTab';
import { SurveysTab } from '../components/customers/tabs/SurveysTab';
import { QuotationsTab } from '../components/customers/tabs/QuotationsTab';
import { InstallationTab } from '../components/customers/tabs/InstallationTab';
import { BillingTab } from '../components/customers/tabs/BillingTab';
import { EquipmentTab } from '../components/customers/tabs/EquipmentTab';
import { ServiceChangesTab } from '../components/customers/tabs/ServiceChangesTab';
import { TicketsTab } from '../components/customers/tabs/TicketsTab';
import { ActivityTab } from '../components/customers/tabs/ActivityTab';
import type { Customer } from '../types/records';

const TAB_VIEWS: Record<CustomerTabId, React.ComponentType<{customer: Customer;}>> = {
  overview: OverviewTab,
  contacts: ContactsTab,
  sites: SitesTab,
  sales: SalesTab,
  surveys: SurveysTab,
  quotations: QuotationsTab,
  installation: InstallationTab,
  billing: BillingTab,
  equipment: EquipmentTab,
  'service-changes': ServiceChangesTab,
  tickets: TicketsTab,
  activity: ActivityTab
};

type Dialog = 'edit' | 'correction' | 'submit' | null;

export function CustomerDetail() {
  const { id, tab } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const navigate = useNavigate();
  const runAction = useRunAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [submitStage, setSubmitStage] = useState<'Survey' | 'Negotiation'>('Survey');

  if (!canAccessModule(role, 'customers')) return <AccessDenied title="Customers" module="customers" />;
  const c = db.customers.find((x) => x.id === id);
  if (!c || !inUserScope(user, c.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{c ? 'This customer is outside your branch scope.' : 'Customer not found.'}</p>
        <Link to="/customers" className={`${linkBtn} mt-2 inline-block`}>
          Back to customers
        </Link>
      </div>);

  }

  const tabs = customerTabs.filter((t) => t.visible(role));
  const hiddenCount = customerTabs.length - tabs.length;
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const View = TAB_VIEWS[active.id];
  const stage = profileStage(db, c);
  const draft = stage === 'Draft';
  const editor = canEditProfile(role);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/customers" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Customers
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">{c.id}</p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{c.name}</h1>
          <p lang="bn" className="text-[12.5px] text-slate-600">
            {c.nameBn}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={c.status} />
            <LockBadge stage={stage} size="md" />
            <span className="text-[11.5px] text-slate-500">
              {profileCategory(c)} · {branchName(c.branchId)}, {zoneName(c.zoneId)} · {userName(c.accountManagerId)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft && editor &&
          <>
              <button type="button" className={secondaryBtn} onClick={() => setDialog('edit')}>
                <PencilIcon className="h-3.5 w-3.5" aria-hidden /> Edit draft
              </button>
              <button type="button" className={primaryBtn} onClick={() => setDialog('submit')}>
                <SendIcon className="h-3.5 w-3.5" aria-hidden /> Submit profile
              </button>
            </>
          }
          {!draft && canRequestCorrection(role) &&
          <button
            type="button"
            className={secondaryBtn}
            disabled={!correctionsOpen(db, c)}
            title={correctionsOpen(db, c) ? undefined : `Corrections open at the Work Order stage (now ${stage}).`}
            onClick={() => setDialog('correction')}>
            
              <FilePenLineIcon className="h-3.5 w-3.5" aria-hidden /> Request correction at Work Order stage
            </button>
          }
        </div>
      </header>
      {!draft && canRequestCorrection(role) && !correctionsOpen(db, c) &&
      <p className="mb-3 text-[11.5px] text-slate-500">Core fields are locked. Corrections can be requested once this customer reaches the Work Order stage.</p>
      }

      <nav aria-label="Customer sections" className="-mx-4 mb-3 overflow-x-auto border-b border-slate-200 px-4 lg:-mx-5 lg:px-5">
        <ul className="flex gap-1" role="tablist">
          {tabs.map((t) =>
          <li key={t.id}>
              <button
              type="button"
              role="tab"
              aria-selected={t.id === active.id}
              onClick={() => navigate(`/customers/${c.id}/${t.id}`, { replace: true })}
              className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${
              t.id === active.id ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
              }>
              
                {t.label}
              </button>
            </li>
          )}
        </ul>
      </nav>
      {hiddenCount > 0 && <p className="-mt-1 mb-3 text-[11px] text-slate-400">{hiddenCount} tab{hiddenCount > 1 ? 's' : ''} hidden for {role.label}.</p>}

      <View customer={c} />

      <AnimatePresence>
        {dialog === 'edit' && <ProfileDialog key="edit" customer={c} onClose={() => setDialog(null)} />}
        {dialog === 'correction' && <CorrectionDialog key="corr" customer={c} onClose={() => setDialog(null)} />}
        {dialog === 'submit' &&
        <SubmitDialog key="submit" stage={submitStage} setStage={setSubmitStage} onClose={() => setDialog(null)} onSubmit={() => runAction({ type: 'CUST_SUBMIT_PROFILE', customerId: c.id, stage: submitStage }) && setDialog(null)} />
        }
      </AnimatePresence>
    </div>);

}

function SubmitDialog({ stage, setStage, onClose, onSubmit }: {stage: 'Survey' | 'Negotiation';setStage: (s: 'Survey' | 'Negotiation') => void;onClose: () => void;onSubmit: () => void;}) {
  return (
    <CrmDialogLazy title="Submit profile" description="Submitting locks the legal name, category, registered address, licence/TIN, branch and zone. Later changes need an approved correction." onClose={onClose} onSubmit={onSubmit} submitLabel={`Submit into ${stage}`}>
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Submit into</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['Survey', 'Negotiation'] as const).map((s) =>
          <label key={s} className={`flex h-10 cursor-pointer items-center justify-center rounded-md border text-[12.5px] font-semibold transition-colors duration-150 ${stage === s ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <input type="radio" name="submit-stage" className="sr-only" checked={stage === s} onChange={() => setStage(s)} />
              {s}
            </label>
          )}
        </div>
      </fieldset>
    </CrmDialogLazy>);

}