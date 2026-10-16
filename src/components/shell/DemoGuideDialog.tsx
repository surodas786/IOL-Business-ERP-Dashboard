import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRightIcon, XIcon } from 'lucide-react';
import { demoRules, demoScenarios, simulatedIntegrations } from '../../data/demoGuide';

const EASE = [0.23, 1, 0.32, 1] as const;

export function DemoGuideDialog({ onClose }: {onClose: () => void;}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-guide-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-lg bg-white shadow-xl outline-none sm:rounded-lg">
        
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="demo-guide-title" className="text-[16px] font-bold text-slate-900">Demo Guide</h2>
            <p className="text-[12px] text-slate-500">Fictional data for review. Switch demo users from this menu to see each role’s view.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close demo guide" className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700">
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <section aria-labelledby="dg-scen">
            <h3 id="dg-scen" className="text-[12.5px] font-bold text-slate-900">Scenarios to walk through</h3>
            <ol className="mt-2 divide-y divide-slate-100">
              {demoScenarios.map((s, i) =>
              <li key={s.title} className="grid gap-1 py-2.5 sm:grid-cols-[24px_minmax(0,1fr)_auto] sm:items-start sm:gap-3">
                  <span className="text-[12px] font-bold tabular-nums text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-900">{s.title}</p>
                    <p className="text-[12px] text-slate-600">{s.steps}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">As: {s.asUser}</p>
                  </div>
                  <Link to={s.path} onClick={onClose} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-primary hover:text-primary-hover">
                    Open <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              )}
            </ol>
          </section>
          <section aria-labelledby="dg-rules">
            <h3 id="dg-rules" className="text-[12.5px] font-bold text-slate-900">Rules you can test</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12px] text-slate-700">
              {demoRules.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>
          <section aria-labelledby="dg-sim">
            <h3 id="dg-sim" className="text-[12.5px] font-bold text-slate-900">Simulated integrations</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12px] text-slate-700">
              {simulatedIntegrations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>
          <p className="text-[11.5px] text-slate-500">To start over, use “Reset demo data” in the demo menu.</p>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}