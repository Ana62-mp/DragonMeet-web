# Agent guide: DragonMeet USFQ

The one rulebook for every agent in this repository, whoever runs it (Claude Code, Codex, Cursor, Gemini or any
other) and whichever team member it works for. `CLAUDE.md` only imports this file. It follows the same way of working
as the team's other project (Farpoint HORIZON), adapted to a web app.

The app: **DragonMeet USFQ**, an academic, mobile-first web prototype that finds the free time friends at USFQ
(Cumbayá campus) share. It is **not** an official USFQ app: no Microsoft 365, no Banner, no GPS. Test accounts are
fictitious. Team: **Ana** (Ana62-mp, repository owner), **Vale** (valenparedes) and **Sebastián** (XebaxCode).

## Read first
1. `README.md`: what the app does, the stack, setup, test accounts, security model and decisions.
2. The open issues and their comments: who is on what (see "Working beside other agents").
3. `supabase/migrations/001_schema.sql` before touching data or permissions; `src/domain/` before touching rules.

## Who decides
- **The team members decide**: the idea, the design, scope, accounts, anything public. Agents bring evidence,
  alternatives and a recommendation, and are free to propose anything.
- **Only a person merges**, never an agent: not into `main`, not into the version branch. An agent stops at the pull
  request and waits for a team member's review and confirmation.
- Agents talk with their person in that person's language (Spanish). The code, commits and pull requests are in
  English; everything a user sees in the app is in Spanish.

## How we work
- **Privacy first, always.** Nothing about another student leaves the server without accepted friendship and
  permission on both sides (`README.md` > Seguridad). Every new feature that shows someone else's data goes through a
  server function with Row Level Security and gets an SQL test in `tests/sql.test.mjs`. Never store coordinates or
  movement history.
- **Real, never fake.** The app shows only what is true in the database. No invented features presented as real (the
  photo import says "demo"); no mock data in the client (`src/store.ts` loads everything from Supabase).
- **Discarded on purpose:** the AI chatbot (branch `Xebax_LCF`) is out of scope (team decision, 2026-11-16). Do not
  bring it back or build on it without the team asking.
- **Rules apart from screens.** Time, schedule and availability rules live in `src/domain/` and `src/engine.ts` as
  pure functions with tests; Supabase access lives only in `src/services/`; pages only draw.
- **Ecuador time.** Every date and hour a user sees or picks is Ecuador's (`America/Guayaquil`), via the helpers in
  `src/domain/time.ts`; never `toISOString()` for a calendar date.
- **Measure before you claim.** Run it, read the output, look at the screen; cite the file and line or the command.
  A guess is labeled as a guess.
- **Done means you used it, as a student would.** Before calling a piece done: `npm run test`, `npm run lint` and
  `npm run build` are green, and you used the feature in the running app (`npm run dev`) at phone width and desktop
  width, with the test accounts, and looked at every screen it touches. "It compiles and the tests pass" is not done.
- **Fix at the cause, small.** One problem, one commit, saying what a user now sees. Never patch the symptom.
- **Nothing looks AI-made.** No AI-generated images; copy is plain, friendly Spanish; UI reuses `src/components/ui.tsx`
  and the tokens in `src/style.css`.

## The cycle of a version
1. A version branch (`v1.1.0`, then `v1.2.0` ...) collects finished pieces. Its pull request into `main` opens only
   when the version is complete; only a team member merges it.
2. Every piece of work is a GitHub issue: what the user gets, the files it owns, how to check it, the done-when list.
   Claim it (assign it to your person and comment **CLAIM**) before starting.
3. Build it on a branch of your own, made from the version branch and named after the issue:
   `git fetch origin && git switch -c work/<issue>-<name> origin/v1.1.0`. Commit small working steps in English and
   push often.
4. Stay current by merging, never by rewriting: `git fetch origin && git merge origin/v1.1.0`. Never rebase or
   force-push a pushed branch: others may have merged it.
5. When the piece works, open a pull request into the version branch (body from `.github/pull_request_template.md`)
   and comment **DELIVERED** on the issue. Then stop: a team member reviews and merges.
6. Someone who did not build a piece reviews it; findings are verified before they are fixed, and fixed at their cause.
7. Never delete a branch, yours or anyone's.

## Commits and pull requests
- Commits: English, conventional prefix (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`), what changed for the user.
- **No AI co-author lines or generated-by signatures** in commits or pull requests (`.claude/settings.json` turns them
  off for Claude Code; set the same in other tools). AI use is disclosed in the README instead.
- Pull requests into `main`: only the version pull request, titled `v1.1.0: <what a user can now do>`.

## Working beside other agents
Before starting any piece:
1. `git fetch origin`; look at the open issues and assignees, open pull requests, and recently pushed `work/*`
   branches and the files they change (`git log origin/<branch> --name-only -5`).
2. Comment **CLAIM** on the issue: person, branch, files it will write, shared files it will touch.
3. Post **PROGRESS** at real steps; **DELIVERED** after the pull request (what was checked, leftovers as a new issue);
   **RELEASED** if you stop without finishing, so someone else can take it.

Each piece owns the files its issue lists. A change to something everyone uses (`src/store.ts`, `src/types.ts`,
`src/style.css`, the SQL schema, this file) is its own small piece, agreed by the team and merged first. Never
rewrite, reformat or revert someone else's work, and never push to someone else's branch; ask in the issue or open
a pull request into their branch. Leave every branch better than you found it: tests, lint and build green.

## Stack and commands
React 18, TypeScript, Vite, React Router, Zustand, Supabase (Auth + Postgres with RLS), deployed on Vercel.
- `npm run dev` · `npm run test` (engine, domain, seed and RLS tests against a real Postgres in memory, PGlite) ·
  `npm run lint` · `npm run build`.
- Secrets live only in `.env.local` (never committed); the `service_role` key never gets a `VITE_` prefix.
