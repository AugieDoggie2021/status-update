import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const result = config({ path: envPath, override: true });

if (result.error) {
  console.warn('Warning: Could not load .env.local:', result.error.message);
}

// Also load from process.env (may already be set)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  die('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
}

const supabase = createClient(url, serviceKey);
const PROGRAM_NAME = 'Regulatory Reporting Modernization (Q4)';

async function main() {
  // 1) Try to find existing program
  let { data: existing, error: selErr } = await supabase
    .from('programs')
    .select('id,name')
    .eq('name', PROGRAM_NAME)
    .maybeSingle();

  if (selErr) {
    console.error('Select error:', selErr);
  }

  let programId = existing?.id;

  if (!programId) {
    // 2) Insert if not found
    const { data: inserted, error: insErr } = await supabase
      .from('programs')
      .insert([
        {
          name: PROGRAM_NAME,
          sponsor: 'EVP, Ops',
          start_date: '2025-10-01',
          end_date: '2025-12-31',
        },
      ])
      .select('id')
      .single();

    if (insErr) {
      die(`Insert error: ${insErr.message}`);
    }

    programId = inserted.id;
    console.log('Created new program.');
  } else {
    console.log('Found existing program.');
  }

  console.log('Program ID:', programId);

  // 3) Update .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    die(`.env.local not found at ${envPath}`);
  }

  let env = fs.readFileSync(envPath, 'utf8');

  if (env.includes('NEXT_PUBLIC_PROGRAM_ID=')) {
    env = env.replace(/NEXT_PUBLIC_PROGRAM_ID=.*\n?/, `NEXT_PUBLIC_PROGRAM_ID="${programId}"\n`);
  } else {
    env += `\nNEXT_PUBLIC_PROGRAM_ID="${programId}"\n`;
  }

  fs.writeFileSync(envPath, env, 'utf8');
  console.log('Updated .env.local with NEXT_PUBLIC_PROGRAM_ID.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

