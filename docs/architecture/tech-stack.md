# Technical Stack Overview

- Framework: Next.js 14 with the App Router, running in hybrid SSR/ISR mode.
- Language: TypeScript with strict types checked by tsconfig.json.
- Auth: Supabase Auth (OAuth and magic links) with helpers in lib/auth.ts and middleware in middleware.ts.
- Data: Supabase Postgres via the generated types in lib/database.types.ts and SQL migrations stored under scripts/migrations/.
- State and fetching: server actions plus a typed fetcher layer in lib/client/.
- UI: Tailwind CSS via globals.css, shadcn/ui component primitives, and sonner toasts for notifications.
- AI integration: OpenAI helper functions in lib/openai.ts and status parsing under app/api/parse.
- Tooling: ESLint, Jest, and Vitest for unit tests, Playwright end-to-end tests in the tests folder, and GitHub Actions in .github/.
