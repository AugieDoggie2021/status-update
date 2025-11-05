# Advisory Status Tracker

A production-quality web application for tracking advisory engagement status across workstreams, risks, and actions. Built with Next.js 15, Supabase, and OpenAI.

## Features

- **Dashboard**: Visual overview of workstreams with traffic-light status indicators
- **Natural Language Updates**: Paste status notes and let OpenAI parse them into structured data
- **Risks & Actions Tracking**: Comprehensive tracking of risks and action items
- **Weekly Reports**: AI-generated executive summaries
- **Real-time Updates**: SWR-powered data synchronization
- **Authentication & RBAC**: Supabase Auth with role-based access control (Owner, Contributor, Viewer)
- **Bold Visual Design**: Glassmorphism, gradients, animations, and modern UI with framer-motion

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, SWR
- **Backend**: Next.js API routes, Supabase (Postgres)
- **AI**: OpenAI Chat Completions API with JSON Schema response format
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Clone and Install

```bash
cd advisory-status-tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the schema from `scripts/seed.sql`
4. **Important**: After running the seed SQL, copy the returned `id` from the `INSERT INTO programs` statement
5. Note your Supabase URL, anon key, and service role key from Settings > API

### 2a. Enable Supabase Auth & Set Up Memberships

1. Go to **Authentication > Providers** in your Supabase dashboard
2. Enable **Email** provider (for magic links)
3. (Optional) Enable **Google** OAuth:
   - Configure OAuth credentials in Google Cloud Console
   - Add client ID and secret to Supabase Google provider settings
4. Run the RLS migration: `scripts/migrations/002_add_rls_and_memberships.sql`
5. Sign up/login via `/auth/sign-in` (magic link or Google)
6. Create your membership in Supabase SQL Editor:
   ```sql
   -- Replace with your program ID and user UUID from auth.users
   INSERT INTO program_memberships (program_id, user_id, role)
   VALUES ('YOUR-PROGRAM-ID', 'YOUR-USER-UUID', 'OWNER')
   ON CONFLICT (program_id, user_id) DO UPDATE SET role = 'OWNER';
   ```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory (copy from `.env.example` if it exists):

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL="https://YOURPROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="paste-anon-key-here"

# Service role key: USE ONLY IN SERVER ROUTES
SUPABASE_SERVICE_ROLE_KEY="paste-service-role-key-here"

# --- OpenAI ---
OPENAI_API_KEY="sk-..."

# --- App ---
NEXT_PUBLIC_PROGRAM_ID="00000000-0000-0000-0000-000000000000"  # Replace after seeding
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# --- Admin Bootstrap (Optional) ---
# Comma-separated list of emails that should automatically get Admin (OWNER) role
ADMIN_EMAILS="admin@example.com,waldopotter@gmail.com"

# --- Admin API Secret (Optional) ---
# For protecting admin endpoints (if you add custom admin API routes)
# ADMIN_API_SECRET="your-secret-key-here"
```

**Important:**
- **All Environment Variables**: Required for both local development and Vercel deployment
- **Security Note**: `SUPABASE_SERVICE_ROLE_KEY` is server-side only and never exposed to the client. It's only used in API route handlers (`app/api/**`).
- **Base URL**: In production, set `NEXT_PUBLIC_BASE_URL` to your Vercel deployment URL (e.g., `https://status-update-kfhy.vercel.app`)

Replace:
- `YOURPROJECT.supabase.co` with your Supabase project URL
- `paste-service-role-key-here` with your service role key (found in Supabase Settings > API)
- `sk-...` with your OpenAI API key
- `00000000-0000-0000-0000-000000000000` with the program ID returned from the seed SQL (see step 2 above)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** The app is already configured for Vercel deployment. Changes to the `main` branch automatically trigger deployments.

## Project Structure

