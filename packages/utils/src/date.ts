// =============================================================================
// Date utilities
// =============================================================================

import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export function nowInTimezone(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

export function startOfDayInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  return fromZonedTime(startOfDay(zoned), timezone);
}

export function endOfDayInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  return fromZonedTime(endOfDay(zoned), timezone);
}

export function formatDate(date: Date, fmt = 'dd MMM yyyy'): string {
  return format(date, fmt);
}

export function formatDateTime(date: Date): string {
  return format(date, 'dd MMM yyyy, hh:mm a');
}

export function getDateRangeForPeriod(
  period: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days',
  timezone = 'Asia/Kolkata'
): { from: Date; to: Date } {
  const now = toZonedTime(new Date(), timezone);
  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last_7_days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last_30_days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}
