import React from 'react';

interface Props<T extends string> {
  label: string;
  options: {id: T;label: string;count?: number;}[];
  value: T;
  onChange: (v: T) => void;
}

export function FilterPills<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) =>
      <button
        key={o.id}
        type="button"
        aria-pressed={value === o.id}
        onClick={() => onChange(o.id)}
        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${value === o.id ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
        
          {o.label} {o.count !== undefined && <span className={value === o.id ? 'text-white/70' : 'text-slate-400'}>{o.count}</span>}
        </button>
      )}
    </div>);

}