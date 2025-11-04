#!/usr/bin/env node

/**
 * Grant role script
 * 
 * Usage:
 *   npx tsx scripts/grant-role.ts --email "user@example.com" --program "default" --role Admin
 * 
 * Or use the npm script:
 *   npm run grant:role -- --email "user@example.com" --program "default" --role Admin
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getAdminClient } from '../lib/supabase';
import { normalizeEmail, roleToDbRole, getDefaultProgramId } from '../lib/authz';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface Args {
  email?: string;
  program?: string;
  role?: 'Admin' | 'Editor' | 'Viewer';
}

function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) {
      args.email = argv[++i];
    } else if (arg === '--program' && argv[i + 1]) {
      args.program = argv[++i];
    } else if (arg === '--role' && argv[i + 1]) {
      const role = argv[++i] as Args['role'];
      if (role === 'Admin' || role === 'Editor' || role === 'Viewer') {
        args.role = role;
      } else {
        console.error(`Invalid role: ${role}. Must be Admin, Editor, or Viewer`);
        process.exit(1);
      }
    }
  }

  return args;
}

async function main() {
  const { email, program, role } = parseArgs();

  if (!email) {
    console.error('Error: --email is required');
    console.error('Usage: npx tsx scripts/grant-role.ts --email "user@example.com" --program "default" --role Admin');
    process.exit(1);
  }

  if (!role) {
    console.error('Error: --role is required');
    console.error('Usage: npx tsx scripts/grant-role.ts --email "user@example.com" --program "default" --role Admin');
    process.exit(1);
  }

  const normalizedEmail = normalizeEmail(email);
  console.log(`Granting ${role} role to ${normalizedEmail}...`);

  // Resolve program ID
  let programId: string;
  if (program === 'default' || !program) {
    try {
      programId = getDefaultProgramId();
      console.log(`Using default program: ${programId}`);
    } catch (error) {
      console.error('Error: Could not get default program ID. Set NEXT_PUBLIC_PROGRAM_ID in .env.local');
      process.exit(1);
    }
  } else {
    programId = program;
    console.log(`Using program: ${programId}`);
  }

  // Get Supabase admin client
  let supabase;
  try {
    supabase = getAdminClient();
  } catch (error) {
    console.error('Error: Could not create Supabase client. Check SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Find user by email (case-insensitive)
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  const user = users?.users.find((u) => normalizeEmail(u.email) === normalizedEmail);

  if (!user) {
    console.error(`Error: User with email ${normalizedEmail} not found.`);
    console.error('The user must sign in at least once before you can grant them a role.');
    process.exit(1);
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // Convert role to DB role
  const dbRole = roleToDbRole(role);

  // Upsert membership
  const { data, error } = await supabase
    .from('program_memberships')
    .upsert(
      {
        program_id: programId,
        user_id: user.id,
        role: dbRole,
      },
      {
        onConflict: 'program_id,user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting membership:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully granted ${role} role to ${normalizedEmail} on program ${programId}`);
  console.log(`Membership ID: ${data.id}`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

