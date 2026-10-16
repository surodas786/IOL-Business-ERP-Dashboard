import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, hasPermission, inUserScope } from '../utils/access';
import { formatBDT } from '../utils/format';
import { branchName, userName } from '../utils/relations';
import { canEditProfile, connectionProduct, profileCategory, profileContacts, profileStage } from '../utils/customerProfile';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { inputClass } from '../components/admin/FormField';
import { primaryBtn } from '../components/admin/AdminPanel';
import { CustomerTable } from '../components/customers/CustomerTable';
import { LockBadge } from '../components/customers/LockBadge';
import { ProfileDialog } from '../components/customers/ProfileDialog';
import { CUSTOMER_PROFILE_CATEGORIES, type CustomerProfileCategory } from '../types/customer';
import type { Customer } from '../types/records';

type LockFilter = 'all' | 'draft' | 'locked';

export function Customers() {
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CustomerProfileCategory | 'all'>('all');
  const [lock, setLock] = useState<LockFilter>('all');
  const [creating, setCreating] = useState(false);
  const fin = hasPermission(role, 'viewFinancials');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.customers.
    filter((c) => inUserScope(user, c.branchId) && (branchFilter === 'all' || c.branchId === branchFilter) && (zoneFilter === 'all' || c.zoneId === zoneFilter)).
    filter((c) => category === 'all' || profileCategory(c) === category).
    filter((c) => lock === 'all' || lock === 'draft' === (profileStage(db, c) === 'Draft')).
    filter((c) => {
      if (!q) return true;
      const sites = db.sites.filter((s) => s.customerId === c.id);
      const hay = [c.id, c.name, c.nameBn, ...sites.map((s) => s.address), ...profileContacts(db, c).flatMap((x) => [x.name, x.nameBn ?? '', x.phone])].join(' ').toLowerCase();
      return hay.includes(q) || hay.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''));
    }).
    sort((a, b) => a.name.localeCompare(b.name));
  }, [db, user, branchFilter, zoneFilter, category, lock, query]);

  if (!canAccessModule(role, 'customers')) return <AccessDenied title="Customers" module="customers" />;

  const services = (c: Customer) => {
    const counts = new Map<string, number>();
    db.connections.filter((x) => x.customerId === c.id && x.status !== 'Disconnected').forEach((x) => counts.set(connectionProduct(x), (counts.get(connectionProduct(x)) ?? 0) + 1));
    return Array.from(counts.entries()).map(([p, n]) => n > 1 ? `${p} ×${n}` : p).join(' · ') || '—';
  };

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Customers</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">{rows.length} customers · customer, site, service connection and billing account are kept as separate records · fictional demo data</p>
        </div>
        {canEditProfile(role) &&
        <button type="button" className={primaryBtn} onClick={() => setCreating(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New draft profile
          </button>
        }
      </div>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input aria-label="Search customers" placeholder="Name (English or বাংলা), ID, contact, phone or site address…" className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select aria-label="Category" className={`${inputClass} w-auto`} value={category} onChange={(e) => setCategory(e.target.value as CustomerProfileCategory | 'all')}>
            <option value="all">All categories</option>
            {CUSTOMER_PROFILE_CATEGORIES.map((c) =>
            <option key={c}>{c}</option>
            )}
          </select>
          <div role="group" aria-label="Profile lock" className="flex rounded-md border border-slate-200 p-0.5">
            {(['all', 'draft', 'locked'] as LockFilter[]).map((l) =>
            <button key={l} type="button" aria-pressed={lock === l} onClick={() => setLock(l)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${lock === l ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {l === 'all' ? 'All' : l === 'draft' ? 'Draft' : 'Locked'}
              </button>
            )}
          </div>
        </div>
        <CustomerTable
          minWidth={980}
          rows={rows}
          rowKey={(c) => c.id}
          onOpen={(c) => navigate(`/customers/${c.id}`)}
          empty="No customers match these filters."
          columns={[
          {
            label: 'Customer',
            cell: (c) =>
            <span>
                  <span className="block font-semibold text-slate-900">{c.name}</span>
                  <span lang="bn" className="block text-[11px] text-slate-500">
                    {c.nameBn} · {c.id}
                  </span>
                </span>

          },
          { label: 'Category', cell: (c) => profileCategory(c) },
          { label: 'Sites', align: 'right', cell: (c) => db.sites.filter((s) => s.customerId === c.id).length },
          { label: 'Services', cell: (c) => <span className="text-[11.5px]">{services(c)}</span> },
          {
            label: 'Billing accounts',
            cell: (c) => {
              const n = db.billingAccounts.filter((b) => b.customerId === c.id).length;
              return n === 0 ? '—' : <span className="text-[11.5px]">{n === 1 ? '1 · consolidated' : `${n} · separate`}</span>;
            }
          },
          ...(fin ? [{ label: 'Active MRC', align: 'right' as const, cell: (c: Customer) => formatBDT(db.connections.filter((x) => x.customerId === c.id && x.status === 'Active').reduce((s, x) => s + x.mrc, 0)) }] : []),
          { label: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
          { label: 'Profile', cell: (c) => <LockBadge stage={profileStage(db, c)} /> },
          {
            label: 'Owner · branch',
            cell: (c) =>
            <span className="text-[11.5px]">
                  {userName(c.accountManagerId)}
                  <span className="block text-slate-500">{branchName(c.branchId)}</span>
                </span>

          }]
          } />
        
      </section>

      <AnimatePresence>{creating && <ProfileDialog key="new" onClose={() => setCreating(false)} onSaved={(id) => id && navigate(`/customers/${id}`)} />}</AnimatePresence>
    </div>);

}