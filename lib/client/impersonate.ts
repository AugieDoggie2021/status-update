"use client";

import useSWR from 'swr';
import { mutate } from 'swr';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ImpersonationStatus = {
  isImpersonating: boolean;
  impersonatedRole: 'CONTRIBUTOR' | 'VIEWER' | null;
};

/**
 * Hook to check impersonation status
 */
export function useImpersonation(): ImpersonationStatus {
  const { data } = useSWR<{ ok: boolean; isImpersonating: boolean; impersonatedRole?: string }>(
    PROGRAM_ID ? `/api/impersonate?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  return {
    isImpersonating: data?.isImpersonating || false,
    impersonatedRole: (data?.impersonatedRole?.toUpperCase() as 'CONTRIBUTOR' | 'VIEWER') || null,
  };
}

/**
 * Start impersonating as a role
 */
export async function startImpersonating(role: 'CONTRIBUTOR' | 'VIEWER'): Promise<void> {
  const res = await fetch('/api/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programId: PROGRAM_ID,
      role,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to start impersonation');
  }

  // Invalidate role cache
  await mutate(`/api/role?programId=${PROGRAM_ID}`);
  await mutate(`/api/impersonate?programId=${PROGRAM_ID}`);
  
  // Refresh page to apply changes
  window.location.reload();
}

/**
 * Stop impersonating
 */
export async function stopImpersonating(): Promise<void> {
  const res = await fetch('/api/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programId: PROGRAM_ID,
      role: null, // Clear impersonation
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to stop impersonation');
  }

  // Invalidate role cache
  await mutate(`/api/role?programId=${PROGRAM_ID}`);
  await mutate(`/api/impersonate?programId=${PROGRAM_ID}`);
  
  // Refresh page to apply changes
  window.location.reload();
}

