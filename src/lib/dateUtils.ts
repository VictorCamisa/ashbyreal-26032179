import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mapping for month abbreviations to ensure consistency
const MONTH_MAP: Record<string, string> = {
  'jan': 'Jan',
  'fev': 'Fev',
  'mar': 'Mar',
  'abr': 'Abr',
  'mai': 'Mai',
  'jun': 'Jun',
  'jul': 'Jul',
  'ago': 'Ago',
  'set': 'Set',
  'out': 'Out',
  'nov': 'Nov',
  'dez': 'Dez',
};

/**
 * Normalize month abbreviation to standard format
 */
function normalizeMonth(month: string): string {
  const cleaned = month.toLowerCase().replace('.', '');
  return MONTH_MAP[cleaned] || month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
}

/**
 * Formats a date to short month format: "Jan. 2026"
 * Use this for all month/year displays in the system
 */
export function formatMonthYear(date: Date): string {
  const month = format(date, 'MMM', { locale: ptBR });
  const year = format(date, 'yyyy');
  const normalizedMonth = normalizeMonth(month);
  return `${normalizedMonth}. ${year}`;
}

/**
 * Formats a date for short month with 2-digit year: "Jan. 26"
 * Use this for chart labels where space is limited
 */
export function formatMonthYearShort(date: Date): string {
  const month = format(date, 'MMM', { locale: ptBR });
  const year = format(date, 'yy');
  const normalizedMonth = normalizeMonth(month);
  return `${normalizedMonth}. ${year}`;
}

/**
 * Formats a date for display: "25 de Jan."
 */
export function formatDayMonth(date: Date): string {
  const day = format(date, 'd');
  const month = format(date, 'MMM', { locale: ptBR });
  const normalizedMonth = normalizeMonth(month);
  return `${day} de ${normalizedMonth}.`;
}

/**
 * Formats a date with day and short month: "25 Jan."
 */
export function formatDayMonthShort(date: Date): string {
  const day = format(date, 'dd');
  const month = format(date, 'MMM', { locale: ptBR });
  const normalizedMonth = normalizeMonth(month);
  return `${day} ${normalizedMonth}.`;
}

/**
 * Formats a date for display: "25 de Jan. de 2026"
 */
export function formatDateShort(date: Date): string {
  const day = format(date, 'd');
  const month = format(date, 'MMM', { locale: ptBR });
  const year = format(date, 'yyyy');
  const normalizedMonth = normalizeMonth(month);
  return `${day} de ${normalizedMonth}. de ${year}`;
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

/**
 * Formats a competencia string (yyyy-MM) to "Jan. 26" for charts
 */
export function formatCompetenciaShort(competencia: string): string {
  try {
    const date = new Date(`${competencia}-15`);
    return formatMonthYearShort(date);
  } catch {
    return competencia;
  }
}

/**
 * Returns just the normalized month name: "Jan"
 * For use in chart labels where only month is needed
 */
export function formatMonthOnly(date: Date): string {
  const month = format(date, 'MMM', { locale: ptBR });
  return normalizeMonth(month);
}
