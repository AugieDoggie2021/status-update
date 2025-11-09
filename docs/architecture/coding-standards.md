# Coding Standards

These notes ground the BMAD Developer and QA agents in the house style that the team already follows.

- TypeScript first: prefer strict TypeScript in both server and client modules. Lean on zod schemas for runtime validation when crossing trust boundaries.
- Functional React: use modern React server components where possible. Client components live under the app directory and should be marked with "use client".
- UI primitives: consume shared components from components/ui before introducing new libraries to keep styling consistent.
- Lint and format: rely on ESLint and Prettier defaults in the repo. Do not disable rules unless the violation is a reviewed false positive.
- Testing: add unit coverage under lib/__tests__ using Jest or Vitest as appropriate. End-to-end cases belong alongside the Playwright specs in the tests folder.
- API contracts: surface reusable types in lib/types.ts or the relevant module, and keep route handlers thin by delegating business logic to testable helpers.
