import React, { useState } from 'react';
import { ScanLineIcon, XIcon } from 'lucide-react';
import { fieldTextarea } from '../field/fieldStyles';
import { parseSerials } from '../../utils/inventoryRules';

interface Props {
  id: string;
  value: string[];
  onChange: (serials: string[]) => void;
  /** Number of serials required. */
  expected: number;
  /** Serials the user can pick from, e.g. units in stock at the warehouse. */
  suggestions?: string[];
  label?: string;
}

/** Manual serial entry. Barcode / QR scanning is shown as a future extension only. */
export function SerialEntry({ id, value, onChange, expected, suggestions = [], label = 'Serial numbers' }: Props) {
  const [draft, setDraft] = useState('');
  const add = (list: string[]) => {
    const merged = [...value];
    list.forEach((s) => !merged.includes(s) && merged.push(s));
    onChange(merged);
  };
  const commit = () => {
    if (!draft.trim()) return;
    add(parseSerials(draft));
    setDraft('');
  };
  const open = suggestions.filter((s) => !value.includes(s));
  const mismatch = expected > 0 && value.length !== expected;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-semibold text-slate-700">
          {label}
          <span className="ml-0.5 text-status-critical">*</span>
        </label>
        <span className={`text-[11px] tabular-nums ${mismatch ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>
          {value.length} of {expected}
        </span>
      </div>
      <div className="flex gap-2">
        <textarea
          id={id}
          rows={2}
          className={`${fieldTextarea} font-mono`}
          placeholder="Type or paste serials — one per line or comma-separated, then press Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
          }} />
        
        <button type="button" disabled title="Barcode / QR scanning — future extension" className="flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-slate-300 px-2 text-center text-[10.5px] leading-tight text-slate-400">
          <ScanLineIcon className="h-4 w-4" aria-hidden />
          Scan — future extension
        </button>
      </div>
      {value.length > 0 &&
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Entered serials">
          {value.map((s) =>
        <li key={s} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((x) => x !== s))} className="text-slate-400 hover:text-slate-700">
                <XIcon className="h-3 w-3" />
              </button>
            </li>
        )}
        </ul>
      }
      {open.length > 0 && value.length < expected &&
      <div className="mt-2">
          <p className="mb-1 text-[11px] text-slate-500">In stock — tap to add</p>
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {open.slice(0, 40).map((s) =>
          <button key={s} type="button" onClick={() => add([s])} className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-600 transition-colors duration-150 hover:border-primary hover:text-primary">
                {s}
              </button>
          )}
          </div>
        </div>
      }
    </div>);

}