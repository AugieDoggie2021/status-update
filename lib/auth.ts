import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAdminClient } from './supabase';

/**
 * Get the current authenticated user session (server-side)
 */
export async function getServerSession() {
  const cookieStore = await cookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            const cookie = cookieStore.get(key);
            return cookie?.value ?? null;
          },
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
          },
          removeItem: (key: string) => {
            cookieStore.delete(key);
          },
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return { user };
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/**
 * Get user's role for a specific program
 * Returns null if user is not a member
 */
export async function getRole(programId: string): Promise<'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  const session = await getServerSession();
  if (!session) {
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('program_memberships')
    .select('role')
    .eq('program_id', programId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
}

/**
 * Check if user has one of the allowed roles for a program
 * Throws if not authorized
 */
export async function requireRole(
  programId: string,
  allowedRoles: Array<'OWNER' | 'CONTRIBUTOR' | 'VIEWER'>
): Promise<'OWNER' | 'CONTRIBUTOR' | 'VIEWER'> {
  const session = await requireAuth();
  const role = await getRole(programId);

  if (!role || !allowedRoles.includes(role)) {
    throw new Error('FORBIDDEN');
  }

  return role;
}

/**
 * Check if user is a member of a program (any role)
 */
export async function requireMembership(programId: string): Promise<void> {
  const role = await getRole(programId);
  if (!role) {
    throw new Error('FORBIDDEN');
  }
}

