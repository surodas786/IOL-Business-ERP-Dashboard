import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useDismiss } from '../../hooks/useDismiss';
import { canOpenRecord } from '../../utils/access';
import { buildSearchEntries } from '../../utils/search';
import { Popover } from './Popover';

export function GlobalSearch() {
  const { db } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entries = useMemo(() => buildSearchEntries(db).filter((e) => canOpenRecord(db, e.ref, user, role)), [db, user, role]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((e) => [e.title, e.titleBn ?? '', e.detail].some((f) => f.toLowerCase().includes(q))).slice(0, 8);
  }, [query, entries]);

  useEffect(() => setHighlight(0), [query]);

  const select = (index: number) => {
    const entry = results[index];
    if (!entry) return;
    openRecord(entry.ref);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      select(highlight);
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative w-full max-w-[340px]">
      <div className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 focus-within:border-primary focus-within:bg-white">
        <SearchIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search customers, jobs, tickets… / বাংলায় খুঁজুন"
          aria-label="Global search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400" />
        
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 sm:inline">Ctrl K</kbd>
      </div>
      <AnimatePresence>
        {showPanel &&
        <Popover className="left-0 right-0 top-full mt-1.5 min-w-[300px] overflow-hidden">
            <ul id="global-search-results" role="listbox" className="max-h-80 overflow-y-auto py-1">
              {results.length === 0 && <li className="px-3 py-3 text-[12px] text-slate-500">No matches you can access for “{query.trim()}”.</li>}
              {results.map((r, i) =>
            <li key={`${r.ref.type}-${r.ref.id}`} role="option" aria-selected={i === highlight}>
                  <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(i)}
                className={`block w-full px-3 py-1.5 text-left ${i === highlight ? 'bg-slate-50' : ''}`}>
                
                    <span className="block text-[12.5px] font-semibold text-slate-900">
                      {r.title}
                      {r.titleBn && <span className="ml-1.5 font-normal text-slate-500">{r.titleBn}</span>}
                    </span>
                    <span className="block text-[11px] text-slate-500">{r.detail}</span>
                  </button>
                </li>
            )}
            </ul>
            <div className="border-t border-slate-100 px-3 py-1.5 text-[10.5px] text-slate-400">
              Results limited to records available to {role.label}
            </div>
          </Popover>
        }
      </AnimatePresence>
    </div>);

}