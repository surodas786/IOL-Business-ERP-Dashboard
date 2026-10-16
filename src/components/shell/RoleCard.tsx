import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftRightIcon, CheckIcon, XIcon } from 'lucide-react';
import { getRole, useSession } from '../../contexts/SessionContext';
import { useDismiss } from '../../hooks/useDismiss';
import { Popover } from './Popover';
import { UserSwitcherList } from './UserSwitcherList';

const QUICK_SWITCH_ORDER = ['u-03', 'u-07', 'u-10', 'u-11', 'u-09', 'u-01'];

interface RoleCardProps {
  collapsed: boolean;
}

export function RoleCard({ collapsed }: RoleCardProps) {
  const { user, role, switchUser, switchableUsers } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const quick = QUICK_SWITCH_ORDER.filter((id) => id !== user.id).
  map((id) => switchableUsers.find((u) => u.id === id)).
  filter((u): u is NonNullable<typeof u> => !!u).
  slice(0, 2);

  if (collapsed) {
    return (
      <div ref={ref} className="relative flex justify-center border-t border-navy-line bg-navy-deep py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Active demo user ${user.name}, ${role.label}. Switch user`}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white ring-2 ring-navy-line transition-colors duration-150 hover:bg-primary-hover">
          
          {user.initials}
        </button>
        <AnimatePresence>
          {open &&
          <Popover direction="up" className="bottom-2 left-full ml-2 w-72">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">Switch demo user</div>
              <div className="max-h-[420px] overflow-y-auto">
                <UserSwitcherList onSelect={close} />
              </div>
            </Popover>
          }
        </AnimatePresence>
      </div>);

  }

  return (
    <div className="border-t border-navy-line bg-navy-deep px-3 pb-3 pt-2.5">
      <div className="rounded-[7px] border border-navy-line bg-navy-raised px-2.5 pb-2.5 pt-2">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-white">
            {user.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11.5px] font-bold leading-tight text-white">{user.name}</div>
            <div className="text-[10px] font-semibold text-primary-bright">{role.label}</div>
          </div>
        </div>

        <div className="mb-0.5 mt-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">Can see</div>
        <ul>
          {role.can.map((c) =>
          <li key={c} className="flex gap-1.5 py-[1.5px] text-[10.3px] leading-snug text-slate-300">
              <CheckIcon className="mt-[2px] h-2.5 w-2.5 flex-shrink-0 text-emerald-400" aria-hidden />
              {c}
            </li>
          )}
        </ul>
        <div className="mb-0.5 mt-1.5 text-[9px] font-bold uppercase tracking-wide text-rose-300">Cannot see</div>
        <ul>
          {role.cannot.map((c) =>
          <li key={c} className="flex gap-1.5 py-[1.5px] text-[10.3px] leading-snug text-slate-400">
              <XIcon className="mt-[2px] h-2.5 w-2.5 flex-shrink-0 text-rose-400" aria-hidden />
              {c}
            </li>
          )}
        </ul>

        <div className="my-2 border-t border-dashed border-navy-line" />
        <div className="mb-1.5 flex justify-between text-[9.5px] uppercase tracking-wide text-navy-muted">
          <span>Switch demo user</span>
          <span>{switchableUsers.length} active accounts</span>
        </div>
        {quick.map((q) =>
        <button
          key={q.id}
          type="button"
          onClick={() => switchUser(q.id)}
          className="mb-1 flex w-full items-center rounded-md border border-navy-line bg-navy px-2 py-1 text-left text-[10.5px] text-slate-200 transition-colors duration-150 hover:border-primary/60">
          
            <span className="truncate">
              {q.name} <span className="text-[9.5px] text-slate-500">· {getRole(q).label}</span>
            </span>
          </button>
        )}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-1.5 text-[11px] font-bold text-white transition-colors duration-150 hover:bg-primary-hover">
            
            <ArrowLeftRightIcon className="h-3 w-3" aria-hidden />
            Switch user
          </button>
          <AnimatePresence>
            {open &&
            <Popover direction="up" className="bottom-full left-0 mb-2 w-72">
                <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  Each account holds exactly one role
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  <UserSwitcherList onSelect={close} />
                </div>
              </Popover>
            }
          </AnimatePresence>
        </div>
      </div>
    </div>);

}