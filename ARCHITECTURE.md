# Architecture Documentation

## Framework & Stack

**Framework**: Next.js 15 with App Router
**Routing Mode**: App Router (`app/` directory structure)
**Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
**Authentication**: Supabase Auth (Google OAuth + Magic Links)
**ORM**: Direct Supabase client (no Prisma)
**UI Library**: shadcn/ui components + TailwindCSS
**State Management**: SWR for data fetching/caching
**API**: Next.js API Routes (App Router route handlers)

### Key Libraries

- `@supabase/supabase-js`: Supabase client
- `@supabase/ssr`: Server-side rendering helpers
- `@supabase/auth-helpers-nextjs`: Auth utilities
- `openai`: OpenAI API for natural language parsing
- `zod`: Schema validation
- `swr`: Data fetching/caching
- `framer-motion`: Animations
- `date-fns`: Date utilities
- `sonner`: Toast notifications

---

## Data Model

### Core Entities

#### `Program`
- `id` (UUID, PK)
- `name` (text)
- `sponsor` (text, nullable)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `created_by` (UUID, nullable, references `auth.users`)

**File**: `scripts/seed.sql`

#### `ProgramMembership`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `user_id` (UUID, FK → `auth.users`)
- `role` (enum: `OWNER`, `CONTRIBUTOR`, `VIEWER`)
- `created_at` (timestamptz)

**File**: `scripts/migrations/002_add_rls_and_memberships.sql`

#### `Workstream`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `name` (text)
- `lead` (text, nullable)
- `status` (enum: `GREEN`, `YELLOW`, `RED`)
- `percent_complete` (int, 0-100)
- `summary` (text)
- `next_milestone` (text, nullable)
- `next_milestone_due` (date, nullable)
- `updated_at` (timestamptz)

**File**: `scripts/seed.sql`

#### `Risk`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `workstream_id` (UUID, FK → `workstreams`, nullable)
- `title` (text)
- `severity` (enum: `LOW`, `MEDIUM`, `HIGH`)
- `status` (enum: `OPEN`, `MITIGATED`, `CLOSED`)
- `owner` (text, nullable)
- `due_date` (date, nullable)
- `notes` (text, nullable)

**File**: `scripts/seed.sql`

#### `Action`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `workstream_id` (UUID, FK → `workstreams`, nullable)
- `title` (text)
- `owner` (text, nullable)
- `due_date` (date, nullable)
- `status` (enum: `OPEN`, `IN_PROGRESS`, `DONE`)
- `notes` (text, nullable)

**File**: `scripts/seed.sql`

#### `Update`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `raw_text` (text)
- `parsed_json` (jsonb)
- `applied_by` (text, nullable)
- `created_at` (timestamptz)

**File**: `scripts/seed.sql`

#### `Report`
- `id` (UUID, PK)
- `program_id` (UUID, FK → `programs`)
- `text` (text)
- `created_at` (timestamptz)

**File**: `scripts/migrations/001_add_reports_table.sql`

### Missing Entities (To Be Added)

#### `Milestone` (Not yet implemented)
- Should be a separate table tracking milestones with dates
- Currently only `next_milestone` and `next_milestone_due` exist on `Workstream`

#### `StatusUpdate` (Not yet implemented)
- Should track weekly status updates per workstream
- Fields: `id`, `workstream_id`, `week_start` (ISO Monday), `rag`, `progress_percent`, `accomplishments`, `blockers`, `plan_next`, `created_by`, `created_at`
- Unique constraint: `(workstream_id, week_start)`

---

## API Routes / Server Actions

### Authentication & Authorization

#### `GET /api/role`
- **Purpose**: Get current user's role for a program
- **Auth**: Requires session
- **Params**: `programId` (query)
- **Returns**: `{ ok: boolean, role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }`
- **File**: `app/api/role/route.ts`

### Workstreams

#### `GET /api/workstreams`
- **Purpose**: Fetch all workstreams for a program
- **Auth**: Requires membership (any role)
- **Params**: `programId` (query)
- **Returns**: Array of `Workstream`
- **File**: `app/api/workstreams/route.ts`

#### `POST /api/workstreams` (Not yet implemented)
- **Purpose**: Create new workstream
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`

#### `PATCH /api/workstreams/:id` (Not yet implemented)
- **Purpose**: Update workstream
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`

#### `DELETE /api/workstreams/:id` (Not yet implemented)
- **Purpose**: Delete workstream
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`

### Risks

#### `GET /api/risks`
- **Purpose**: Fetch all risks for a program
- **Auth**: Requires membership (any role)
- **Params**: `programId` (query)
- **Returns**: Array of `Risk`
- **File**: `app/api/risks/route.ts`

#### `PATCH /api/risks`
- **Purpose**: Update risk
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`
- **Body**: `{ id, programId, ...updates }`
- **Returns**: Updated `Risk`
- **File**: `app/api/risks/route.ts`

### Actions

