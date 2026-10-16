import { formatBDT, formatDhakaDate } from '../format';
import type { CellKind, CellValue, ReportSection } from '../../types/reports';

export function formatCell(v: CellValue, kind: CellKind = 'text'): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') return kind === 'date' ? formatDhakaDate(v) : v;
  switch (kind) {
    case 'money':
      return formatBDT(v);
    case 'pct':
      return `${v}%`;
    case 'hours':
      return `${v} h`;
    case 'days':
      return `${v} d`;
    default:
      return v.toLocaleString('en-IN');
  }
}

const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

/** Raw values (numbers unformatted) so Excel can sum them. Only visible columns are included. */
export function sectionsToCsv(sections: ReportSection[], meta: string[]): string {
  const lines: string[] = meta.map((m) => esc(m));
  sections.forEach((s) => {
    lines.push('', esc(s.title));
    s.kpis.forEach((k) => lines.push([esc(k.label), k.value === null ? '' : String(k.value), k.kind === 'money' ? 'BDT' : k.kind === 'pct' ? '%' : ''].join(',')));
    if (s.columns.length) {
      lines.push(s.columns.map((c) => esc(c.kind === 'money' ? `${c.label} (BDT)` : c.label)).join(','));
      s.rows.forEach((r) => lines.push(s.columns.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined) return '';
        return typeof v === 'number' ? String(v) : esc(c.kind === 'date' ? v.slice(0, 10) : v);
      }).join(',')));
    }
  });
  return lines.join('\r\n');
}

export type ExportResult = {ok: true;fileName: string;} | {ok: false;reason: string;};

/** Creates and downloads the file. Returns ok only if the browser accepted the download. */
export function downloadCsv(fileName: string, csv: string): ExportResult {
  try {
    if (typeof Blob === 'undefined' || typeof URL.createObjectURL !== 'function') return { ok: false, reason: 'This browser cannot create downloads.' };
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    if (!blob.size) return { ok: false, reason: 'The file was empty.' };
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, fileName };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'The download could not be created.' };
  }
}