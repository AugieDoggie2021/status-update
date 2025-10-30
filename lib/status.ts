import type { Status, Workstream } from './types';

/**
 * Get the color class name for a status badge/pill
 */
export function getStatusColor(status: Status): string {
  switch (status) {
    case 'GREEN':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800';
    case 'YELLOW':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800';
    case 'RED':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get the dot color for a status indicator
 */
export function getStatusDotColor(status: Status): string {
  switch (status) {
    case 'GREEN':
      return 'bg-emerald-500';
    case 'YELLOW':
      return 'bg-amber-500';
    case 'RED':
      return 'bg-rose-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Calculate overall status from an array of workstreams
 * Rule: overall = RED>=2 ? RED : (RED>=1 || YELLOW>=2 ? YELLOW : GREEN)
 */
export function calculateOverallStatus(workstreams: Workstream[]): Status {
  if (workstreams.length === 0) return 'GREEN';

  const redCount = workstreams.filter((w) => w.status === 'RED').length;
  const yellowCount = workstreams.filter((w) => w.status === 'YELLOW').length;

  if (redCount >= 2) return 'RED';
  if (redCount >= 1 || yellowCount >= 2) return 'YELLOW';
  return 'GREEN';
}

/**
 * Calculate percentage of workstreams that are on track (GREEN)
 */
export function calculateOnTrackPercentage(workstreams: Workstream[]): number {
  if (workstreams.length === 0) return 0;
  const greenCount = workstreams.filter((w) => w.status === 'GREEN').length;
  return Math.round((greenCount / workstreams.length) * 100);
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (severity) {
    case 'LOW':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
    case 'HIGH':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get risk status badge color
 */
export function getRiskStatusColor(status: 'OPEN' | 'MITIGATED' | 'CLOSED'): string {
  switch (status) {
    case 'OPEN':
      return 'default';
    case 'MITIGATED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    case 'CLOSED':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
    default:
      return 'default';
  }
}

