import React from 'react';
import { CheckIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { getRole, useSession } from '../../contexts/SessionContext';

interface UserSwitcherListProps {
  onSelect?: () => void;
}

export function UserSwitcherList({ onSelect }: UserSwitcherListProps) {
  const { user: active, switchUser, switchableUsers } = useSession();

  return (
    <ul role="listbox" aria-label="Demo accounts" className="py-1">
      {switchableUsers.map((u) => {
        const selected = u.id === active.id;
        const scope = u.branch ? branches.find((b) => b.id === u.branch)?.name : 'All branches';
        return (
          <li key={u.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                switchUser(u.id);
                onSelect?.();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-100 ${
              selected ? 'bg-primary-soft' : 'hover:bg-slate-50'}`
              }>
              
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-white">
                {u.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-slate-900">{u.name}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {getRole(u).label} · {scope}
                </span>
              </span>
              {selected && <CheckIcon className="h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />}
            </button>
          </li>);

      })}
    </ul>);

}