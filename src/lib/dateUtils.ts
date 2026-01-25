import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formats a date to short month format: "Jan. 2026"
 * Use this for all month/year displays in the system
 */
export function formatMonthYear(date: Date): string {
  const month = format(date, 'MMM', { locale: ptBR });
  const year = format(date, 'yyyy');
  // Capitalize first letter and add period
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  // Ensure period is added (ptBR locale sometimes includes it, sometimes not)
  const monthWithPeriod = capitalizedMonth.endsWith('.') ? capitalizedMonth : capitalizedMonth + '.';
  return `${monthWithPeriod} ${year}`;
}

/**
 * Formats a date for display: "25 de Jan."
 */
export function formatDayMonth(date: Date): string {
  const day = format(date, 'd');
  const month = format(date, 'MMM', { locale: ptBR });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const monthWithPeriod = capitalizedMonth.endsWith('.') ? capitalizedMonth : capitalizedMonth + '.';
  return `${day} de ${monthWithPeriod}`;
}

/**
 * Formats a date with day and short month: "25 Jan."
 */
export function formatDayMonthShort(date: Date): string {
  const day = format(date, 'dd');
  const month = format(date, 'MMM', { locale: ptBR });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const monthWithPeriod = capitalizedMonth.endsWith('.') ? capitalizedMonth : capitalizedMonth + '.';
  return `${day} ${monthWithPeriod}`;
}

/**
 * Formats a date for display: "25 de Jan. de 2026"
 */
export function formatDateShort(date: Date): string {
  const day = format(date, 'd');
  const month = format(date, 'MMM', { locale: ptBR });
  const year = format(date, 'yyyy');
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const monthWithPeriod = capitalizedMonth.endsWith('.') ? capitalizedMonth : capitalizedMonth + '.';
  return `${day} de ${monthWithPeriod} de ${year}`;
}

/**
 * Formats a competencia string (yyyy-MM) to "Jan. 2026"
 */
export function formatCompetencia(competencia: string): string {
  try {
    const date = new Date(`${competencia}-15`);
    return formatMonthYear(date);
  } catch {
    return competencia;
  }
}
