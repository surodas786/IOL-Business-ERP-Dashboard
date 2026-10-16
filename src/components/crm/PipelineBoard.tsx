import React, { useMemo, useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { hasPermission } from '../../utils/access';
import { formatBDT } from '../../utils/format';
import { OpportunityCard } from './OpportunityCard';
import type { Opportunity } from '../../types/records';

interface Column {
  id: string;
  label: string;
  items: Opportunity[];
  outcome?: boolean;
}

export function PipelineBoard({ filters }: {filters: CrmFilters;}) {
  const { db, opportunities } = useCrmData(filters);
  const { role } = useSession();
  const pipe = hasPermission(role, 'viewPipeline');
  const [showClosed, setShowClosed] = useState(true);

  const columns: Column[] = useMemo(() => {
    const byStage: Column[] = db.crmStages.map((s) => ({
      id: s.id,
      label: s.label,
      items: opportunities.filter((o) => o.stage === s.id && (s.role === 'won' ? o.status === 'Won' : o.status === 'Open'))
    }));
    const outcomes: Column[] = [
    { id: 'stalled', label: 'Stalled', items: opportunities.filter((o) => o.status === 'Stalled'), outcome: true },
    { id: 'lost', label: 'Lost', items: opportunities.filter((o) => o.status === 'Lost'), outcome: true }];

    return showClosed ? [...byStage, ...outcomes] : byStage.filter((c) => db.crmStages.find((s) => s.id === c.id)?.role !== 'won');
  }, [db.crmStages, opportunities, showClosed]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <label className="flex items-center gap-2 text-[11.5px] text-slate-600">
          <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show Closed Won, Stalled and Lost
        </label>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((c) => {
          const total = c.items.reduce((s, o) => s + o.expectedMrc, 0);
          return (
            <section
              key={c.id}
              aria-label={`${c.label}, ${c.items.length} opportunities`}
              className={`flex w-[272px] flex-shrink-0 flex-col rounded-md ${c.outcome ? 'border border-dashed border-slate-300 bg-white/60' : 'bg-slate-100'}`}>
              
              <header className="flex items-baseline justify-between gap-2 px-3 pb-1.5 pt-2.5">
                <h2 className="text-[12px] font-bold text-slate-800">
                  {c.label} <span className="font-semibold text-slate-400">{c.items.length}</span>
                </h2>
                {pipe && c.items.length > 0 && <span className="text-[10.5px] font-semibold text-slate-500">{formatBDT(total)}/mo</span>}
              </header>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {c.items.length === 0 ?
                <p className="px-1 py-3 text-center text-[11px] text-slate-400">Nothing here</p> :

                c.items.map((o) => <OpportunityCard key={o.id} opportunity={o} />)
                }
              </div>
            </section>);

        })}
      </div>
      <p className="text-[10.5px] text-slate-400">
        Stages move from the opportunity screen. Work Order and Closed Won are set by delivery: quotation conversion and billing activation.
      </p>
    </div>);

}