```
advisory-status-tracker/
├── app/
│   ├── api/              # API route handlers
│   │   ├── parse/         # Parse natural language notes
│   │   ├── apply-update/  # Apply parsed updates to DB
│   │   ├── explain-weekly/# Generate weekly summary
│   │   ├── workstreams/   # CRUD for workstreams
│   │   ├── risks/          # CRUD for risks
│   │   ├── actions/       # CRUD for actions
│   │   └── diag/          # Diagnostics endpoints
│   ├── auth/              # Authentication pages
│   │   ├── sign-in/       # Sign-in page (Magic Link + Google)
│   │   └── callback/      # OAuth callback handler
│   ├── dashboard/         # Main dashboard page
│   ├── risks/             # Risks table page
│   ├── actions/          # Actions table page
│   ├── report/           # Weekly report page
│   ├── admin/            # Admin pages (Owner only)
│   └── healthz/          # Health check endpoint
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── nav.tsx            # Navigation with sign-out
│   ├── SignOutButton.tsx  # Sign-out button component
│   ├── RequireAuth.tsx    # Auth guard component
│   ├── kpis.tsx           # KPI dashboard component
│   ├── workstream-card.tsx
│   ├── details-pane.tsx
│   ├── update-composer.tsx
│   ├── risks-table.tsx
│   └── actions-table.tsx
├── lib/
│   ├── types.ts           # TypeScript type definitions
│   ├── zod-schemas.ts     # Zod validation schemas
│   ├── status.ts          # Status calculation utilities
│   ├── date.ts            # Date formatting utilities
│   ├── supabase.ts        # Supabase server client (service role)
│   ├── supabase/          # Supabase client helpers
│   │   ├── browser.ts     # Browser client
│   │   └── server.ts     # Server client
│   ├── auth.ts            # Auth helpers (server-side)
│   ├── authz.ts           # RBAC helpers (Role-based access control)
│   └── openai.ts          # OpenAI integration
├── scripts/
│   ├── seed.sql           # Database schema and seed data
│   ├── grant-role.ts      # CLI script to grant user roles
│   └── migrations/        # Database migrations
│       ├── 001_add_reports_table.sql
│       ├── 002_add_rls_and_memberships.sql
│       ├── 003_add_status_updates_table.sql
│       ├── 004_add_milestones_table.sql
│       └── 005_update_workstreams_schema.sql
└── middleware.ts          # Route protection middleware
```

## Usage

### Dashboard

The main dashboard shows:
- **KPIs**: Overall status, % on track, open risks count, upcoming milestones
- **Workstream Grid**: Cards showing status, progress, and next milestones
- **Details Pane**: Click a workstream to see summary, risks, and actions
- **Update Composer**: Paste natural language updates

### Adding Updates

Paste notes like:

```
Data Ingest: slipped 2 days; now 70%. New target Fri.
Modeling: on track at 45%. Next milestone "dimension conformance" next Wed.
QA: blocker—test data incomplete; create action for mock data by Mon (Jo).
Add MEDIUM risk on vendor API throughput.
```

Click **Dry-Run Parse** to preview how it will be parsed, then **Apply Update** to save.

### Demo Script

Use this sample text for demonstration:

```
Data Ingest: slipped 2 days; now 70%. New target Fri.
Modeling: on track at 45%. Next milestone "dimension conformance" next Wed.
QA: blocker—test data incomplete; create action for mock data by Mon (Jo).
Add MEDIUM risk on vendor API throughput.
```

1. Paste into Update box
2. Click **Dry-Run Parse** (shows JSON preview)
3. Click **Apply Update** (cards refresh)
4. Click **Explain Weekly** (copy summary text)

## API Routes

### `POST /api/parse`
Parse natural language notes into structured JSON.

**Body:**
```json
{
  "notes": "Data Ingest: 70% complete, on track..."
}
```

**Response:**
```json
{
  "workstreams": [...],
  "risks": [...],
  "actions": [...]
}
```

### `POST /api/apply-update`
Parse notes and apply updates to the database.

**Body:**
```json
{
  "programId": "uuid",
  "notes": "Data Ingest: 70%...",
  "appliedBy": "optional-user-name"
}
```

### `POST /api/explain-weekly`
Generate an executive weekly summary.

**Body:**
```json
{
  "programId": "uuid"
}
```

## Testing

Run type checking:

```bash
npm run build
```

## Syncing to GitHub

The repository includes scripts to sync and verify pushes:

```powershell
# Quick sync with verification
.\sync-and-verify.ps1 -CommitMessage "Your commit message"

# Test authentication
.\test-auth.ps1
```

