import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { PrinterIcon, XIcon } from 'lucide-react';
import { IOL_LOGO_URL } from '../../data/brand';

interface Props {
  title: string;
  note?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Full-screen printable preview. Rendered outside the app root so the browser prints only the sheet. */
export function PrintPreview({ title, note, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="print-portal fixed inset-0 z-[60] overflow-y-auto bg-slate-700/60 px-3 pb-10 pt-0 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}>
      
      <div className="print-toolbar sticky top-0 z-10 -mx-3 mb-4 flex items-center justify-between gap-3 bg-navy px-4 py-2.5 text-white sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{title}</p>
          {note && <p className="truncate text-[11px] text-slate-300">{note}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover">
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print
          </button>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <article className="print-sheet mx-auto max-w-[800px] rounded-sm bg-white px-8 py-9 text-[12px] leading-relaxed text-slate-800 shadow-xl sm:px-12">{children}</article>
    </motion.div>,
    document.body
  );
}

/** Letterhead shared by printable documents. */
export function DocumentHeader({ docTitle, docId, meta, stamp }: {docTitle: string;docId: string;meta: {label: string;value: string;}[];stamp?: string;}) {
  return (
    <header className="mb-6 border-b-2 border-slate-900 pb-4">
      <div className="flex items-start justify-between gap-6">
        <div>
          <img src={IOL_LOGO_URL} alt="" className="mb-2 h-12 w-auto" />
          <p className="text-[17px] font-bold text-slate-900">Innovative Online Limited</p>
          <p className="text-[11px] text-slate-600">House 42 (Level 5), Road 11, Banani, Dhaka 1213 · +880 9612-000465 · iol.demo</p>
          <p className="mt-1 text-[10.5px] font-semibold text-status-warning">FICTIONAL DEMO DOCUMENT — not a commercial offer</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold uppercase tracking-wide text-slate-900">{docTitle}</p>
          <p className="font-mono text-[12px] text-slate-700">{docId}</p>
          {stamp && <p className="mt-1 inline-block border border-status-critical px-1.5 text-[10px] font-bold uppercase text-status-critical">{stamp}</p>}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-4">
        {meta.map((m) =>
        <div key={m.label}>
            <dt className="text-[10px] font-semibold uppercase text-slate-500">{m.label}</dt>
            <dd className="text-[11.5px] text-slate-900">{m.value}</dd>
          </div>
        )}
      </dl>
    </header>);

}

export function DocSection({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>);

}

export function DocRows({ rows }: {rows: [string, React.ReactNode][];}) {
  return (
    <table className="w-full">
      <tbody>
        {rows.map(([k, v]) =>
        <tr key={k} className="align-top">
            <th scope="row" className="w-[38%] py-0.5 pr-3 text-left text-[11.5px] font-medium text-slate-500">
              {k}
            </th>
            <td className="py-0.5 text-[11.5px] text-slate-900">{v}</td>
          </tr>
        )}
      </tbody>
    </table>);

}