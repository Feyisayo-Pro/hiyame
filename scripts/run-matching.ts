#!/usr/bin/env -S npx tsx
/// <reference types="node" />
// Operator CLI to run the matching pipeline (lib/matchingPipeline.ts) for one
// role and persist to match_scores. The app now does this automatically after
// a role is posted (api/run-matching.ts calls the same pipeline); this script
// stays as a manual escape hatch — bulk re-scoring, debugging, running against
// migrated roles. Same service-role/.env.migration pattern as the other
// scripts.
//
// Usage: npm run match:role -- --role-id <uuid> [--strict]

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runMatchingForRole } from '../lib/matchingPipeline';

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
  const roleId = argValue('--role-id');
  if (!roleId) {
    console.error('Usage: npm run match:role -- --role-id <uuid> [--strict]');
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

  const summary = await runMatchingForRole(supabase, roleId, {
    requireVerification: process.argv.includes('--strict'),
  });

  console.log(
    `Role: ${summary.roleTitle} (${summary.tier}). ` +
      `Considered ${summary.candidatesConsidered}, stored ${summary.scored}. ` +
      `Shortlist ${summary.shortlisted}, alternates ${summary.alternates}. ` +
      `Shallow pool: ${summary.shallowPool}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
