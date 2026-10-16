import React from 'react';
import { LockIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { useSession } from '../../contexts/SessionContext';
import type { BranchId } from '../../types/erp';

export function LocationFilters({ className = '' }: {className?: string;}) {
  const { branchFilter, setBranchFilter, zoneFilter, setZoneFilter, canChangeBranch, user } = useSession();
  const selectedBranch = branches.find((b) => b.id === branchFilter);
  const lockedTitle = canChangeBranch ? undefined : `This account is limited to ${selectedBranch?.name ?? 'its branch'}`;

  return (
    <div className={`items-center gap-2 ${className}`}>
      <label
        title={lockedTitle}
        className={`flex h-[30px] items-center gap-1.5 rounded-md border border-slate-200 pl-2 pr-1 text-[12px] ${
        canChangeBranch ? 'bg-white' : 'bg-slate-50'}`
        }>
        
        <span className="text-[10.5px] uppercase tracking-wide text-slate-400">Branch</span>
        {!canChangeBranch && <LockIcon className="h-3 w-3 text-slate-400" aria-hidden />}
        <select
          value={branchFilter}
          disabled={!canChangeBranch}
          onChange={(e) => setBranchFilter(e.target.value as BranchId | 'all')}
          className="cursor-pointer bg-transparent pr-1 text-slate-700 outline-none disabled:cursor-not-allowed"
          aria-label="Branch filter">
          
          {canChangeBranch && <option value="all">All branches</option>}
          {branches.
          filter((b) => canChangeBranch || b.id === user.branch).
          map((b) =>
          <option key={b.id} value={b.id}>
                {b.name}
              </option>
          )}
        </select>
      </label>
      <label
        title={selectedBranch ? undefined : 'Choose a branch to filter by zone'}
        className={`flex h-[30px] items-center gap-1.5 rounded-md border border-slate-200 pl-2 pr-1 text-[12px] ${
        selectedBranch ? 'bg-white' : 'bg-slate-50'}`
        }>
        
        <span className="text-[10.5px] uppercase tracking-wide text-slate-400">Zone</span>
        <select
          value={zoneFilter}
          disabled={!selectedBranch}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="cursor-pointer bg-transparent pr-1 text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
          aria-label="Zone filter">
          
          <option value="all">All zones</option>
          {selectedBranch?.zones.map((z) =>
          <option key={z.id} value={z.id}>
              {z.name}
            </option>
          )}
        </select>
      </label>
    </div>);

}