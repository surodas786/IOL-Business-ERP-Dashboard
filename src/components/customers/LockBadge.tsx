import React from 'react';
import { LockIcon, PencilLineIcon } from 'lucide-react';
import type { ProfileStage } from '../../types/customer';

/** Shows whether the core profile is editable (Draft) or locked, and at which stage. */
export function LockBadge({ stage, size = 'sm' }: {stage: ProfileStage;size?: 'sm' | 'md';}) {
  const draft = stage === 'Draft';
  const pad = size === 'md' ? 'px-2 py-1 text-[11.5px]' : 'px-1.5 py-px text-[10.5px]';
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded font-semibold ring-1 ring-inset ${pad} ${
      draft ? 'bg-blue-50 text-status-info ring-blue-200' : 'bg-slate-100 text-slate-700 ring-slate-300'}`
      }>
      
      {draft ? <PencilLineIcon className="h-3 w-3" aria-hidden /> : <LockIcon className="h-3 w-3" aria-hidden />}
      {draft ? 'Draft · editable' : `Locked · ${stage}`}
    </span>);

}