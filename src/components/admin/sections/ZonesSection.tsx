import React, { useEffect, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { branchName } from '../../../utils/relations';
import { AdminPanel, primaryBtn, secondaryBtn } from '../AdminPanel';

export function ZonesSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [zoneId, setZoneId] = useState(db.operationalZones[0]?.id ?? '');
  const zone = db.operationalZones.find((z) => z.id === zoneId)!;
  const [selected, setSelected] = useState<string[]>(zone.adminAreaIds);

  useEffect(() => setSelected(zone.adminAreaIds), [zone.adminAreaIds]);

  const ownerOf = (areaId: string) => db.operationalZones.find((z) => z.adminAreaIds.includes(areaId));
  const districts = db.adminAreas.filter((a) => a.level === 'District');
  const uncovered = db.adminAreas.filter((a) => a.level === 'Upazila / Thana' && !ownerOf(a.id)).length;
  const dirty = selected.slice().sort().join() !== zone.adminAreaIds.slice().sort().join();
  const branchIds = Array.from(new Set(db.operationalZones.map((z) => z.branchId)));
  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <AdminPanel title="Operational zones" description={`${db.operationalZones.length} IOL service zones · ${uncovered} upazila${uncovered === 1 ? '' : 's'} uncovered`}>
        <nav aria-label="Zones" className="pb-2">
          {branchIds.map((b) =>
          <div key={b}>
              <p className="px-4 pb-1 pt-3 text-[10.5px] font-semibold text-slate-400">{branchName(b)}</p>
              {db.operationalZones.
            filter((z) => z.branchId === b).
            map((z) =>
            <button
              key={z.id}
              type="button"
              aria-current={z.id === zoneId}
              onClick={() => setZoneId(z.id)}
              className={`flex w-full items-center justify-between px-4 py-1.5 text-left text-[12.5px] transition-colors duration-150 ${
              z.id === zoneId ? 'bg-primary-soft font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`
              }>
              
                    {z.name}
                    <span className="text-[11px] text-slate-500">{z.adminAreaIds.length} area{z.adminAreaIds.length === 1 ? '' : 's'}</span>
                  </button>
            )}
            </div>
          )}
        </nav>
      </AdminPanel>

      <AdminPanel
        title={`${zone.name} coverage`}
        description={`Branch ${branchName(zone.branchId)}. A zone can cover several upazilas / thanas, even across districts. Each area belongs to at most one zone.`}
        actions={
        canEdit &&
        <>
              <button type="button" className={secondaryBtn} disabled={!dirty} onClick={() => setSelected(zone.adminAreaIds)}>
                Discard
              </button>
              <button type="button" className={primaryBtn} disabled={!dirty} onClick={() => runAction({ type: 'ADMIN_SET_ZONE_COVERAGE', zoneId: zone.id, adminAreaIds: selected })}>
                Save coverage
              </button>
            </>

        }>
        
        <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {districts.map((d) => {
            const areas = db.adminAreas.filter((a) => a.parentId === d.id);
            if (areas.length === 0) return null;
            return (
              <fieldset key={d.id}>
                <legend className="mb-1 text-[11.5px] font-bold text-slate-800">{d.name}</legend>
                {areas.map((a) => {
                  const owner = ownerOf(a.id);
                  const elsewhere = owner && owner.id !== zone.id;
                  return (
                    <label key={a.id} className="flex items-start gap-2 py-1 text-[12.5px] text-slate-700">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={selected.includes(a.id)} disabled={!canEdit} onChange={() => toggle(a.id)} />
                      <span>
                        {a.name}
                        {elsewhere && !selected.includes(a.id) && <span className="block text-[10.5px] text-slate-400">Covered by {owner.name}</span>}
                        {elsewhere && selected.includes(a.id) && <span className="block text-[10.5px] text-status-warning">Will move from {owner.name}</span>}
                        {!owner && !selected.includes(a.id) && <span className="block text-[10.5px] text-status-warning">Uncovered</span>}
                      </span>
                    </label>);

                })}
              </fieldset>);

          })}
        </div>
      </AdminPanel>
    </div>);

}