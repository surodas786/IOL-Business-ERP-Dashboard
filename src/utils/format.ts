export const DEMO_NOW = new Date('2026-10-15T10:42:00+06:00');
export const TZ_LABEL = 'BST (UTC+06)';

const CLOCK_KEY = 'iol-erp-demo-clock';
const MAX_DRIFT_MS = 8 * 60 * 60 * 1000;
const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function clockStart(): number {
  try {
    const stored = localStorage.getItem(CLOCK_KEY);
    if (stored) return Number(stored);
    const now = Date.now();
    localStorage.setItem(CLOCK_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/** Demo clock: starts at 15 Oct 2026, 10:42 AM Dhaka and advances with real time (capped to the same working day). */
export function demoNow(): Date {
  return new Date(DEMO_NOW.getTime() + Math.min(Date.now() - clockStart(), MAX_DRIFT_MS));
}

export function resetDemoClock() {
  try {
    localStorage.removeItem(CLOCK_KEY);
  } catch {

    /* storage unavailable */}
}

/** Calendar parts of a date in Asia/Dhaka. */
export function dhakaParts(input: string | Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(input));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

/** ISO timestamp for a Dhaka calendar day offset from the input, at a fixed local time. */
export function dhakaDayAt(input: string | Date, addDays: number, time = '10:00'): string {
  const { year, month, day } = dhakaParts(input);
  const d = new Date(Date.UTC(year, month - 1, day + addDays));
  const iso = d.toISOString().slice(0, 10);
  return `${iso}T${time}:00+06:00`;
}

/** Value for <input type="date"> or <input type="datetime-local"> in Dhaka time. */
export function dhakaInputValue(iso: string | undefined, withTime = false): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(iso));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return withTime ? `${date}T${p.hour === '24' ? '00' : p.hour}:${p.minute}` : date;
}

/** ISO timestamp (Asia/Dhaka) from a date or datetime-local input value. */
export function fromDhakaInput(value: string, defaultTime = '17:00'): string {
  if (!value) return '';
  return value.includes('T') ? `${value}:00+06:00` : `${value}T${defaultTime}:00+06:00`;
}

export function formatDhakaDate(input: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(input));
}

export function formatBDT(value: number): string {
  return `৳ ${numberFormat.format(value)}`;
}

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function formatDhaka(input: string | Date, options: {year?: boolean;} = {}): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).formatToParts(new Date(input));
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.day} ${p.month}${options.year ? ` ${p.year}` : ''}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

export function relativeAge(input: string | Date): string {
  const diffMs = DEMO_NOW.getTime() - new Date(input).getTime();
  const future = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  let label: string;
  if (minutes < 60) label = `${minutes} min`;else
  if (minutes < 60 * 24) label = `${Math.round(minutes / 60)} h`;else
  {
    const days = Math.round(minutes / (60 * 24));
    label = `${days} day${days === 1 ? '' : 's'}`;
  }
  return future ? `in ${label}` : `${label} ago`;
}