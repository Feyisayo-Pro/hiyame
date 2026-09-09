#!/usr/bin/env -S npx tsx
/// <reference types="node" />
// This is a standalone Node script, not part of the Expo/RN app bundle — the repo's
// tsconfig (extends expo/tsconfig.base) doesn't otherwise pull in Node's ambient
// types, hence the explicit reference above.
//
// One-time migration: Strivo's Firebase export (clients/candidates/jobs) -> Hiyame's
// Supabase schema (companies/candidates/roles). See the migration plan at
// .claude/plans/enchanted-spinning-quasar.md for the full design rationale — this
// implements it exactly. Run with `npm run migrate:strivo` (dry run by default;
// pass --apply to actually write).
//
// Source data: scripts/firebase-export-data/*.json (copy of the exported Firestore
// collections — see scripts/README-migration.md for how that export was produced).
//
// SECURITY: --apply requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (or a gitignored .env.migration file next to this script). The
// service-role key must NEVER be prefixed EXPO_PUBLIC_ and must never be added to
// the app's own .env — it belongs only here, in an operator's hands, per the
// architecture doc's secrets requirement (§8).

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'firebase-export-data');
const REPORT_PATH = join(__dirname, 'migration-report.json');

// ── Minimal .env.migration loader (no new dependency for one script) ──
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

// ── Types (raw Firestore shapes, only the fields we read) ──
interface RawClient {
  id: string; added?: string; manager?: string; industry?: string;
  name: string; notes?: string; status: string; website?: string;
}
interface RawCandidate {
  id: string; firstName?: string; lastName?: string; name?: string; phone?: string;
  email?: string; cvStorageUrl?: string; cvLink?: string; cvRedactedText?: string;
  clientId?: string; jobId?: string; expectedSalary?: string; currentSalary?: string;
  location?: string; industry?: string; company?: string; currentCompanyName?: string;
  currentRole?: string; experience?: number; education?: string; skills?: string;
  added?: string; status?: string; linkedin?: string; noticePeriod?: string;
}
interface RawJob {
  id: string; role: string; status: string; location?: string; sector?: string;
  clientName?: string; salary?: string; isPublished?: boolean; priority?: string;
  added?: string; contractType?: string; clientId: string;
  websiteDescription?: string; description?: string; manager?: string;
}

// ── Output row shapes (match supabase/migrations/20260909132855_init_schema.sql) ──
interface CompanyRow {
  external_source: string; external_id: string; legal_name: string; trading_name: string;
  industry: string | null; website_url: string | null; plan_tier: string;
  created_at: string; import_meta: Record<string, unknown>;
}
interface CandidateRow {
  external_source: string; external_id: string; full_name: string;
  email: string | null; phone: string | null; skill_tags: string[];
  experience_level: string | null; location: string | null;
  rate_min: number | null; rate_preferred: number | null; rate_max: number | null;
  verified_badge_status: string; inactive_since: string | null; created_at: string;
  import_meta: Record<string, unknown>;
}
interface RoleRow {
  external_source: string; external_id: string; company_id: string; tier: string;
  title: string; required_skills: { must_have: string[]; nice_to_have: string[] };
  location_type: string | null; location_city: string | null; location_country: string | null;
  contract_length: string | null; rate_min: number | null; rate_max: number | null;
  rate_type: string; visibility_description: string; status: string; created_at: string;
  import_meta: Record<string, unknown>;
}

// ── Shared money-range parser ──
// Handles: "650,000" (single), "300k"/"600k" (shorthand), "1,500,000 - 1,800,000"
// (range), "2, 000,000" (stray space), "open"/"Varied pay"/"" (unparseable -> null).
function parseMoneyRange(raw: string | undefined | null): { min: number | null; max: number | null; unparsed: boolean } {
  if (!raw || typeof raw !== 'string') return { min: null, max: null, unparsed: false };
  let s = raw.trim();
  if (!s) return { min: null, max: null, unparsed: false };
  s = s.replace(/[₦$]/g, '').replace(/\b(NGN|USD|naira)\b/gi, '').trim();
  if (/^(open|negotiable|varied\s*pay|varied|tbd|n\/a)$/i.test(s)) {
    return { min: null, max: null, unparsed: true };
  }
  const parts = s.split(/\s*(?:-|–|to)\s*/i).map((p) => p.trim()).filter(Boolean);

  const parseOne = (p: string): number | null => {
    let cleaned = p.replace(/,/g, '').replace(/\s+/g, '');
    let multiplier = 1;
    if (/k$/i.test(cleaned)) { multiplier = 1_000; cleaned = cleaned.replace(/k$/i, ''); }
    else if (/m$/i.test(cleaned)) { multiplier = 1_000_000; cleaned = cleaned.replace(/m$/i, ''); }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n * multiplier : null;
  };

  if (parts.length === 1) {
    const v = parseOne(parts[0]);
    return v === null ? { min: null, max: null, unparsed: true } : { min: v, max: v, unparsed: false };
  }
  if (parts.length >= 2) {
    const a = parseOne(parts[0]);
    const b = parseOne(parts[1]);
    if (a === null || b === null) return { min: null, max: null, unparsed: true };
    return { min: Math.min(a, b), max: Math.max(a, b), unparsed: false };
  }
  return { min: null, max: null, unparsed: true };
}

