import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDownIcon, LockIcon } from 'lucide-react';
import { navItems } from '../../data/navigation';
import { useSession } from '../../contexts/SessionContext';
import { RoleCard } from './RoleCard';

interface SidebarProps {
  collapsed: boolean;
  className?: string;
}

export function Sidebar({ collapsed, className = '' }: SidebarProps) {
  const { role } = useSession();
  const [showRestricted, setShowRestricted] = useState(false);
  const items = navItems.filter((item) => role.modules.includes(item.id));
  const restricted = navItems.filter((item) => !role.modules.includes(item.id));

  return (
    <aside
      className={`flex-col bg-navy transition-[width] duration-200 ease-out ${collapsed ? 'w-16' : 'w-[232px]'} flex-shrink-0 ${className}`}>
      
      <nav aria-label="Main navigation" className="scrollbar-navy flex-1 overflow-y-auto px-2 py-2.5">
        <ul className="space-y-px">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md py-[7px] text-[12px] transition-colors duration-150 ${
                  collapsed ? 'justify-center px-0' : 'px-2.5'} ${

                  isActive ?
                  `bg-navy-raised font-semibold text-white ${collapsed ? '' : 'border-l-[3px] border-primary-bright pl-[7px]'}` :
                  'text-slate-300 hover:bg-navy-hover hover:text-slate-100'}`

                  }>
                  
                  <Icon className="h-[15px] w-[15px] flex-shrink-0 opacity-90" aria-hidden />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </NavLink>
              </li>);

          })}
        </ul>
        {!collapsed && restricted.length > 0 &&
        <div className="mt-3 border-t border-navy-line pt-2">
            <button
            type="button"
            onClick={() => setShowRestricted((s) => !s)}
            aria-expanded={showRestricted}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[10.5px] text-navy-muted transition-colors duration-150 hover:text-slate-300">
            
              <span className="flex items-center gap-1.5">
                <LockIcon className="h-3 w-3" aria-hidden />
                {restricted.length} restricted for {role.label}
              </span>
              <ChevronDownIcon className={`h-3 w-3 transition-transform duration-150 ${showRestricted ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {showRestricted &&
          <ul className="mt-0.5 space-y-px">
                {restricted.map((item) =>
            <li key={item.id}>
                    <NavLink
                to={item.path}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-[6px] text-[11.5px] text-slate-500 transition-colors duration-150 hover:bg-navy-hover hover:text-slate-400">
                
                      <LockIcon className="h-3 w-3 flex-shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
            )}
              </ul>
          }
          </div>
        }
      </nav>
      <RoleCard collapsed={collapsed} />
    </aside>);

}