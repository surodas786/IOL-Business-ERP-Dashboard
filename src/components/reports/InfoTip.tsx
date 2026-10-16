import React, { useId, useState } from 'react';
import { InfoIcon } from 'lucide-react';

/** Keyboard- and touch-friendly definition tooltip. */
export function InfoTip({ text, label = 'Definition' }: {text: string;label?: string;}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-slate-400 transition-colors duration-150 hover:text-slate-700 focus-visible:text-slate-700">
        
        <InfoIcon className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute left-1/2 top-full z-30 mt-1 w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-white shadow-lg transition-opacity duration-150 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        
        {text}
      </span>
    </span>);

}