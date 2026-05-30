import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

export type DateBrFormat =
  | 'datetime'
  | 'datetime-s'
  | 'short'
  | 'date'
  | 'date-short'
  | 'time'
  | 'time-short'
  | 'relative';

const FORMAT_MAP: Record<Exclude<DateBrFormat, 'relative'>, string> = {
  'datetime':    'dd/MM/yyyy HH:mm',
  'datetime-s':  'dd/MM/yy HH:mm:ss',
  'short':       'dd/MM/yy HH:mm',
  'date':        'dd/MM/yyyy',
  'date-short':  'dd/MM',
  'time':        'HH:mm:ss',
  'time-short':  'HH:mm',
};

@Pipe({ name: 'dateBr' })
export class DateBrPipe implements PipeTransform {

  private readonly dp = new DatePipe('pt-BR');

  transform(value: string | Date | null | undefined, format: DateBrFormat = 'datetime'): string {
    if (value == null || value === '') return '—';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return '—';

      if (format === 'relative') return this.relative(d);
      return this.dp.transform(d, FORMAT_MAP[format]) ?? '—';
    } catch {
      return String(value);
    }
  }

  private relative(d: Date): string {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)   return `${Math.round(diff)}s atrás`;
    if (diff < 3600) return `${Math.round(diff / 60)}min atrás`;
    return `${Math.round(diff / 3600)}h atrás`;
  }
}
