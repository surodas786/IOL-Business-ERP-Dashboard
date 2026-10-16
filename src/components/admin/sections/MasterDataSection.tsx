import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useRunAction } from '../../../hooks/useRunAction';
import { StatusBadge } from '../../records/StatusBadge';
import { AdminPanel, linkBtn, primaryBtn, tdClass, thClass } from '../AdminPanel';
import { inputClass } from '../FormField';

export function MasterDataSection({ canEdit }: {canEdit: boolean;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const categories = Array.from(new Set(db.masterData.map((m) => m.category)));
  const [category, setCategory] = useState(categories[0]);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [labelBn, setLabelBn] = useState('');
  const items = db.masterData.filter((m) => m.category === category);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (runAction({ type: 'ADMIN_ADD_MASTER_ITEM', category, code, label, labelBn })) {
      setCode('');
      setLabel('');
      setLabelBn('');
    }
  };

  return (
    <AdminPanel title="Master data" description="Shared pick-lists used across modules. Retiring a value hides it from new entries; existing records keep it.">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2.5" role="tablist" aria-label="Categories">
        {categories.map((c) =>
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={c === category}
          onClick={() => setCategory(c)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${
          c === category ? 'bg-navy text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`
          }>
          
            {c} <span className="opacity-70">{db.masterData.filter((m) => m.category === c).length}</span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className={thClass}>Code</th>
              <th className={thClass}>English</th>
              <th className={thClass}>বাংলা</th>
              <th className={thClass}>Status</th>
              {canEdit && <th className={thClass}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((m) =>
            <tr key={m.id}>
                <td className={`${tdClass} font-mono text-[11px]`}>{m.code}</td>
                <td className={`${tdClass} font-semibold text-slate-900`}>{m.label}</td>
                <td className={tdClass} lang="bn">{m.labelBn || '—'}</td>
                <td className={tdClass}><StatusBadge status={m.active ? 'Active' : 'Retired'} /></td>
                {canEdit &&
              <td className={`${tdClass} text-right`}>
                    <button type="button" className={linkBtn} onClick={() => runAction({ type: 'ADMIN_TOGGLE_MASTER_ITEM', id: m.id })}>
                      {m.active ? 'Retire' : 'Activate'}
                    </button>
                  </td>
              }
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canEdit &&
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <input aria-label="Code" className={`${inputClass} h-8 w-28`} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <input aria-label="English label" className={`${inputClass} h-8 w-56`} placeholder="English label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input aria-label="Bangla label" lang="bn" className={`${inputClass} h-8 w-48`} placeholder="বাংলা লেবেল" value={labelBn} onChange={(e) => setLabelBn(e.target.value)} />
          <button type="submit" className={primaryBtn}>Add to {category}</button>
        </form>
      }
    </AdminPanel>);

}