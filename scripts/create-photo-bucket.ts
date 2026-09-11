#!/usr/bin/env -S npx tsx
/// <reference types="node" />
// One-time (idempotent) setup: creates the public "candidate-photos" Storage
// bucket that api/upload-candidate-photo.ts uploads into. Run once against
// production: `npx tsx scripts/create-photo-bucket.ts`. Safe to re-run — it
// no-ops if the bucket already exists. Same service-role/.env.migration
// pattern as the other one-off scripts (see scripts/README-migration.md).

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'candidate-photos';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — see scripts/.env.migration.example');
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: existing, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    console.error('Failed to list buckets:', listErr.message);
    process.exit(1);
  }

  if (existing?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists — nothing to do.`);
    return;
  }

  const { error: createErr } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '3MB',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (createErr) {
    console.error('Failed to create bucket:', createErr.message);
    process.exit(1);
  }
  console.log(`Created public bucket "${BUCKET}" (3MB cap, jpeg/png/webp only).`);
}

main();
