import React from 'react';

/** Workload points against capacity. */
export function LoadBar({ points, capacity }: {points: number;capacity: number;}) {
  const pct = Math.min(100, points / capacity * 100);
  const tone = pct >= 100 ? 'bg-status-critical' : pct >= 70 ? 'bg-status-warning' : 'bg-status-ok';
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Load ${points} of ${capacity}`}>
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] tabular-nums text-slate-600">
        {points}/{capacity}
      </span>
    </span>);

}