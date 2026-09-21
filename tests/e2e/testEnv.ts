// Minimal .env.migration loader — same pattern as
// scripts/migrate-strivo-data.ts, reused here rather than adding a new
// secrets location. The service-role key must NEVER be committed or
// prefixed EXPO_PUBLIC_; it lives only in the gitignored
// scripts/.env.migration file, read by operator-run Node scripts.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function loadEnvFile(path: string) {
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

// .env has the public URL/anon key the app itself ships with (safe — that's
// what "anon" means); .env.migration has the service-role key, which never
// leaves an operator's machine or a serverless function.
loadEnvFile(join(__dirname, '..', '..', '.env'));
loadEnvFile(join(__dirname, '..', '..', 'scripts', '.env.migration'));

export const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'https://hiyame-five.vercel.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Need EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
    '(from .env) and SUPABASE_SERVICE_ROLE_KEY (from scripts/.env.migration, gitignored) to run ' +
    'the E2E suite — see scripts/README-migration.md.'
  );
}
