import type { DemoDatabase } from '../types/records';
import type { RecurringPayment } from '../types/approvals';

export const periodOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const periodLabel = (p: string) => new Date(`${p}-01T00:00:00+06:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
export const nextPeriod = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
export const dueDateFor = (r: RecurringPayment, period: string) => `${period}-${String(r.dueDay).padStart(2, '0')}T10:00:00+06:00`;

export interface RecurringDue {
  rule: RecurringPayment;
  period: string;
  dueAt: string;
  daysLeft: number;
}

/** Recurring payments with no recorded payment for the current or next period. Reminders only — nothing is created automatically. */
export function recurringDue(db: DemoDatabase, now: Date): RecurringDue[] {
  const current = periodOf(now);
  const out: RecurringDue[] = [];
  db.recurringPayments.
  filter((r) => r.active).
  forEach((r) => {
    [current, nextPeriod(current)].forEach((period) => {
      if (period < r.startPeriod || r.endPeriod && period > r.endPeriod) return;
      if (db.opsExpenses.some((e) => e.recurringId === r.id && e.period === period && e.status !== 'Rejected')) return;
      const dueAt = dueDateFor(r, period);
      const daysLeft = Math.ceil((Date.parse(dueAt) - now.getTime()) / 86400000);
      if (daysLeft <= 20) out.push({ rule: r, period, dueAt, daysLeft });
    });
  });
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}