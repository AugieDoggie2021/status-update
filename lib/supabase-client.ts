import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './database.types';

/**
 * Client-side Supabase client for auth operations
 */
export function createClient() {
  return createClientComponentClient<Database>();
}

