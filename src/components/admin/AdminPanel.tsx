import React from 'react';

interface AdminPanelProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Bordered white panel used by every Administration section. */
export function AdminPanel({ title, description, actions, children, className = '' }: AdminPanelProps) {
  return (
    <section className={`overflow-hidden rounded-md border border-slate-200 bg-white ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>);

}

export const thClass = 'whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.03em] text-slate-400';
export const tdClass = 'border-t border-slate-100 px-3 py-2 align-middle text-[12px] text-slate-700';
export const primaryBtn =
'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:opacity-50';
export const secondaryBtn =
'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50';
export const linkBtn = 'whitespace-nowrap text-[11.5px] font-semibold text-primary transition-colors duration-150 hover:text-primary-hover disabled:text-slate-300';