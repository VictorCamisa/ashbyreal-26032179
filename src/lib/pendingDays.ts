import { differenceInCalendarDays, startOfDay } from 'date-fns';

export function getPendingDays(since?: string | null): number {
  if (!since) return 0;
  const parsed = new Date(since);
  if (Number.isNaN(parsed.getTime())) return 0;

  return Math.max(
    0,
    differenceInCalendarDays(startOfDay(new Date()), startOfDay(parsed)),
  );
}

export function getPendingLabel(since?: string | null): string {
  const days = getPendingDays(since);
  if (days === 0) return 'Pendente hoje';
  return `Pendente há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}
