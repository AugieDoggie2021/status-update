# Quick Setup Guide

## Step 1: Create .env.local

Create `.env.local` in the project root with the following content:

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL="https://zwavviilhiembxlnhwgs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YXZ2aWlsaGllbWJ4bG5od2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTE1ODcsImV4cCI6MjA3NzMyNzU4N30.MfcSZGOJpvxk2PU7uMCsQTdsoYS4qUJhk937UIZaPiA"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YXZ2aWlsaGllbWJ4bG5od2dzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MTU4NywiZXhwIjoyMDc3MzI3NTg3fQ.tiVLKvVYSpUaEZjocZz_xPepTjWvFjNHD-Zkk4YPh5o"

# --- OpenAI ---
# TODO: set your real key before parsing in prod
OPENAI_API_KEY="sk-REPLACE_ME"

# --- App ---
# This will be auto-set by the seeding script below:
NEXT_PUBLIC_PROGRAM_ID="TO_BE_FILLED_AUTOMATICALLY"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Step 2: Run Database Seed

First, ensure the database schema exists. Run `scripts/seed.sql` in Supabase SQL Editor if you haven't already.

## Step 3: Auto-Seed Program

Run the seeding script to create/find the program and automatically update `.env.local`:

```bash
npm run seed:program
```

This will:
- Find or create the "Regulatory Reporting Modernization (Q4)" program
- Print the Program ID
- Update `.env.local` with `NEXT_PUBLIC_PROGRAM_ID`

## Step 4: Start Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard` to see the app.

## Verification

After seeding, verify the program ID was set:

```bash
# Check .env.local contains a real UUID
grep NEXT_PUBLIC_PROGRAM_ID .env.local
```

You should see something like:
```
NEXT_PUBLIC_PROGRAM_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

