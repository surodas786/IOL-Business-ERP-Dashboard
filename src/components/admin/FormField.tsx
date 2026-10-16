import React from 'react';

export const inputClass =
'h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, help, error, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-status-critical">*</span>}
      </label>
      {children}
      {error ?
      <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-status-critical">
          {error}
        </p> :

      help && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{help}</p>
      }
    </div>);

}