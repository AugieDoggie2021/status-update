import { getServerSession } from './auth';
import { getAdminClient } from './supabase';
import { getProgramId } from './get-program-id';

/**
 * Role type mapping:
 * - Admin -> OWNER (full access + membership management)
 * - Editor -> CONTRIBUTOR (read + write access)
 * - Viewer -> VIEWER (read-only)
 */
export type Role = 'Admin' | 'Editor' | 'Viewer';

/**
 * Database role enum (as stored in Supabase)
 */
export type DbRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

/**
 * Map Role to DbRole
 */
export function roleToDbRole(role: Role): DbRole {
  switch (role) {
    case 'Admin':
      return 'OWNER';
    case 'Editor':
      return 'CONTRIBUTOR';
    case 'Viewer':
      return 'VIEWER';
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

/**
 * Map DbRole to Role
 */
export function dbRoleToRole(dbRole: DbRole): Role {
  switch (dbRole) {
    case 'OWNER':
      return 'Admin';
    case 'CONTRIBUTOR':
      return 'Editor';
    case 'VIEWER':
      return 'Viewer';
    default:
      throw new Error(`Unknown dbRole: ${dbRole}`);
  }
}

/**
 * Normalize email to lowercase for consistent comparison
 * Handles Google aliases and case-insensitive matching
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Get user's role for a specific program
 * Returns null if user is not a member
 */
export async function getUserRole(programId: string, userId: string): Promise<Role | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('program_memberships')
    .select('role')
    .eq('program_id', programId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`[getUserRole] Database error for programId ${programId}, user ${userId}:`, error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return dbRoleToRole(data.role as DbRole);
}

/**
 * Require user to have a minimum role for a program
 * Throws error with {code, message} if not authorized
 */
export async function requireRole(programId: string, min: Role): Promise<Role> {
  const session = await getServerSession();
  if (!session || !session.user) {
    throw { code: 'UNAUTHORIZED', message: 'Authentication required' };
  }

  const userRole = await getUserRole(programId, session.user.id);
  
  if (!userRole) {
    throw { code: 'FORBIDDEN', message: 'Not a member of this program' };
  }

  // Role hierarchy: Admin > Editor > Viewer
  const roleHierarchy: Record<Role, number> = {
    Admin: 3,
    Editor: 2,
    Viewer: 1,
  };

  const userLevel = roleHierarchy[userRole];
  const minLevel = roleHierarchy[min];

  if (userLevel < minLevel) {
    throw { 
      code: 'FORBIDDEN', 
      message: `Requires ${min} role or higher. Current role: ${userRole}` 
    };
  }

  return userRole;
}

/**
 * Get default program ID from environment
 */
export function getDefaultProgramId(): string {
  return getProgramId();
}

/**
 * Ensure user has Admin (OWNER) role for default program
 * Used by bootstrap logic
 */
export async function ensureAdminMembership(email: string, userId: string, programId: string): Promise<void> {
  const supabase = getAdminClient();
  const normalizedEmail = normalizeEmail(email);

  // Upsert membership with OWNER role
  const { error } = await supabase
    .from('program_memberships')
    .upsert(
      {
        program_id: programId,
        user_id: userId,
        role: 'OWNER',
      },
      {
        onConflict: 'program_id,user_id',
      }
    );

  if (error) {
    console.error(`[ensureAdminMembership] Error upserting membership for ${normalizedEmail}:`, error);
    throw error;
  }

  console.log(`[ensureAdminMembership] Ensured OWNER role for ${normalizedEmail} on program ${programId}`);
}

