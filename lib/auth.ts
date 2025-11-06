import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from './supabase';
import { cookies } from 'next/headers';

// Impersonation cookie names
const IMPERSONATION_COOKIE = 'impersonate_role';
const IMPERSONATION_PROGRAM_COOKIE = 'impersonate_program_id';

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
 * Get impersonated role from cookie (if any)
 * Returns null if not impersonating
 */
async function getImpersonatedRole(programId: string): Promise<'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  try {
    const cookieStore = await cookies();
    const impersonateProgramId = cookieStore.get(IMPERSONATION_PROGRAM_COOKIE)?.value;
    const impersonateRole = cookieStore.get(IMPERSONATION_COOKIE)?.value;

    // Only return impersonated role if it's for the current program
    if (impersonateProgramId === programId && impersonateRole) {
      const role = impersonateRole.toUpperCase();
      if (role === 'OWNER' || role === 'CONTRIBUTOR' || role === 'VIEWER') {
        return role as 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
      }
    }
    return null;
  } catch (error) {
    // Cookie access might fail in some contexts, ignore
    return null;
  }
}

/**
 * Get user's role for a specific program
 * Returns null if user is not a member
 * Checks impersonation first if enabled
 */
export async function getRole(programId: string): Promise<'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  // Check for impersonation first
  const impersonatedRole = await getImpersonatedRole(programId);
  if (impersonatedRole) {
    console.log(`[getRole] Impersonating as ${impersonatedRole} for program ${programId}`);
    return impersonatedRole;
  }

  // Normal role lookup
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

/**
 * Check if user is currently impersonating
 */
export async function isImpersonating(programId: string): Promise<boolean> {
  const role = await getImpersonatedRole(programId);
  return role !== null;
}

/**
 * Get the user's real role (ignoring impersonation)
 * Used to verify user is OWNER before allowing impersonation
 */
export async function getRealRole(programId: string): Promise<'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  const session = await getServerSession();
  if (!session) {
    return null;
  }

  const supabase = getAdminClient();
  const { data } = await supabase
    .from('program_memberships')
    .select('role')
    .eq('program_id', programId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  return data?.role as 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null;
}

