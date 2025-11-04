/**
 * Date Helper Utilities
 * Functions for working with dates, especially week-based calculations
 */

/**
 * Get the ISO Monday date for a given date
 * Returns the Monday of the week containing the given date
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]!;
}

/**
 * Get the current week start (ISO Monday)
 */
export function getCurrentWeekStart(): string {
  return getWeekStart(new Date());
}

/**
 * Get the previous week start
 */
export function getPreviousWeekStart(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return getWeekStart(date);
}

/**
 * Get the next week start
 */
export function getNextWeekStart(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return getWeekStart(date);
}

/**
 * Check if a date string is a Monday (ISO week start)
 */
export function isWeekStart(dateString: string): boolean {
  const date = new Date(dateString);
  return date.getDay() === 1; // Monday
}

/**
 * Format date as relative string (e.g., "in 3 days", "2 weeks ago")
 */
export function formatRelativeWeek(weekStart: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = new Date(weekStart);
  week.setHours(0, 0, 0, 0);
  
  const diffTime = week.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'This week';
  if (diffDays === 7) return 'Next week';
  if (diffDays === -7) return 'Last week';
  if (diffDays > 0) {
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else {
    const weeks = Math.floor(Math.abs(diffDays) / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
}
