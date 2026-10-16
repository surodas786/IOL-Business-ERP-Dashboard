import React from 'react';
import { useData } from '../../contexts/DataContext';
import { formatDhaka } from '../../utils/format';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import type { Ticket } from '../../types/records';
import type { TicketResolution } from '../../types/ticket';

function ResolutionBody({ r }: {r: TicketResolution;}) {
  return (
    <div className="space-y-3 px-4 py-3 text-[12.5px]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10.5px] font-semibold text-slate-400">Description</p>
          <p className="text-slate-800">{r.description}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold text-slate-400">Work performed</p>
          <p className="text-slate-800">{r.workPerformed}</p>
        </div>
      </div>
      <div>
        <p className="text-[10.5px] font-semibold text-slate-400">Materials used</p>
        {r.materials.length ?
        <ul className="mt-1 space-y-1">
            {r.materials.map((m, i) =>
          <li key={i} className="text-slate-800">
                {m.quantity} {m.unit} · {m.itemName}
                {m.serials.length > 0 && <span className="font-mono text-[11px] text-slate-500"> ({m.serials.join(', ')})</span>}
                <span className="block text-[11px] text-slate-500">
                  {m.source === 'Warehouse' ? `Issued from ${m.warehouse} and installed` : 'From technician stock, installed'}
                  {m.movementIds.length > 0 && ` · inventory ${m.movementIds.join(', ')}`}
                </span>
              </li>
          )}
          </ul> :

        <p className="text-slate-600">No materials used</p>
        }
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[12px]">
        <span>
          <span className="text-slate-500">Resolved</span> {formatDhaka(r.resolvedAt, { year: true })} by {r.byName}
        </span>
        <span className="flex items-center gap-1.5">
          <StatusBadge status={r.confirmation} />
          {r.confirmedBy && <span className="text-slate-700">{r.confirmedBy}</span>}
        </span>
        {r.confirmationNote && <span className="text-slate-600">{r.confirmationNote}</span>}
      </div>
    </div>);

}

export function ResolutionPanel({ ticket: t }: {ticket: Ticket;}) {
  const { db } = useData();
  const movements = db.inventoryMovements.filter((m) => m.ticketId === t.id);
  if (!t.resolution && !(t.previousResolutions ?? []).length) return null;
  return (
    <>
      {t.resolution &&
      <AdminPanel title="Resolution" description={t.closedAt ? `Closed ${formatDhaka(t.closedAt)} by ${t.closedByName} · Account Manager notified` : undefined}>
          <ResolutionBody r={t.resolution} />
          {movements.length > 0 && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">{movements.length} inventory movement{movements.length === 1 ? '' : 's'} linked to this ticket, customer and service.</p>}
        </AdminPanel>
      }
      {(t.previousResolutions ?? []).length > 0 &&
      <AdminPanel title="Earlier resolutions" description="Kept when the ticket was reopened.">
          {t.previousResolutions!.map((r, i) =>
        <div key={i} className={i ? 'border-t border-slate-100' : ''}>
              <ResolutionBody r={r} />
            </div>
        )}
        </AdminPanel>
      }
    </>);

}