import { format, differenceInDays, isAfter, startOfDay } from 'date-fns';

/**
 * Format a date string (YYYY-MM-DD) to a readable format
 */
export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Calculate days until a date (can be negative if past)
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const today = startOfDay(new Date());
    return differenceInDays(date, today);
  } catch {
    return null;
  }
}

/**
 * Check if a date is due soon (within 7 days)
 */
export function isDueSoon(dateStr: string | null | undefined): boolean {
  const days = daysUntil(dateStr);
  if (days === null) return false;
  return days >= 0 && days <= 7;
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateStr: string | null | undefined): boolean {
  const days = daysUntil(dateStr);
  if (days === null) return false;
  return days < 0;
}

/**
 * Format relative date string (e.g., "Due in 3 days", "Overdue by 2 days")
 */
export function fmtRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const days = daysUntil(dateStr);
  if (days === null) return fmtDate(dateStr);

  if (days < 0) {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
  }
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }
  if (days <= 7) {
    return `Due in ${days} days`;
  }
  return fmtDate(dateStr);
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "Yesterday")
 */
export function fmtRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return format(date, 'MMM d, yyyy');
  } catch {
    return timestamp;
  }
}

