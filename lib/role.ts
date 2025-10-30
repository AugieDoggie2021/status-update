/**
 * Role types for program memberships
 */
export type Role = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

/**
 * Check if a role allows write operations
 */
export function canWrite(role: Role | null): boolean {
  return role === 'OWNER' || role === 'CONTRIBUTOR';
}

/**
 * Check if a role allows admin operations (membership management)
 */
export function canManageMembers(role: Role | null): boolean {
  return role === 'OWNER';
}

