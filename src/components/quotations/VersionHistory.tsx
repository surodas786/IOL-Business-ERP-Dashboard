import React from 'react';
import { LockIcon } from 'lucide-react';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import type { QuotationVersion } from '../../types/quotation';

interface Props {
  versions: QuotationVersion[];
  selected: number;
  onSelect: (v: number) => void;
}

/** Every version of a quotation. Submitted versions are read-only; revisions create a new version. */
export function VersionHistory({ versions, selected, onSelect }: Props) {
  return (
    <section aria-label="Versions" className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">Versions</h2>
        <p className="text-[11px] text-slate-500">Earlier versions are kept exactly as issued.</p>
      </header>
      <ul role="listbox" aria-label="Select version" className="divide-y divide-slate-100">
        {[...versions].reverse().map((v) =>
        <li key={v.version}>
            <button
            type="button"
            role="option"
            aria-selected={v.version === selected}
            onClick={() => onSelect(v.version)}
            className={`block w-full px-4 py-2 text-left transition-colors duration-150 ${v.version === selected ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
            
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900">
                  v{v.version}
                  {v.status !== 'Draft' && <LockIcon className="h-3 w-3 text-slate-400" aria-label="Locked" />}
                </span>
                <StatusBadge status={v.status} />
              </span>
              <span className="block text-[11px] text-slate-600">{v.reason}</span>
              <span className="block text-[10.5px] text-slate-400">
                {userName(v.createdById)} · {formatDhaka(v.createdAt)}
                {v.approvedAt && ` · approved ${formatDhaka(v.approvedAt)}`}
              </span>
            </button>
          </li>
        )}
      </ul>
    </section>);

}