import React from 'react';
import { Link } from 'react-router-dom';
import { IOL_LOGO_URL } from '../../data/brand';
import { MenuIcon } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { DemoMenu } from './DemoMenu';
import { GlobalSearch } from './GlobalSearch';
import { LocationFilters } from './LocationFilters';
import { NotificationMenu } from './NotificationMenu';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors duration-150 hover:bg-slate-50">
        
        <MenuIcon className="h-4 w-4" aria-hidden />
      </button>
      <Link to="/" className="flex flex-shrink-0 items-center gap-2 lg:border-r lg:border-slate-200 lg:pr-3.5">
        <img src={IOL_LOGO_URL} alt="Innovative Online Limited" className="h-8 w-auto" />
        <span className="hidden border-l border-slate-200 pl-2 text-[12.5px] font-bold leading-tight text-slate-900 sm:block">Business ERP</span>
      </Link>
      <Breadcrumbs className="hidden lg:block" />
      <div className="flex min-w-0 flex-1 justify-center">
        <GlobalSearch />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <LocationFilters className="hidden xl:flex" />
        <DemoMenu />
        <NotificationMenu />
        <UserMenu />
      </div>
    </header>);

}