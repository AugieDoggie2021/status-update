/**
 * Get the program ID from environment variables
 * Used for determining the active program context
 */
export function getProgramId(): string {
  const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!programId) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID is not set');
  }
  return programId;
}

