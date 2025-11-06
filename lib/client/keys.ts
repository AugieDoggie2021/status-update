/**
 * Canonical SWR keys and Next.js cache tags for program-scoped data
 */

export const WORKSTREAMS_KEY = (programId: string) =>
  `/api/workstreams?programId=${encodeURIComponent(programId)}`;

export const WORKSTREAMS_TAG = (programId: string) => `workstreams:${programId}`;

