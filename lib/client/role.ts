"use client";

import useSWR from 'swr';

type Role = "owner" | "contributor" | "viewer";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Hook to read the current user's role
 */
export function useRole(): Role {
  const { data } = useSWR<{ role?: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const role = data?.role;
  
  if (role === 'OWNER') return 'owner';
  if (role === 'CONTRIBUTOR') return 'contributor';
  return 'viewer';
}

