import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from './supabase';

/**
 * Get the current authenticated user session (server-side)
 * Uses the SSR client which properly handles cookies
 */
export async function getServerSession() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[getServerSession] Error getting user:', error.message);
      return null;
    }
    
    if (!user) {
      console.warn('[getServerSession] No user found');
      return null;
    }

    return { user };
  } catch (error) {
    console.error('[getServerSession] Exception:', error);
    return null;
  }
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
    console.warn(`[getRole] No session for programId: ${programId}`);
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('program_memberships')
    .select('role')
    .eq('program_id', programId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error(`[getRole] Database error for programId ${programId}, user ${session.user.id}:`, error.message);
    return null;
  }

  if (!data) {
    console.warn(`[getRole] No membership found for programId: ${programId}, user: ${session.user.id}`);
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

