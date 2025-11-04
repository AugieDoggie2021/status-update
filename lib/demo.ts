/**
 * Demo Mode Utilities
 * Handles anonymization and demo mode features
 */

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/**
 * Anonymize email address for demo mode
 * Example: "user@example.com" -> "user+123@example.com"
 */
export function anonymizeEmail(email: string | null | undefined): string {
  if (!email || !DEMO_MODE) return email || '';
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  // Generate a consistent hash-like suffix based on email
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${localPart}+${hash % 1000}@example.com`;
}

/**
 * Anonymize name for demo mode
 * Example: "John Doe" -> "Demo User 1"
 */
export function anonymizeName(name: string | null | undefined, index: number = 0): string {
  if (!name || !DEMO_MODE) return name || 'Unknown';
  
  return `Demo User ${index + 1}`;
}

/**
 * Get demo program ID from environment or return null
 */
export function getDemoProgramId(): string | null {
  if (!DEMO_MODE) return null;
  return process.env.NEXT_PUBLIC_PROGRAM_ID || null;
}

/**
 * Check if a program should be pre-selected (demo mode)
 */
export function shouldPreSelectProgram(programId: string): boolean {
  if (!DEMO_MODE) return false;
  const demoProgramId = getDemoProgramId();
  return demoProgramId === programId;
}

/**
 * Format text with "Demo" label if in demo mode
 */
export function withDemoLabel(text: string): string {
  if (!DEMO_MODE) return text;
  return `${text} [Demo]`;
}
