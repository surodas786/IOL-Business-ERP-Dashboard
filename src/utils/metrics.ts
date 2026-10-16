import { branches, zoneBaselines } from '../data/branches';
import type { BranchId, MetricKey, ZoneMetrics } from '../types/erp';
import type { DemoDatabase } from '../types/records';
import type { WorkItem } from './workItems';
import { invoiceNet } from './relations';
import { isPipeline } from './crmRules';

export interface MetricColumn {
  key: MetricKey;
  label: string;
  barClass: string;
  swatchClass: string;
  format: 'bdt' | 'count';
}

export const METRIC_COLUMNS: Record<MetricKey, MetricColumn> = {
  mrc: { key: 'mrc', label: 'Contracted MRC', barClass: 'bg-metric-mrc', swatchClass: 'bg-metric-mrc', format: 'bdt' },
  billed: { key: 'billed', label: 'Billed Revenue', barClass: 'bg-metric-billed', swatchClass: 'bg-metric-billed', format: 'bdt' },
  collected: { key: 'collected', label: 'Verified Collections', barClass: 'bg-metric-collected', swatchClass: 'bg-metric-collected', format: 'bdt' },
  pipeline: { key: 'pipeline', label: 'Pipeline Value', barClass: 'bg-metric-pipeline', swatchClass: 'bg-metric-pipeline', format: 'bdt' },
  activeLinks: { key: 'activeLinks', label: 'Active Connections', barClass: 'bg-metric-billed', swatchClass: 'bg-metric-billed', format: 'count' },
  installsOpen: { key: 'installsOpen', label: 'Open Installations', barClass: 'bg-metric-pipeline', swatchClass: 'bg-metric-pipeline', format: 'count' },
  ticketsOpen: { key: 'ticketsOpen', label: 'Open Tickets', barClass: 'bg-metric-mrc', swatchClass: 'bg-metric-mrc', format: 'count' }
};

export interface ComparisonRow {
  id: string;
  label: string;
  color: string;
  values: Record<MetricKey, number>;
  openTasks: number;
}

const METRIC_KEYS = Object.keys(METRIC_COLUMNS) as MetricKey[];
const PERIOD = 'Oct 2026';

/** Portfolio baselines plus the live shared demo records, per zone. */
export function liveZoneMetrics(db: DemoDatabase, items: WorkItem[]): ZoneMetrics[] {
  return zoneBaselines.map((z) => {
    const inZone = (r: {zoneId?: string;}) => r.zoneId === z.zoneId;
    const active = db.connections.filter((c) => inZone(c) && c.status === 'Active');
    return {
      ...z,
      mrc: z.mrc + active.reduce((s, c) => s + c.mrc, 0),
      billed: z.billed + db.invoices.filter((i) => inZone(i) && i.period === PERIOD).reduce((s, i) => s + invoiceNet(i), 0),
      collected:
      z.collected +
      db.receipts.filter((r) => inZone(r) && r.status === 'Verified' && r.receivedAt.startsWith('2026-10')).reduce((s, r) => s + r.amount, 0),
      pipeline:
      z.pipeline +
      db.opportunities.filter((o) => inZone(o) && isPipeline(db, o)).reduce((s, o) => s + o.expectedMrc * 12, 0),
      activeLinks: z.activeLinks + active.length,
      installsOpen: z.installsOpen + db.installationJobs.filter((j) => inZone(j) && j.status !== 'Closed' && j.status !== 'Cancelled').length,
      ticketsOpen: z.ticketsOpen + db.tickets.filter((t) => inZone(t) && t.status !== 'Resolved' && t.status !== 'Closed').length,
      openTasks: items.filter(inZone).length
    };
  });
}

function aggregate(id: string, label: string, color: string, source: ZoneMetrics[]): ComparisonRow {
  const values = {} as Record<MetricKey, number>;
  METRIC_KEYS.forEach((k) => {
    values[k] = source.reduce((acc, r) => acc + r[k], 0);
  });
  return { id, label, color, values, openTasks: source.reduce((acc, r) => acc + r.openTasks, 0) };
}

export function buildComparison(zones: ZoneMetrics[], branchFilter: BranchId | 'all', zoneFilter: string | 'all') {
  if (branchFilter === 'all') {
    const rows = branches.map((b) => aggregate(b.id, b.name, b.color, zones.filter((z) => z.branchId === b.id)));
    return { level: 'branch' as const, rows, total: aggregate('total', 'All branches', '', zones) };
  }
  const branch = branches.find((b) => b.id === branchFilter)!;
  const selected = branch.zones.filter((z) => zoneFilter === 'all' || z.id === zoneFilter);
  const rows = selected.map((z) => aggregate(z.id, z.name, branch.color, zones.filter((m) => m.zoneId === z.id)));
  const totalLabel = zoneFilter === 'all' ? `${branch.name} total` : `${selected[0]?.name ?? ''} total`;
  return {
    level: 'zone' as const,
    rows,
    total: aggregate('total', totalLabel, '', zones.filter((m) => selected.some((z) => z.id === m.zoneId)))
  };
}