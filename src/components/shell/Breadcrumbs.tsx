import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems } from '../../data/navigation';
import { adminSections } from '../../data/adminSections';
import { crmViews } from '../../data/crmViews';
import { fieldViews } from '../../data/fieldViews';
import { REPORT_GROUPS } from '../../utils/reports';

export function Breadcrumbs({ className = '' }: {className?: string;}) {
  const { pathname } = useLocation();
  const [, first, second, third] = pathname.split('/');
  const current = navItems.find((n) => n.path === `/${first ?? ''}`) ?? navItems[0];
  const crmSection =
  current.id === 'crm' ?
  second === 'opportunities' && third ?
  { label: third } :
  second === 'tenders' && third ?
  { label: `Tender ${third}` } :
  crmViews.find((v) => v.id === second) :
  undefined;
  const section =
  current.id === 'admin' ?
  adminSections.find((s) => s.id === second) :
  current.id === 'field' ?
  fieldViews.find((v) => v.id === second) :
  current.id === 'reports' ?
  REPORT_GROUPS.find((g) => g.id === second) :
  crmSection;

  return (
    <nav aria-label="Breadcrumb" className={`text-[12px] text-slate-500 ${className}`}>
      <ol className="flex items-center gap-1 whitespace-nowrap">
        <li>
          <Link to="/" className="transition-colors duration-150 hover:text-slate-900">
            Home
          </Link>
        </li>
        <li aria-hidden>/</li>
        {section ?
        <>
            <li>
              <Link to={current.path} className="transition-colors duration-150 hover:text-slate-900">
                {current.label}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-semibold text-slate-900">
              {section.label}
            </li>
          </> :

        <li aria-current="page" className="font-semibold text-slate-900">
            {current.label}
          </li>
        }
      </ol>
    </nav>);

}