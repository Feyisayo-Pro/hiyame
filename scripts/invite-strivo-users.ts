#!/usr/bin/env -S npx tsx
/// <reference types="node" />
// Invite migrated Strivo candidates/companies to claim their real Hiyame account.
// Part of the Auth milestone — see .claude/plans/enchanted-spinning-quasar.md §3.
//
// Default mode sends exactly ONE real invite, to an address YOU control, using a
// synthetic sample record — for end-to-end testing of the whole invite -> confirm
// -> set password -> claim flow before ever touching the 1,117 real candidates or
// 16 real companies. A real batch send requires --confirm-batch explicitly and is
// not something this script encourages by default.
//
// Usage:
//   npm run invite:strivo -- --test-email you@example.com --redirect-url http://localhost:8082/claim
//
// SECURITY: requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (scripts/.env.migration,
// gitignored — same file migrate-strivo-data.ts uses). Sending real invite emails is an
// outward-facing, hard-to-undo action — this script refuses to run without an explicit
// --test-email or --confirm-batch flag, and never both at once.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, '.env.migration'));

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const testEmail = argValue('--test-email');
  const confirmBatch = process.argv.includes('--confirm-batch');
  const limit = Number(argValue('--limit') ?? '0');
  const redirectUrl = argValue('--redirect-url');

  if (!testEmail && !confirmBatch) {
    console.error('Refusing to run: pass --test-email you@address.com to send one test invite, or --confirm-batch --limit N for a real batch (not recommended yet — see the migration plan).');
    process.exit(1);
  }
  if (testEmail && confirmBatch) {
    console.error('Refusing to run: --test-email and --confirm-batch are mutually exclusive.');
    process.exit(1);
  }
  if (!redirectUrl) {
    console.error('Pass --redirect-url <url> — where the invite email\'s link should land (must be in this Supabase project\'s Auth > URL Configuration > Redirect URLs allowlist), e.g. http://localhost:8082/claim');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in scripts/.env.migration (gitignored).');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (testEmail) {
    console.log(`Sending ONE test invite to ${testEmail} (claim_type: candidate, synthetic sample data)...`);
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(testEmail, {
      redirectTo: redirectUrl,
      data: {
        claim_type: 'candidate',
        // Synthetic — this test address won't match a real candidates row, so
        // claim_candidate_profile() will correctly return null (no row to
        // link). That's the expected, safe outcome for a test send: it proves
        // the invite -> confirm -> set-password -> RPC-call path works
        // end-to-end without touching any real migrated data.
      },
    });
    if (error) {
      console.error('Invite failed:', error.message);
      process.exit(1);
    }
    console.log('Invite sent. User id:', data.user?.id);
    console.log('Check the inbox, click the link, set a password on the Claim screen, and confirm the flow completes without error.');
    return;
  }

  console.error('Batch invites are not implemented yet — this is deliberately left for a separate, later step once the test invite above has been verified end-to-end. See the migration plan.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