**First time setup:** See `SETUP_AUTH.md` for authentication setup instructions.

## Deployment to Vercel

1. Push your code to GitHub (already configured)
2. Vercel automatically deploys from the `main` branch
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_PROGRAM_ID`
   - `NEXT_PUBLIC_BASE_URL` (your Vercel URL, e.g., `https://status-update-kfhy.vercel.app`)
4. Verify deployment:
   - Visit `/healthz` - should return `OK`
   - Visit `/auth/sign-in` - should show sign-in UI
   - Visit `/api/diag/env` - check all environment variables are set

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Status Calculation

Overall status is calculated using this rule:
- **RED**: 2+ workstreams with RED status
- **YELLOW**: 1+ RED OR 2+ YELLOW workstreams
- **GREEN**: Otherwise

## Notes

- All writes go through API routes (server-side validation)
- Client-side uses SWR for data fetching and revalidation
- OpenAI integration includes a naive regex fallback if API fails
- Supabase service role key is never exposed to the client

## Stretch Features

### Saved Weekly Reports

Weekly summaries are automatically saved to the `reports` table. View previous reports on the `/report` page with timestamps and copy functionality.

**To enable:** Run the migration `scripts/migrations/001_add_reports_table.sql` in Supabase SQL Editor.

### Scenario Slider

On workstream details, use the "What if slip?" slider to see how milestone dates would change if delayed by 0-7 days. This is front-end only and doesn't modify the database.

## Security & RBAC

### Row Level Security (RLS)

RLS is enabled on all tables via `scripts/migrations/002_add_rls_and_memberships.sql`. Policies enforce:

- **Membership Required**: Users must have a membership to access any program data
- **Role-Based Permissions**:
  - **OWNER**: Full access + membership management
  - **CONTRIBUTOR**: Read + write access (create/update)
  - **VIEWER**: Read-only access

### Authentication

The app uses Supabase Auth (fully implemented) with:
- **Email magic links** (OTP) via `/auth/sign-in`
- **Google OAuth** (optional) - configure in Supabase dashboard
- Session cookies managed by `@supabase/auth-helpers-nextjs`
- Sign-in page at `/auth/sign-in`
- OAuth callback at `/auth/callback` (redirects to `/dashboard`)
- Sign-out button in navigation header

**Important Supabase Configuration:**
1. Go to your Supabase project → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL: `https://status-update-kfhy.vercel.app`
3. Add to **Redirect URLs**: 
   - `https://status-update-kfhy.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local development)
4. This ensures magic link emails use the correct production URL

### Role Assignment

**Automatic Admin Bootstrap:**
- The first user to sign in (fresh database) automatically gets Admin (OWNER) role
- Users with emails listed in `ADMIN_EMAILS` environment variable automatically get Admin (OWNER) role on sign-in
- Email matching is case-insensitive (handles Google aliases)

**Manual Role Assignment:**
- Membership is managed via `/admin/members` (Owner only)
- Use the `grant:role` script to grant roles from the command line:
  ```bash
  npm run grant:role -- --email "waldopotter@gmail.com" --program "default" --role Admin
  ```
- Or invite users via `/admin/members` (Owner only)
- Or manually create membership in Supabase SQL Editor:
  ```sql
  INSERT INTO program_memberships (program_id, user_id, role)
  VALUES ('YOUR-PROGRAM-ID', 'YOUR-USER-UUID', 'OWNER')
  ON CONFLICT (program_id, user_id) DO UPDATE SET role = 'OWNER';
  ```

**Grant Role Script:**
The `grant:role` script allows you to grant roles from the command line:
```bash
# Grant Admin role to a user (uses default program from NEXT_PUBLIC_PROGRAM_ID)
npm run grant:role -- --email "user@example.com" --program "default" --role Admin

# Grant Editor role to a user
npm run grant:role -- --email "user@example.com" --program "default" --role Editor

# Grant Viewer role to a user
npm run grant:role -- --email "user@example.com" --program "default" --role Viewer