#### `GET /api/actions`
- **Purpose**: Fetch all actions for a program
- **Auth**: Requires membership (any role)
- **Params**: `programId` (query)
- **Returns**: Array of `Action`
- **File**: `app/api/actions/route.ts`

#### `PATCH /api/actions`
- **Purpose**: Update action
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`
- **Body**: `{ id, programId, ...updates }`
- **Returns**: Updated `Action`
- **File**: `app/api/actions/route.ts`

### Updates & Parsing

#### `POST /api/parse`
- **Purpose**: Parse natural language notes into structured JSON
- **Auth**: None (public parsing)
- **Body**: `{ notes: string }`
- **Returns**: `ParsedUpdate` (workstreams, risks, actions)
- **File**: `app/api/parse/route.ts`

#### `POST /api/apply-update`
- **Purpose**: Parse notes and apply updates to database
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`
- **Body**: `{ programId, notes, appliedBy? }`
- **Returns**: `{ ok: boolean, overall: Status }`
- **File**: `app/api/apply-update/route.ts`

#### `POST /api/explain-weekly`
- **Purpose**: Generate AI weekly summary
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`
- **Body**: `{ programId }`
- **Returns**: `{ ok: boolean, summary: string }`
- **File**: `app/api/explain-weekly/route.ts`

### Status & Metrics

#### `GET /api/overall`
- **Purpose**: Calculate overall program status
- **Auth**: None (public)
- **Params**: `programId` (query)
- **Returns**: `{ ok: boolean, overall: Status }`
- **File**: `app/api/overall/route.ts`

#### `GET /api/reports`
- **Purpose**: Fetch saved weekly reports
- **Auth**: Requires membership (any role)
- **Params**: `programId` (query)
- **Returns**: Array of `Report`
- **File**: `app/api/reports/route.ts` (if exists)

### Status Updates (Not yet implemented)

#### `POST /api/status-updates`
- **Purpose**: Submit weekly status updates for multiple workstreams
- **Auth**: Requires `OWNER` or `CONTRIBUTOR`
- **Body**: `{ programId, updates: Array<{ workstreamId, weekStart, rag, progressPercent, accomplishments, blockers, planNext }> }`
- **Returns**: `{ ok: boolean, created: number }`

#### `GET /api/status-updates`
- **Purpose**: Fetch status updates for a workstream
- **Auth**: Requires membership (any role)
- **Params**: `programId`, `workstreamId?`, `weekStart?` (query)
- **Returns**: Array of `StatusUpdate`

---

## Data Flow

### Google Sign-In → Dashboard Load

```
1. User visits /auth/sign-in
   └─> SignInForm component (app/auth/sign-in/page.tsx)
       └─> signWithGoogle() → supabase.auth.signInWithOAuth()
           └─> Redirects to Google
               └─> Redirects to /auth/callback

2. /auth/callback route handler (app/auth/callback/route.ts)
   └─> exchangeCodeForSession(code)
       └─> Redirects to /dashboard

3. /dashboard page (app/dashboard/page.tsx)
   └─> getServerSession() → checks auth
       └─> Renders DashboardClient

4. DashboardClient (app/dashboard/DashboardClient.tsx)
   └─> useSWR('/api/workstreams?programId=...') → fetches workstreams
   └─> useSWR('/api/risks?programId=...') → fetches risks
   └─> useSWR('/api/actions?programId=...') → fetches actions
   └─> useSWR('/api/overall?programId=...') → fetches overall status
   └─> useSWR('/api/role?programId=...') → fetches user role
       └─> Renders KPIs, WorkstreamCards, DetailsPane, UpdateComposer
```

### Create/Update Path (Natural Language Update)

```
1. User pastes notes in UpdateComposer (components/update-composer.tsx)
   └─> Clicks "Dry-Run Parse"
       └─> POST /api/parse { notes }
           └─> parseNotesToJSON() (lib/openai.ts)
               └─> OpenAI API call or naive parser fallback
                   └─> Returns ParsedUpdate JSON

2. User clicks "Apply Update"
   └─> POST /api/apply-update { programId, notes, appliedBy? }
       └─> requireRole(programId, ['OWNER', 'CONTRIBUTOR'])
       └─> parseNotesToJSON() → ParsedUpdate
       └─> Insert into updates table
       └─> For each workstream in parsed.workstreams:
           └─> Upsert workstream (by program_id + name)
       └─> For each risk in parsed.risks:
           └─> Upsert risk (by program_id + title)
       └─> For each action in parsed.actions:
           └─> Upsert action (by program_id + title)
       └─> Calculate overall status
           └─> Returns { ok: true, overall: Status }

3. DashboardClient receives response
   └─> mutate() for all SWR hooks → refetches data
       └─> UI updates with new data
