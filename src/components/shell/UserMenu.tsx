import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookOpenIcon, ChevronDownIcon, InfoIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { useSession } from '../../contexts/SessionContext';
import { useDismiss } from '../../hooks/useDismiss';
import { Popover } from './Popover';
import { UserSwitcherList } from './UserSwitcherList';
import { DemoGuideDialog } from './DemoGuideDialog';

export function UserMenu() {
  const { user, role } = useSession();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const scope = user.branch ? branches.find((b) => b.id === user.branch)?.name : 'All branches';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-slate-50">
        
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-white">{user.initials}</span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block whitespace-nowrap text-[11.5px] font-semibold text-slate-900">{user.name}</span>
          <span className="block whitespace-nowrap text-[10px] text-slate-500">{role.label}</span>
        </span>
        <ChevronDownIcon className="h-3 w-3 text-slate-400" aria-hidden />
      </button>
      <AnimatePresence>
        {open &&
        <Popover className="right-0 top-full mt-1.5 w-72 overflow-hidden">
            <div className="border-b border-slate-100 px-3 py-2.5">
              <div className="text-[12.5px] font-bold text-slate-900">
                {user.name} <span className="font-normal text-slate-500">{user.nameBn}</span>
              </div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
              <div className="text-[11px] text-slate-500">{user.phone}</div>
              <div className="mt-1.5 text-[11px] text-slate-700">
                <span className="font-semibold">{role.label}</span> · {scope}
              </div>
            </div>
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold text-slate-500">Switch demo user</div>
            <div className="max-h-56 overflow-y-auto border-b border-slate-100">
              <UserSwitcherList onSelect={close} />
            </div>
            <button
            type="button"
            onClick={() => {
              close();
              setGuide(true);
            }}
            className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-[12px] font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-50">
            
              <BookOpenIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden /> Demo Guide
            </button>
            <p className="flex gap-2 bg-slate-50 px-3 py-2 text-[10.5px] leading-snug text-slate-500">
              <InfoIcon className="mt-px h-3 w-3 flex-shrink-0" aria-hidden />
              Role visibility in this demo is simulated in the browser for review. It is not a security control.
            </p>
          </Popover>
        }
      </AnimatePresence>
      <AnimatePresence>{guide && <DemoGuideDialog key="guide" onClose={() => setGuide(false)} />}</AnimatePresence>
    </div>);

}