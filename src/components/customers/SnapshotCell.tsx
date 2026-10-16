import React from 'react';
import { HistoryIcon } from 'lucide-react';
import type { CustomerSnapshot } from '../../types/customer';
import type { Customer } from '../../types/records';

/** The customer identity a document was issued under; flags when it differs from today's profile. */
export function SnapshotCell({ snapshot, customer }: {snapshot?: CustomerSnapshot;customer: Customer;}) {
  if (!snapshot) return <span className="text-[11.5px] text-slate-500">{customer.name}</span>;
  const changed = snapshot.name !== customer.name || snapshot.registeredAddress !== (customer.registeredAddress ?? '') || customer.category && snapshot.category !== customer.category;
  return (
    <span className="block max-w-[260px]">
      <span className="block text-[11.5px] text-slate-800">{snapshot.name}</span>
      {changed &&
      <span className="mt-0.5 flex items-start gap-1 text-[10.5px] leading-snug text-status-info" title={`${snapshot.category} · ${snapshot.registeredAddress}`}>
          <HistoryIcon className="mt-px h-3 w-3 shrink-0" aria-hidden />
          As issued — profile corrected since ({snapshot.registeredAddress !== (customer.registeredAddress ?? '') ? snapshot.registeredAddress : snapshot.category})
        </span>
      }
    </span>);

}