# Specify a program ID directly
npm run grant:role -- --email "user@example.com" --program "YOUR-PROGRAM-ID" --role Admin
```

The script is idempotent - running it multiple times is safe (it uses upsert).

### API Route Guards

All API routes enforce role-based access:
- GET routes require membership (any role)
- POST/PATCH/DELETE routes require OWNER or CONTRIBUTOR
- Membership admin routes require OWNER only

### Debug Endpoints

For debugging authentication and RBAC issues:

**GET `/api/debug/session`**
- Returns the current session (redacts sensitive tokens)
- Useful for verifying authentication state
- Example response:
  ```json
  {
    "session": {
      "user": {
        "id": "user-uuid",
        "email": "user@example.com"
      }
    }
  }
  ```

**GET `/api/debug/whoami`**
- Returns current user info with all program memberships
- Useful for debugging RBAC and role assignment
- Example response:
  ```json
  {
    "userId": "user-uuid",
    "email": "user@example.com",
    "memberships": [
      {
        "programId": "program-uuid",
        "role": "OWNER"
      }
    ]
  }
  ```

**Note:** These endpoints are for debugging only. In production, consider restricting access or removing them.

### Middleware Protection

Protected routes (`/dashboard`, `/risks`, `/actions`, `/report`, `/admin/*`) are matched by middleware. Authentication is enforced via the `RequireAuth` component on protected pages. Public routes (`/auth/*`, `/healthz`, `/api/diag/*`) are never intercepted by middleware.

### Service Role Key Security

- `SUPABASE_SERVICE_ROLE_KEY` is **never** imported or referenced in client components
- Only used in:
  - `lib/supabase.ts` (server-only helper)
  - API route handlers (`app/api/**`)
- Verified: No service role key appears in client-side bundles (check Network tab)

## Smoke Tests

Run automated smoke tests to verify API endpoints:

### Local Testing

```bash
# Ensure .env.local has NEXT_PUBLIC_BASE_URL and NEXT_PUBLIC_PROGRAM_ID
npm run smoke:local
```

The script will test:
- ✅ `/api/parse` - Natural language parsing
- ✅ `/api/apply-update` - Database writes
- ✅ `/api/explain-weekly` - Summary generation

Exits with code 0 on success, 1 on failure.

### Production Testing

After deploying to Vercel, set environment variables in Vercel dashboard, then:

```bash
# Set production URL
export NEXT_PUBLIC_BASE_URL="https://yourapp.vercel.app"
export NEXT_PUBLIC_PROGRAM_ID="your-program-id"
npm run smoke:local
```

### Manual Testing

For manual testing with curl:

```bash
# Test 1: Parse
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"notes": "Data Ingest: 70% complete, on track..."}'

# Test 2: Apply Update
curl -X POST http://localhost:3000/api/apply-update \
  -H "Content-Type: application/json" \
  -d '{"programId": "YOUR-PROGRAM-ID", "notes": "Data Ingest: 70%..."}'

# Test 3: Weekly Summary
curl -X POST http://localhost:3000/api/explain-weekly \
  -H "Content-Type: application/json" \
  -d '{"programId": "YOUR-PROGRAM-ID"}'
```

### Database Verification

Run verification queries in Supabase SQL Editor (see `scripts/sql/verify.sql`):

```sql
-- Quick check: workstreams, open risks, open actions
select count(*) as workstreams from workstreams where program_id = 'YOUR-PROGRAM-ID';
select count(*) as open_risks from risks where program_id = 'YOUR-PROGRAM-ID' and status != 'CLOSED';
select count(*) as open_actions from actions where program_id = 'YOUR-PROGRAM-ID' and status != 'DONE';
```

## Git Operations

### Automated Sync Script

Use the sync script to automate pull, commit, and push operations:

```bash
# Pull latest and push local commits
npm run git:sync

# Auto-commit uncommitted changes
npm run git:sync -- -AutoCommit -CommitMessage "Your message"
```

Or use the PowerShell script directly:

```powershell
.\scripts\git-sync.ps1
```

### First-Time Git Setup

1. **Configure Git Credential Manager**:
   ```powershell
   git config --global credential.helper manager
   ```

2. **Set user info** (if not already set):
   ```powershell
   git config user.name "AugieDoggie2021"
   git config user.email "waldopotter@gmail.com"
   ```

3. **Authenticate with GitHub**:
   - Create a Personal Access Token at: https://github.com/settings/tokens
   - Select `repo` scope
   - When Git prompts for credentials, use:
     - Username: `AugieDoggie2021`
     - Password: Your Personal Access Token (NOT your GitHub password)

See `scripts/SETUP_GIT_AUTH.md` for detailed authentication setup.

## Troubleshooting

### A. OpenAI 500 on `/api/parse`

**Symptoms:** API returns 500 error when parsing notes.

**Solutions:**
- Ensure `OPENAI_API_KEY` is set in `.env.local` and restart dev server
- Check API key is valid and has sufficient credits
- If model is unsupported, the code will automatically fall back to naive parser (you'll see `_fallback: true` in response)
- Check server logs for specific OpenAI error messages (without exposing secrets)

### B. Supabase 500 on `/api/apply-update`

**Symptoms:** Database writes fail, API returns 500.

**Solutions:**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is present in `.env.local` (server-side only)
- Verify enum alignment matches database schema:
  - Status: `GREEN`, `YELLOW`, `RED`
  - Severity: `LOW`, `MEDIUM`, `HIGH`
  - Risk Status: `OPEN`, `MITIGATED`, `CLOSED`
  - Action Status: `OPEN`, `IN_PROGRESS`, `DONE`
- Check upsert logic: workstreams by `program_id + lower(name)`, risks/actions by `program_id + lower(title)`
- Verify database schema matches `scripts/seed.sql`

### C. Empty Dashboard

**Symptoms:** Dashboard loads but shows no workstreams.

**Solutions:**
- Ensure `.env.local` has the correct `NEXT_PUBLIC_PROGRAM_ID` from seed.sql
- Verify seeded program exists: Run `SELECT * FROM programs WHERE id = 'YOUR-PROGRAM-ID';` in Supabase SQL Editor
- Restart dev server after changing environment variables (`npm run dev`)
- Check browser console for API errors
- Verify API route `/api/workstreams?programId=...` returns data

### D. CORS/Base URL Issues

**Symptoms:** Fetch errors, network failures in production.

**Solutions:**
- Development: Set `NEXT_PUBLIC_BASE_URL="http://localhost:3000"` in `.env.local`
- Production (Vercel): Set `NEXT_PUBLIC_BASE_URL="https://yourapp.vercel.app"` in Vercel environment variables
- Internal API calls use relative paths, so this mainly affects external integrations

### E. Secret Leakage

**Symptoms:** Security concern about exposed keys.

**Verification:**
- Search codebase: `SUPABASE_SERVICE_ROLE_KEY` should **only** appear in:
  - `lib/supabase.ts` (server-side function)
  - API route handlers (server-side only)
  - `.env.local` (never committed)
- Never appears in:
  - Client components (`app/**/page.tsx`, `components/**`)
  - Client-side JavaScript bundles
- To verify: Inspect browser Network tab, search for service role key → should not appear

### General Tips

- **Restart dev server** after changing `.env.local`
- Check **server console logs** for detailed error messages (routes log `[routePath]` prefixes)
- Use **smoke tests** to verify endpoints work after deployment
- **Error responses** include `ok: false` and descriptive error messages for debugging

## Design Guidelines

### Color Contrast Rule

**NEVER use dark text on dark backgrounds.** This is a critical accessibility and readability requirement.

- Always ensure sufficient contrast between text and background colors
- Use explicit color classes instead of generic `text-muted-foreground`:
  - Primary text: `text-slate-900 dark:text-slate-100`
  - Secondary text: `text-slate-700 dark:text-slate-300`
  - Muted text: `text-slate-600 dark:text-slate-400`
- When using gradient or colored backgrounds, ensure text remains readable:
  - Light backgrounds (slate-50, slate-100): Use dark text (`text-slate-900`)
  - Dark backgrounds (slate-700, slate-800, slate-900): Use light text (`text-white` or `text-slate-100`)
- Test in both light and dark modes to ensure readability

**Example violations to avoid:**
- Dark text (`text-slate-900`) on dark blue/navy backgrounds
- Generic `text-muted-foreground` on colored backgrounds
- Insufficient contrast that makes text hard to read

## License

MIT
