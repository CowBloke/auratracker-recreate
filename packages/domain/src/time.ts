import { ECONOMY } from '@aura/contracts';

/**
 * The "day key" used for every daily cap/reset in the platform. Returns the
 * calendar date in the economy timezone (Europe/Paris) as `YYYY-MM-DD`, so a
 * user's day rolls over at Paris midnight regardless of server timezone.
 */
export function dayKey(date: Date = new Date(), timeZone: string = ECONOMY.DAY_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
