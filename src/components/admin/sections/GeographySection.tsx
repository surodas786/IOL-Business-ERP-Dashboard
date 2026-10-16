import React, { useMemo, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { AdminPanel, primaryBtn, tdClass, thClass } from '../AdminPanel';
import { FormField, inputClass } from '../FormField';
import type { AdminArea } from '../../../types/admin';

export function GeographySection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [code, setCode] = useState('');

  const zoneFor = useMemo(() => {
    const map = new Map<string, string>();
    db.operationalZones.forEach((z) => z.adminAreaIds.forEach((a) => map.set(a, z.name)));
    return map;
  }, [db.operationalZones]);

  const ordered: AdminArea[] = [];
  const walk = (pid: string | null) =>
  db.adminAreas.
  filter((a) => a.parentId === pid).
  forEach((a) => {
    ordered.push(a);
    walk(a.id);
  });
  walk(null);

  const depth = (a: AdminArea) => a.level === 'Division' ? 0 : a.level === 'District' ? 1 : 2;
  const parentOptions = db.adminAreas.filter((a) => a.level !== 'Upazila / Thana');
  const nextLevel = !parentId ? 'Division' : db.adminAreas.find((a) => a.id === parentId)?.level === 'Division' ? 'District' : 'Upazila / Thana';

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (runAction({ type: 'ADMIN_ADD_ADMIN_AREA', parentId: parentId || null, name, nameBn, code })) {
      setName('');
      setNameBn('');
      setCode('');
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <AdminPanel
        title="Government administrative areas"
        description="Division › District › Upazila / Thana, with geo codes. This hierarchy is fixed by government and is never edited to suit service zones.">
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <th className={thClass}>Area</th>
                <th className={thClass}>Level</th>
                <th className={thClass}>Geo code</th>
                <th className={thClass}>Served by operational zone</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((a) =>
              <tr key={a.id}>
                  <td className={tdClass} style={{ paddingLeft: 12 + depth(a) * 20 }}>
                    <span className={depth(a) === 0 ? 'font-bold text-slate-900' : depth(a) === 1 ? 'font-semibold text-slate-800' : ''}>{a.name}</span>
                    <span lang="bn" className="ml-1.5 text-[11px] text-slate-500">{a.nameBn}</span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-slate-500`}>{a.level}</td>
                  <td className={`${tdClass} font-mono text-[11px]`}>{a.code}</td>
                  <td className={tdClass}>
                    {a.level !== 'Upazila / Thana' ?
                  <span className="text-slate-300">—</span> :
                  zoneFor.get(a.id) ?
                  zoneFor.get(a.id) :

                  <span className="text-[11.5px] font-semibold text-status-warning">Not covered</span>
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {canEdit &&
      <AdminPanel title="Add administrative area" description="New areas start uncovered until a zone takes them on.">
          <form onSubmit={add} className="space-y-4 px-4 py-4">
            <FormField label="Parent" htmlFor="ga-parent" help={`Will be added as a ${nextLevel}.`}>
              <select id="ga-parent" className={inputClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None — new division</option>
                {parentOptions.map((a) =>
              <option key={a.id} value={a.id}>
                    {a.level === 'District' ? '\u00A0\u00A0' : ''}
                    {a.name} ({a.level})
                  </option>
              )}
              </select>
            </FormField>
            <FormField label="Name" htmlFor="ga-name" required>
              <input id="ga-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Savar" />
            </FormField>
            <FormField label="Name in Bangla" htmlFor="ga-namebn">
              <input id="ga-namebn" lang="bn" className={inputClass} value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="যেমন: সাভার" />
            </FormField>
            <FormField label="Geo code" htmlFor="ga-code" required>
              <input id="ga-code" inputMode="numeric" className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 302672" />
            </FormField>
            <button type="submit" className={primaryBtn}>Add area</button>
          </form>
        </AdminPanel>
      }
    </div>);

}