```

### Request → Server → DB Flow

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ HTTP Request (fetch/SWR)
       ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  (app/api/*/route.ts)               │
│                                     │
│  1. Parse request body/query        │
│  2. requireAuth() / requireRole()   │
│  3. getAdminClient()                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Supabase Client                    │
│  (lib/supabase.ts)                  │
│                                     │
│  Uses SUPABASE_SERVICE_ROLE_KEY     │
│  (bypasses RLS)                     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Supabase (PostgreSQL)              │
│                                     │
│  - RLS policies enforce access      │
│  - Tables: programs, workstreams,   │
│    risks, actions, updates, etc.    │
└─────────────────────────────────────┘
```

---

## Gaps & Quick Wins

### P1 (Critical - Missing Core Features)

1. **Missing StatusUpdate table and weekly update tracking** (`lib/types.ts`, `scripts/migrations/`)
   - Add `status_updates` table with fields: `id`, `workstream_id`, `week_start`, `rag`, `progress_percent`, `accomplishments`, `blockers`, `plan_next`, `created_by`, `created_at`
   - Unique constraint on `(workstream_id, week_start)`
   - Migration: `scripts/migrations/003_add_status_updates_table.sql`

2. **Missing Milestones table** (`lib/types.ts`, `scripts/migrations/`)
   - Currently only `next_milestone` text field on workstreams
   - Add `milestones` table: `id`, `workstream_id`, `title`, `due_date`, `completed_at`, `created_at`
   - Migration: `scripts/migrations/004_add_milestones_table.sql`

3. **No Workstream CRUD UI** (`app/workstreams/page.tsx`, `components/workstreams/`)
   - Create workstreams list page with table/list view
   - Add create/edit/delete forms/dialogs
   - Wire to POST/PATCH/DELETE endpoints (need to create)

4. **Multi-workstream Status Update Wizard missing** (`components/status/UpdateWizard/`)
   - 3-step wizard: Select → Fill → Review & Submit
   - Server action: `POST /api/status-updates` with transaction support
   - File: `components/status/UpdateWizard/UpdateWizard.tsx`

5. **RBAC role names mismatch** (`lib/auth.ts`, `scripts/migrations/002_add_rls_and_memberships.sql`)
   - Current: `OWNER`, `CONTRIBUTOR`, `VIEWER`
   - Required: `Viewer`, `Editor`, `Admin`
   - Migration to add new enum values or map existing ones
   - Update `lib/auth.ts` to use new names with backward compatibility

### P2 (High Priority - Enhancements)

6. **Demo Mode not implemented** (`lib/demo.ts`, `.env.example`)
   - Env flag: `NEXT_PUBLIC_DEMO_MODE=true`
   - Anonymize emails/names in UI
   - Pre-select demo program
   - File: `lib/demo.ts`

7. **Missing seed data script** (`scripts/seed.ts`)
   - Generate realistic demo data: 1 Program, 4 Workstreams, 6 Milestones, 5 Risks, 8 Actions, 4 weeks of StatusUpdates
   - Run via Supabase SQL or TypeScript script
   - File: `scripts/seed.ts` (Supabase-compatible)

8. **Viewer role UI restrictions incomplete** (`components/kpis.tsx`, `components/workstream-card.tsx`)
   - Hide edit/create buttons for `VIEWER`
   - Add inline banner: "You have viewer access to this program. Contact your engagement lead to request edit access."
   - File: `components/viewer-banner.tsx`

9. **Missing "My Access" settings panel** (`app/settings/page.tsx`, `components/settings/MyAccess.tsx`)
   - Show current user's role and program memberships
   - File: `app/settings/page.tsx`

10. **Dashboard KPIs need StatusUpdate integration** (`components/kpis.tsx`)
    - `% On Track`: Use latest StatusUpdate RAG for each workstream (fallback to workstream.status)
    - Ensure KPIs recompute after wizard submission
    - File: `lib/kpi-calculations.ts`

---

## File References

### Key Files

- **Auth**: `lib/auth.ts`, `lib/supabase/server.ts`, `app/auth/sign-in/page.tsx`, `app/auth/callback/route.ts`
- **RBAC**: `lib/auth.ts` (getRole, requireRole, requireMembership)
- **API Routes**: `app/api/*/route.ts`
- **Types**: `lib/types.ts`, `lib/database.types.ts`
- **Components**: `components/*.tsx`
- **Database Schema**: `scripts/seed.sql`, `scripts/migrations/*.sql`
- **Utils**: `lib/status.ts`, `lib/date.ts`, `lib/openai.ts`

### Components Structure

```
components/
├── ui/                    # shadcn/ui primitives
├── kpis.tsx              # Dashboard KPIs
├── workstream-card.tsx   # Workstream display card
├── details-pane.tsx      # Workstream details side panel
├── update-composer.tsx   # Natural language update input
├── risks-table.tsx       # Risks table with inline edit
├── actions-table.tsx     # Actions table with inline edit
└── nav.tsx               # Navigation bar
```

---

## Next Steps

1. Create `StatusUpdate` table and API routes
2. Implement Workstream CRUD endpoints and UI
3. Build multi-workstream Status Update Wizard
4. Add demo mode and seed data
5. Enhance RBAC UI (Viewer banner, My Access panel)
6. Update dashboard KPIs to use StatusUpdates
