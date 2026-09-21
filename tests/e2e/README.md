# E2E suite

Runs against the real deployed app (`https://hiyame-five.vercel.app` by
default) and the real Supabase backend — no mocks. This app has little
meaningful logic left once the network calls are stubbed out, so these tests
exercise the same signup/sign-in/data flow a real user hits.

## Running

```
npm run test:e2e
```

Requires:
- `.env` — already present in the repo checkout, has the public
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `scripts/.env.migration` — gitignored, holds `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`. Same file the migration scripts use; ask
  whoever ran those for a copy, or pull it from Vercel's env vars.

Point at a different deployment (e.g. a preview URL) with:

```
E2E_BASE_URL=https://hiyame-git-some-branch.vercel.app npm run test:e2e
```

## How it's structured

- `global-setup.ts` provisions one throwaway candidate + one throwaway
  company account (`e2e-*@hiyame-test.invalid`) via the service role before
  the suite runs, and writes their credentials to `.auth/accounts.json`
  (gitignored).
- `global-teardown.ts` deletes both afterward — going through the real
  `api/delete-account` endpoint (sign in as the test user, then call it),
  not a direct DB delete, so every run is also a live regression check on
  account deletion and its Storage cleanup. Falls back to a direct
  service-role delete only if sign-in itself fails, so a broken sign-in
  can't strand test accounts.
- Specs run serially (`workers: 1`) — they share the same two accounts, and
  `company-post-role.spec.ts` mutates the company account's own data, so
  parallel runs would race by construction.

A run that dies before teardown (crash, Ctrl+C) leaves one identifiable
`e2e-*` account behind, not corrupted shared state — safe to just delete by
hand or let the next run's setup add another one.

## What's covered

- `persona-guard.spec.ts` — regression test for the 2026-09-21 bug where a
  page reload could flip a signed-in user to the other persona's Home
  (candidate → company or vice versa). Covers both directions.
- `company-post-role.spec.ts` — the "+ Post a Role" flow: fills the form,
  submits, confirms a real `roles` row was created and the company lands on
  its shortlist. Doesn't assert the shortlist gets populated — self-serve
  matching only runs via the operator-invoked `scripts/run-matching.ts`,
  a real, documented limitation, not a bug.
- `candidate-profile-edit.spec.ts` — edits name + adds a skill, confirms
  the toast, the on-screen update, and (after a reload) that it actually
  reached the `candidates` row rather than just local state.
- `accessibility.spec.ts` — axe-core sweep (wcag2a/wcag2aa/best-practice)
  across every public page, both signed-in Homes, and dark mode. `region`
  is deliberately disabled — see the comment at the top of that file.

## Not yet covered

Photo/logo upload (candidate photo, company logo) — QA'd manually earlier
this session via Playwright's `filechooser` event, but not converted into a
committed spec yet.
