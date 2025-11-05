import type { ParsedUpdate } from '@/lib/types';

/**
 * Client-side API helpers for update operations
 */

export interface PreviewParseResult {
  parsed: ParsedUpdate;
  duration: number;
}

export interface ApplyUpdateResult {
  ok: boolean;
  parsed?: ParsedUpdate;
  overall?: 'GREEN' | 'YELLOW' | 'RED';
  error?: string;
}

/**
 * Preview parse notes without applying them
 */
export async function previewParse(notes: string): Promise<ParsedUpdate> {
  const startTime = performance.now();
  
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to parse notes');
  }

  const data = await res.json();
  const duration = performance.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.info(`[previewParse] Duration: ${duration.toFixed(2)}ms`);
  }

  return data;
}

/**
 * Apply an update to the database
 */
export async function applyUpdate(
  programId: string,
  notes: string,
  appliedBy?: string
): Promise<ApplyUpdateResult> {
  const startTime = performance.now();

  const res = await fetch('/api/apply-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId, notes, appliedBy }),
  });

  const duration = performance.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.info(`[applyUpdate] Duration: ${duration.toFixed(2)}ms`);
  }

  if (!res.ok) {
    const error = await res.json();
    
    // Handle RBAC errors specifically
    if (res.status === 403 || error.error?.includes('FORBIDDEN') || error.error?.includes('Viewer')) {
      throw new Error('You are signed in as Viewer. Ask an Owner or Contributor to apply updates.');
    }
    
    throw new Error(error.error || 'Failed to apply update');
  }

  const data = await res.json();
  return {
    ok: true,
    parsed: data.parsed,
    overall: data.overall,
  };
}

