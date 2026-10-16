import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlertIcon } from 'lucide-react';
import { useSession, getRole } from '../../contexts/SessionContext';
import type { ModuleId } from '../../types/erp';

interface AccessDeniedProps {
  title: string;
  module: ModuleId;
}

/** Shown when the active demo account opens a module its single role doesn't include. */
export function AccessDenied({ title, module }: AccessDeniedProps) {
  const { user, role, switchableUsers, switchUser } = useSession();
  const suggestions = switchableUsers.filter((u) => getRole(u).modules.includes(module)).slice(0, 2);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section aria-labelledby="denied-title" className="w-full max-w-lg rounded-md border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-rose-50 text-status-critical">
            <ShieldAlertIcon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-status-critical">Access denied · 403</p>
            <h1 id="denied-title" className="mt-0.5 text-[17px] font-bold text-slate-900">
              You can’t open {title}
            </h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
              The <span className="font-semibold">{role.label}</span> role doesn’t include this area. Each account holds exactly one role, so
              access can’t be added alongside it.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-b border-slate-100 text-[12px]">
          <div className="px-5 py-3">
            <dt className="text-slate-400">Signed in as</dt>
            <dd className="font-semibold text-slate-800">{user.name}</dd>
          </div>
          <div className="border-l border-slate-100 px-5 py-3">
            <dt className="text-slate-400">Role</dt>
            <dd className="font-semibold text-slate-800">{role.label}</dd>
          </div>
        </dl>
        <div className="px-5 py-4">
          <p className="text-[12px] text-slate-600">If you need this for your work, ask a System Administrator to review your role.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover">
              
              Back to dashboard
            </Link>
            {suggestions.map((s) =>
            <button
              key={s.id}
              type="button"
              onClick={() => switchUser(s.id)}
              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50">
              
                Switch to {s.name} · {getRole(s).label}
              </button>
            )}
          </div>
          <p className="mt-4 text-[10.5px] leading-snug text-slate-400">
            Demo only: this screen is a browser-side check. In production the server must refuse the same request.
          </p>
        </div>
      </section>
    </div>);

}