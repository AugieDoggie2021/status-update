#!/usr/bin/env node

/**
 * Smoke tests for Advisory Status Tracker API endpoints
 * Usage: npm run smoke:local
 * Requires: NEXT_PUBLIC_BASE_URL and NEXT_PUBLIC_PROGRAM_ID in .env.local
 */

// Load .env.local if available
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const programId = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

if (!programId) {
  console.error('❌ FAIL: NEXT_PUBLIC_PROGRAM_ID is not set');
  console.error('Please set NEXT_PUBLIC_PROGRAM_ID in .env.local');
  process.exit(1);
}

const testNotes = `Data Ingest slipped 2 days; now 70%. New target Fri.
Modeling on track at 45%. Next milestone dimension conformance next Wed.
QA blocker—need mock data by Mon (Jo).
Add MEDIUM risk on vendor API throughput.`;

async function testParse() {
  try {
    const res = await fetch(`${baseUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: testNotes }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.workstreams || !data.risks || !data.actions) {
      throw new Error('Invalid response structure');
    }

    console.log('✅ PASS: /api/parse');
    return true;
  } catch (error) {
    console.error(`❌ FAIL: /api/parse - ${error.message}`);
    return false;
  }
}

async function testApplyUpdate() {
  try {
    const res = await fetch(`${baseUrl}/api/apply-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programId,
        notes: testNotes,
        appliedBy: 'Smoke Test',
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok || !data.parsed) {
      throw new Error('Invalid response structure');
    }

    console.log('✅ PASS: /api/apply-update');
    return true;
  } catch (error) {
    console.error(`❌ FAIL: /api/apply-update - ${error.message}`);
    return false;
  }
}

async function testExplainWeekly() {
  try {
    const res = await fetch(`${baseUrl}/api/explain-weekly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok || !data.text || typeof data.text !== 'string') {
      throw new Error('Invalid response structure');
    }

    if (data.text.length < 50) {
      throw new Error('Summary too short');
    }

    console.log('✅ PASS: /api/explain-weekly');
    return true;
  } catch (error) {
    console.error(`❌ FAIL: /api/explain-weekly - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`\n🧪 Running smoke tests against ${baseUrl}`);
  console.log(`📋 Program ID: ${programId.substring(0, 8)}...\n`);

  const results = await Promise.all([
    testParse(),
    testApplyUpdate(),
    testExplainWeekly(),
  ]);

  const allPassed = results.every((r) => r === true);

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All smoke tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some smoke tests failed');
    process.exit(1);
  }
}

runTests();
