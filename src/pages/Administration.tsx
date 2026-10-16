import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { ServerIcon } from 'lucide-react';
import { adminSections, type AdminSectionId } from '../data/adminSections';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, hasPermission } from '../utils/access';
import { AccessDenied } from '../components/shell/AccessDenied';
import { UsersSection } from '../components/admin/sections/UsersSection';
import { RolesSection } from '../components/admin/sections/RolesSection';
import { OrganisationSection } from '../components/admin/sections/OrganisationSection';
import { GeographySection } from '../components/admin/sections/GeographySection';
import { ZonesSection } from '../components/admin/sections/ZonesSection';
import { ApprovalRulesSection } from '../components/admin/sections/ApprovalRulesSection';
import { MasterDataSection } from '../components/admin/sections/MasterDataSection';
import { AuditSection } from '../components/admin/sections/AuditSection';

export function Administration() {
  const { section } = useParams();
  const { role } = useSession();

  if (!canAccessModule(role, 'admin')) return <AccessDenied title="Administration" module="admin" />;

  const current = adminSections.find((s) => s.id === section);
  if (!current) return <Navigate to="/administration/users" replace />;

  const canEdit = hasPermission(role, 'manageUsers');

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">{current.label}</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">{current.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[208px_1fr]">
        <aside className="space-y-3">
          <nav aria-label="Administration sections" className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <ul className="flex gap-0.5 p-1 lg:flex-col">
              {adminSections.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <NavLink
                      to={`/administration/${s.id}`}
                      className={({ isActive }) =>
                      `flex items-center gap-2 whitespace-nowrap rounded px-2.5 py-1.5 text-[12px] transition-colors duration-150 ${
                      isActive ? 'bg-primary-soft font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`

                      }>
                      
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
                      {s.label}
                    </NavLink>
                  </li>);

              })}
            </ul>
          </nav>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-[11.5px] leading-relaxed text-slate-700" role="note">
            <p className="flex items-center gap-1.5 font-semibold text-status-warning">
              <ServerIcon className="h-3.5 w-3.5" aria-hidden /> Server enforcement required
            </p>
            <p className="mt-1">
              Everything here runs in your browser on fictional data. Hiding menus and blocking buttons is for demonstration only — in production
              every role, scope and approval rule must also be enforced on the server, for every request.
            </p>
          </div>
          {!canEdit &&
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11.5px] text-slate-600">Read-only: your role can view but not change settings.</p>
          }
        </aside>

        <div className="min-w-0">
          <SectionBody id={current.id} canEdit={canEdit} />
        </div>
      </div>
    </div>);

}

function SectionBody({ id, canEdit }: {id: AdminSectionId;canEdit: boolean;}) {
  switch (id) {
    case 'users':
      return <UsersSection canEdit={canEdit} />;
    case 'roles':
      return <RolesSection canEdit={canEdit} />;
    case 'organisation':
      return <OrganisationSection canEdit={canEdit} />;
    case 'geography':
      return <GeographySection canEdit={canEdit} />;
    case 'zones':
      return <ZonesSection canEdit={canEdit} />;
    case 'approval-rules':
      return <ApprovalRulesSection canEdit={canEdit} />;
    case 'master-data':
      return <MasterDataSection canEdit={canEdit} />;
    case 'audit':
      return <AuditSection />;
  }
}