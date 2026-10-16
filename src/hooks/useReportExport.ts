import { useCallback } from 'react';
import { toast } from 'sonner';
import { branches } from '../data/branches';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { downloadCsv, sectionsToCsv } from '../utils/reports/export';
import { formatDhaka, demoNow } from '../utils/format';
import type { ReportFilters, ReportSection } from '../types/reports';

export function filterMeta(f: ReportFilters, userName: string, roleLabel: string, names: (id: string) => string): string[] {
  const parts = [
  `Prepared for ${userName} (${roleLabel}) on ${formatDhaka(demoNow().toISOString())}`,
  `Period ${f.from} to ${f.to}`,
  `Branch: ${f.branchId === 'all' ? 'All in scope' : branches.find((b) => b.id === f.branchId)?.name ?? f.branchId}`];

  if (f.division) parts.push(`Division: ${names(f.division)}`);
  if (f.district) parts.push(`District: ${names(f.district)}`);
  if (f.zoneId) parts.push(`Zone: ${names(f.zoneId)}`);
  if (f.category) parts.push(`Category: ${f.category}`);
  if (f.ownerId) parts.push(`Owner: ${names(f.ownerId)}`);
  parts.push('Fields hidden for this role are excluded. Demo data — not for statutory use.');
  return parts;
}

/** Exports what the current user can see. A success message appears only after the file is actually created. */
export function useReportExport() {
  const { db } = useData();
  const { user, role } = useSession();
  const names = useCallback(
    (id: string) => db.adminAreas.find((a) => a.id === id)?.name ?? db.operationalZones.find((z) => z.id === id)?.name ?? db.users.find((u) => u.id === id)?.name ?? id,
    [db]
  );
  const blocked = role.permissions.includes('exportReports') ? undefined : 'Your role cannot export reports.';
  const meta = (f: ReportFilters) => filterMeta(f, user.name, role.label, names);

  const exportCsv = (name: string, sections: ReportSection[], f: ReportFilters) => {
    if (blocked) {
      toast.error(blocked);
      return;
    }
    const withRows = sections.filter((s) => s.rows.length || s.kpis.length);
    if (!withRows.length) {
      toast.error('Nothing to export for these filters. No file was created.');
      return;
    }
    const file = `${name}-${f.from}-to-${f.to}.csv`;
    const res = downloadCsv(file, sectionsToCsv(withRows, meta(f)));
    if (res.ok) toast.success(`Downloaded ${res.fileName}`, { description: 'Opens in Excel. Only fields your role can see are included.' });else
    toast.error(`Export failed: ${res.reason} No file was created.`);
  };

  return { exportCsv, blocked, meta };
}