// Some source `added` timestamps are malformed/unparseable — fall back to "now"
// rather than letting Date#toISOString throw and abort the whole run.
function safeIsoDate(raw: string | undefined): string {
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function bucketExperience(years: number | undefined | null): string | null {
  if (years === undefined || years === null) return null;
  const n = Number(years);
  if (!Number.isFinite(n)) return null;
  if (n <= 1) return 'junior';
  if (n <= 5) return 'mid';
  if (n <= 9) return 'senior';
  return 'lead';
}

function parseJobLocation(raw: string | undefined): { type: string | null; city: string | null; country: string | null } {
  if (!raw || !raw.trim()) return { type: null, city: null, country: null };
  const s = raw.trim().replace(/\.$/, '');
  if (/remote/i.test(s)) return { type: 'remote', city: null, country: null };
  if (s.includes(',')) {
    const idx = s.lastIndexOf(',');
    return { type: 'on_site', city: s.slice(0, idx).trim(), country: s.slice(idx + 1).trim() };
  }
  return { type: 'on_site', city: s, country: 'Nigeria' };
}

// ── Transforms ──
function transformCompany(client: RawClient): CompanyRow {
  return {
    external_source: 'strivo',
    external_id: client.id,
    legal_name: client.name,
    trading_name: client.name,
    industry: client.industry?.trim() || null,
    website_url: client.website?.trim() || null,
    plan_tier: 'pilot',
    created_at: safeIsoDate(client.added),
    import_meta: {
      manager: client.manager ?? null,
      notes: client.notes ?? null,
      status_raw: client.status,
      industry_raw: client.industry ?? null,
    },
  };
}

function transformCandidate(cand: RawCandidate): { row: CandidateRow | null; reason?: string } {
  const fullName = cand.name?.trim() || [cand.firstName, cand.lastName].filter(Boolean).join(' ').trim();
  const email = cand.email?.trim() ? cand.email.trim().toLowerCase() : null;
  const phone = cand.phone?.trim() || null;
  if (!email && !phone) return { row: null, reason: 'uncontactable (no email or phone)' };

  const skillTags = (cand.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const salary = parseMoneyRange(cand.expectedSalary);
  const isInactive = cand.status === 'inactive' || cand.status === 'placed';

  return {
    row: {
      external_source: 'strivo',
      external_id: cand.id,
      full_name: fullName || 'Unnamed Candidate',
      email,
      phone,
      skill_tags: skillTags,
      experience_level: bucketExperience(cand.experience),
      location: cand.location?.trim() || null,
      rate_min: salary.min,
      rate_max: salary.max,
      rate_preferred: salary.min !== null && salary.max !== null ? (salary.min + salary.max) / 2 : salary.min,
      verified_badge_status: 'unverified',
      inactive_since: isInactive ? new Date().toISOString() : null,
      created_at: safeIsoDate(cand.added),
      import_meta: {
        strivo_client_id: cand.clientId ?? null,
        source_company_id: null, // filled in after companies are inserted
        strivo_job_id: cand.jobId ?? null,
        current_salary_raw: cand.currentSalary ?? null,
        expected_salary_raw: cand.expectedSalary ?? null,
        current_company_name: cand.currentCompanyName ?? cand.company ?? null,
        current_role: cand.currentRole ?? null,
        education: cand.education ?? null,
        cv_storage_url: cand.cvStorageUrl ?? null,
        cv_link: cand.cvLink ?? null,
        cv_redacted_text: cand.cvRedactedText ?? null,
        linkedin: cand.linkedin ?? null,
        notice_period: cand.noticePeriod ?? null,
        strivo_status: cand.status ?? null,
        industry_raw: cand.industry ?? null,
        duplicate_source_ids: [] as string[],
      },
    },
  };
}

function dedupeByEmail(rows: CandidateRow[]): { winners: CandidateRow[]; dupeGroups: number } {
  const groups = new Map<string, CandidateRow[]>();
  const noEmail: CandidateRow[] = [];
  for (const r of rows) {
    if (!r.email) { noEmail.push(r); continue; }
    if (!groups.has(r.email)) groups.set(r.email, []);
    groups.get(r.email)!.push(r);
  }
  let dupeGroups = 0;
  const winners: CandidateRow[] = [...noEmail];
  for (const group of groups.values()) {
    if (group.length === 1) { winners.push(group[0]); continue; }
    dupeGroups++;
    const score = (x: CandidateRow) => [
      x.import_meta.cv_redacted_text ? 1 : 0,
      x.phone ? 1 : 0,
      x.skill_tags.length > 0 ? 1 : 0,
    ];
    const sorted = [...group].sort((a, b) => {
      const sa = score(a), sb = score(b);
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const winner = sorted[0];
    winner.import_meta.duplicate_source_ids = sorted.slice(1).map((x) => x.external_id);
    winners.push(winner);
  }
  return { winners, dupeGroups };
}

function transformRole(job: RawJob, companyIdByExternalId: Map<string, string>): { row: RoleRow | null; reason?: string; salaryUnparsed?: boolean } {
  const companyId = companyIdByExternalId.get(job.clientId);
  if (!companyId) return { row: null, reason: `unresolved clientId "${job.clientId}"` };

  const tier = job.contractType === 'Permanent' ? 'corporate'
    : job.contractType === 'Contract' || job.contractType === 'Interim' ? 'short_term'
    : null;

  const loc = parseJobLocation(job.location);
  const salary = parseMoneyRange(job.salary);

  let status: string;
  if (job.status === 'open') status = job.isPublished === true ? 'matching' : 'draft';
  else if (job.status === 'closed') status = 'withdrawn';
  else status = 'draft';

  return {
    salaryUnparsed: salary.unparsed,
    row: {
      external_source: 'strivo',
      external_id: job.id,
      company_id: companyId,
      tier: tier ?? 'short_term',
      title: job.role || 'Untitled Role',
      required_skills: { must_have: [], nice_to_have: [] },
      location_type: loc.type,
      location_city: loc.city,
      location_country: loc.country,
      contract_length: job.contractType ?? null,
      rate_min: salary.min,
      rate_max: salary.max,
      rate_type: 'monthly',
      visibility_description: job.websiteDescription || job.description || '',
      status,
      created_at: safeIsoDate(job.added),
      import_meta: {
        manager: job.manager ?? null,
        sector: job.sector ?? null,
        client_name: job.clientName ?? null,
        priority: job.priority ?? null,
        contract_type_raw: job.contractType ?? null,
        description_raw: job.description ?? null,
        is_published_raw: job.isPublished ?? null,
        status_raw: job.status ?? null,
        salary_raw: job.salary ?? null,
        location_raw: job.location ?? null,
      },
    },
    reason: tier === null ? `unrecognized contractType "${job.contractType}" — defaulted to short_term` : undefined,
  };
}

// ── Main ──
async function main() {
  const apply = process.argv.includes('--apply');

  const clientsPath = join(DATA_DIR, 'firestore_clients.json');
  const candidatesPath = join(DATA_DIR, 'firestore_candidates.json');
  const jobsPath = join(DATA_DIR, 'firestore_jobs.json');
  for (const p of [clientsPath, candidatesPath, jobsPath]) {
    if (!existsSync(p)) {
      console.error(`Missing source file: ${p}\nCopy the exported Firestore JSON into scripts/firebase-export-data/ first.`);
      process.exit(1);
    }
  }

  const clients: RawClient[] = JSON.parse(readFileSync(clientsPath, 'utf8'));
  const candidates: RawCandidate[] = JSON.parse(readFileSync(candidatesPath, 'utf8'));
  const jobs: RawJob[] = JSON.parse(readFileSync(jobsPath, 'utf8'));

  // ── Companies ──
  const activeClients = clients.filter((c) => c.status === 'active');
  const companyRows = activeClients.map(transformCompany);
  const companyIdByExternalId = new Map<string, string>(); // populated with real ids only in --apply mode

  // ── Candidates ──
  const candidateResults = candidates.map(transformCandidate);
  const excludedCandidates = candidateResults.filter((r) => r.row === null).length;
  const rawCandidateRows = candidateResults.filter((r): r is { row: CandidateRow } => r.row !== null).map((r) => r.row);
  const { winners: candidateRows, dupeGroups } = dedupeByEmail(rawCandidateRows);

  // link candidates to companies where the client was migrated
  const activeClientExternalIds = new Set(activeClients.map((c) => c.id));
  for (const row of candidateRows) {
    const cid = row.import_meta.strivo_client_id as string | null;
    row.import_meta.source_company_id = cid && activeClientExternalIds.has(cid) ? cid : null;
  }
  const candidatesLinkedToCompany = candidateRows.filter((r) => r.import_meta.source_company_id !== null).length;

  // ── Roles (needs a company id map; in dry-run we key by external_id placeholder) ──
  for (const c of activeClients) companyIdByExternalId.set(c.id, `<pending:${c.id}>`);
  const roleResults = jobs.map((j) => transformRole(j, companyIdByExternalId));
  const skippedRoles = roleResults.filter((r) => r.row === null);
  const roleRows = roleResults.filter((r): r is { row: RoleRow; reason?: string; salaryUnparsed?: boolean } => r.row !== null);
  const rolesWithUnparsedSalary = roleRows.filter((r) => r.salaryUnparsed).map((r) => r.row!.external_id);
  const rolesWithFallbackTier = roleRows.filter((r) => r.reason).map((r) => ({ id: r.row!.external_id, reason: r.reason }));

  // ── Report ──
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    companies: {
      totalClients: clients.length,
      activeClients: activeClients.length,
      excludedNonActive: clients.length - activeClients.length,
    },
    candidates: {
      totalSource: candidates.length,
      excludedUncontactable: excludedCandidates,
      duplicateEmailGroupsResolved: dupeGroups,
      finalCount: candidateRows.length,
      linkedToMigratedCompany: candidatesLinkedToCompany,
    },
    roles: {
      totalSource: jobs.length,
      skipped: skippedRoles.map((r) => r.reason),
      finalCount: roleRows.length,
      unparsedSalaries: rolesWithUnparsedSalary,
      fallbackTierAssignments: rolesWithFallbackTier,
    },
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${REPORT_PATH}`);

  if (process.argv.includes('--sample')) {
    console.log('\n── Sample transformed rows (for manual spot-checking) ──');
    console.log('\ncompany:', JSON.stringify(companyRows[0], null, 2));
    console.log('\ncandidate:', JSON.stringify(candidateRows[0], null, 2));
    console.log('\nrole:', JSON.stringify(roleRows[0].row, null, 2));
  }

  if (!apply) {
    console.log('\nDry run only — no data written. Re-run with --apply once SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (see .env.migration). Pass --sample to preview transformed rows.');
    return;
  }

  // ── Apply mode ──
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('\n--apply requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment or scripts/.env.migration (gitignored).');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('\nInserting companies...');
  const { data: insertedCompanies, error: companyErr } = await supabase
    .from('companies')
    .upsert(companyRows, { onConflict: 'external_source,external_id' })
    .select('id, external_id');
  if (companyErr) throw companyErr;
  for (const c of insertedCompanies!) companyIdByExternalId.set(c.external_id, c.id);

  // Re-resolve candidate source_company_id to real uuids now that companies exist
  for (const row of candidateRows) {
    const cid = row.import_meta.strivo_client_id as string | null;
    row.import_meta.source_company_id = cid ? companyIdByExternalId.get(cid) ?? null : null;
  }

  console.log('Inserting candidates...');
  const { error: candErr } = await supabase
    .from('candidates')
    .upsert(candidateRows, { onConflict: 'external_source,external_id' });
  if (candErr) throw candErr;

  console.log('Inserting roles...');
  const finalRoleRows = jobs
    .map((j) => transformRole(j, companyIdByExternalId))
    .filter((r): r is { row: RoleRow } => r.row !== null)
    .map((r) => r.row);
  const { error: roleErr } = await supabase
    .from('roles')
    .upsert(finalRoleRows, { onConflict: 'external_source,external_id' });
  if (roleErr) throw roleErr;

  console.log(`\nDone. Inserted ${insertedCompanies!.length} companies, ${candidateRows.length} candidates, ${finalRoleRows.length} roles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
