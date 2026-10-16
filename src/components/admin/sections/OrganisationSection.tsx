import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn } from '../AdminPanel';
import { inputClass } from '../FormField';
import type { OrgNode } from '../../../types/admin';

export function OrganisationSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [levels, setLevels] = useState<string[]>(db.orgLevels);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');

  const levelsDirty = levels.join('|') !== db.orgLevels.join('|');
  const children = (id: string | null) => db.orgNodes.filter((n) => n.parentId === id);
  const people = (id: string) => db.users.filter((u) => u.departmentId === id && u.status === 'Active').length;

  const startAdd = (id: string) => {
    setAddingTo(id);
    setRenaming(null);
    setName('');
    setNameBn('');
  };

  const saveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (addingTo && runAction({ type: 'ADMIN_ADD_ORG_NODE', parentId: addingTo, name, nameBn })) setAddingTo(null);
  };

  const saveRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (runAction({ type: 'ADMIN_RENAME_ORG_NODE', id, name })) setRenaming(null);
  };

  const renderNode = (n: OrgNode): React.ReactNode => {
    const kids = children(n.id);
    const canAddChild = n.level + 1 < db.orgLevels.length;
    return (
      <li key={n.id}>
        <div className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 py-2 pr-4" style={{ paddingLeft: 16 + n.level * 22 }}>
          {renaming === n.id ?
          <form onSubmit={(e) => saveRename(e, n.id)} className="flex items-center gap-2">
              <input aria-label="New name" autoFocus className={`${inputClass} h-8 w-56`} value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className={primaryBtn}>Save</button>
              <button type="button" className={secondaryBtn} onClick={() => setRenaming(null)}>Cancel</button>
            </form> :

          <span className="text-[12.5px] font-semibold text-slate-900">
              {n.name}
              {n.nameBn && <span lang="bn" className="ml-1.5 font-normal text-slate-500">{n.nameBn}</span>}
            </span>
          }
          <span className="rounded bg-slate-100 px-1.5 py-px text-[10.5px] text-slate-600">{db.orgLevels[n.level] ?? `Level ${n.level + 1}`}</span>
          {people(n.id) > 0 && <span className="text-[11px] text-slate-500">{people(n.id)} user{people(n.id) === 1 ? '' : 's'}</span>}
          {canEdit && renaming !== n.id &&
          <span className="ml-auto flex gap-3">
              {canAddChild &&
            <button type="button" className={linkBtn} onClick={() => startAdd(n.id)}>
                  Add {db.orgLevels[n.level + 1]?.toLowerCase()}
                </button>
            }
              <button type="button" className={linkBtn} onClick={() => {setRenaming(n.id);setAddingTo(null);setName(n.name);}}>
                Rename
              </button>
              {n.parentId &&
            <button type="button" className={linkBtn} onClick={() => runAction({ type: 'ADMIN_DELETE_ORG_NODE', id: n.id })}>
                  Remove
                </button>
            }
            </span>
          }
        </div>
        {addingTo === n.id &&
        <form onSubmit={saveAdd} className="flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 bg-slate-50 py-2.5 pr-4" style={{ paddingLeft: 16 + (n.level + 1) * 22 }}>
            <input aria-label={`New ${db.orgLevels[n.level + 1]} name`} autoFocus className={`${inputClass} h-8 w-52`} placeholder={`${db.orgLevels[n.level + 1]} name`} value={name} onChange={(e) => setName(e.target.value)} />
            <input aria-label="Name in Bangla" lang="bn" className={`${inputClass} h-8 w-44`} placeholder="বাংলা নাম (ঐচ্ছিক)" value={nameBn} onChange={(e) => setNameBn(e.target.value)} />
            <button type="submit" className={primaryBtn}>Add</button>
            <button type="button" className={secondaryBtn} onClick={() => setAddingTo(null)}>Cancel</button>
          </form>
        }
        {kids.length > 0 && <ul>{kids.map(renderNode)}</ul>}
      </li>);

  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <AdminPanel title="Organisation tree" description={`${db.orgNodes.length} units across ${db.orgLevels.length} levels. Units are independent of branches — a department can have people in any station.`}>
        <ul className="pb-1">{children(null).map(renderNode)}</ul>
      </AdminPanel>

      <AdminPanel title="Hierarchy levels" description="Name each level and set how deep the tree may go (2–6 levels).">
        <ol className="space-y-2 px-4 py-4">
          {levels.map((l, i) =>
          <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-[11px] text-slate-400">{i + 1}</span>
              <input
              aria-label={`Level ${i + 1} name`}
              className={`${inputClass} h-8`}
              value={l}
              disabled={!canEdit}
              onChange={(e) => setLevels(levels.map((x, j) => j === i ? e.target.value : x))} />
            
            </li>
          )}
        </ol>
        {canEdit &&
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
            <button type="button" className={secondaryBtn} disabled={levels.length >= 6} onClick={() => setLevels([...levels, ''])}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add level
            </button>
            <button type="button" className={secondaryBtn} disabled={levels.length <= 2} onClick={() => setLevels(levels.slice(0, -1))}>
              Remove last
            </button>
            <button type="button" className={primaryBtn} disabled={!levelsDirty} onClick={() => runAction({ type: 'ADMIN_SET_ORG_LEVELS', levels })}>
              Save levels
            </button>
          </div>
        }
      </AdminPanel>
    </div>);

}