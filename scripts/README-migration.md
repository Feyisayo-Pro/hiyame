# Strivo → Hiyame data migration

One-time import of real candidate/client/job data from the "strivo-recruit" Firebase
project into Hiyame's Supabase schema. Full design rationale: `.claude/plans/enchanted-spinning-quasar.md`.

## 1. Producing the source export

The three Firestore collections (`clients`, `candidates`, `jobs`) were read using the
Firebase **client SDK** (not an admin service account) against the `strivo-recruit`
project's public web config, and dumped to JSON. If you need to re-export (e.g. the
source data changed), the same approach works: initialize the `firebase` JS SDK with
that project's `firebaseConfig`, `getDocs(collection(db, name))` for each of the three
collection names, and write `snap.docs.map(d => ({ id: d.id, ...d.data() }))` to JSON.

Place the three files here as:

```
scripts/firebase-export-data/firestore_clients.json
scripts/firebase-export-data/firestore_candidates.json
scripts/firebase-export-data/firestore_jobs.json
```

This directory is gitignored — it contains real, unredacted PII (names, phone numbers,
emails, full CV text) and must never be committed.

## 2. Dry run

```
npm run migrate:strivo
```

Writes nothing. Prints (and saves to `scripts/migration-report.json`, also gitignored)
a report of exactly what would be imported: active-client count, candidates
excluded/deduped, roles skipped, any salary strings that failed to parse, and any jobs
whose `contractType` was missing (defaulted to `short_term` — check
`fallbackTierAssignments` in the report and confirm that's acceptable). Add `--sample`
to also print one fully-transformed row per table for a manual spot-check.

**Review this report by hand before applying** — several of the transforms (salary
parsing, location splitting, experience-level bucketing) are heuristics over messy
real-world text, not guaranteed-correct parsing.

## 3. Applying

1. Create `scripts/.env.migration` (gitignored) with:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   The service-role key must **never** be added to the app's own `.env` or prefixed
   `EXPO_PUBLIC_` — it belongs only here, in an operator's hands, per the architecture
   doc's secrets requirement (§8).
2. Apply the schema first: `npx supabase link --project-ref <ref>` then
   `npx supabase db push` (applies `supabase/migrations/*.sql`).
3. Run `npm run migrate:strivo:apply`. Safe to re-run — inserts upsert on
   `(external_source, external_id)`.

## What this migration does NOT do

- Does not create any Supabase Auth accounts. Migrated candidates/companies have no
  login capability until a deliberate, separate invite step happens later — see the
  plan's "Auth strategy" section for why.
- Does not touch the swipe-deck screens (`app/(company)/roles.tsx`,
  `app/(candidate)/opportunities.tsx`) or the subscription tier names
  (`lib/subscriptionStore.ts`) — those are separate, later milestones.
- Does not populate `verification_records` — none of the migrated candidates have
  done Hiyame's identity/video/assessment/review steps, so all start
  `verified_badge_status = 'unverified'` and stay invisible to any future matching
  engine until they verify.
