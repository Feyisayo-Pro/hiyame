// Provisions one throwaway candidate account and one throwaway company
// account before the suite runs, via the Supabase service role — the same
// elevated-privilege pattern api/*.ts uses, just invoked from a local script
// instead of a serverless function. Using disposable accounts (rather than
// the session's long-lived demo logins) means tests can freely create roles,
// edit profile fields, etc. without leaving the demo accounts in a
// surprising state for whoever explores them next — and a run that dies
// mid-suite before teardown just leaves one identifiable extra account
// behind (email prefixed e2e-), not corrupted shared state.
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './testEnv';

const STATE_PATH = join(__dirname, '.auth', 'accounts.json');
const PASSWORD = 'HiyameE2E2026!';

export interface E2EAccounts {
  candidate: { email: string; password: string; authUserId: string; candidateId: string };
  company: { email: string; password: string; authUserId: string; companyId: string };
}

export default async function globalSetup() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const runId = Date.now();

  // ── Candidate ──
  const candidateEmail = `e2e-candidate-${runId}@hiyame-test.invalid`;
  const { data: candidateAuth, error: candidateAuthErr } = await admin.auth.admin.createUser({
    email: candidateEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (candidateAuthErr || !candidateAuth.user) {
    throw new Error(`E2E setup: failed to create candidate auth user — ${candidateAuthErr?.message}`);
  }
  const { data: candidateRow, error: candidateRowErr } = await admin
    .from('candidates')
    .insert({
      auth_user_id: candidateAuth.user.id,
      full_name: 'E2E Test Candidate',
      email: candidateEmail,
      skill_tags: ['e2e-test'],
      experience_level: 'mid',
    })
    .select('id')
    .single();
  if (candidateRowErr || !candidateRow) {
    throw new Error(`E2E setup: failed to create candidates row — ${candidateRowErr?.message}`);
  }

  // ── Company ──
  const companyEmail = `e2e-company-${runId}@hiyame-test.invalid`;
  const { data: companyAuth, error: companyAuthErr } = await admin.auth.admin.createUser({
    email: companyEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (companyAuthErr || !companyAuth.user) {
    throw new Error(`E2E setup: failed to create company auth user — ${companyAuthErr?.message}`);
  }
  const { data: companyRow, error: companyRowErr } = await admin
    .from('companies')
    .insert({ legal_name: 'E2E Test Co', trading_name: 'E2E Test Co', plan_tier: 'enterprise' })
    .select('id')
    .single();
  if (companyRowErr || !companyRow) {
    throw new Error(`E2E setup: failed to create companies row — ${companyRowErr?.message}`);
  }
  const { error: companyUserErr } = await admin
    .from('company_users')
    .insert({ company_id: companyRow.id, auth_user_id: companyAuth.user.id, email: companyEmail, role: 'hiring_manager' });
  if (companyUserErr) {
    throw new Error(`E2E setup: failed to create company_users row — ${companyUserErr.message}`);
  }

  const accounts: E2EAccounts = {
    candidate: { email: candidateEmail, password: PASSWORD, authUserId: candidateAuth.user.id, candidateId: candidateRow.id },
    company: { email: companyEmail, password: PASSWORD, authUserId: companyAuth.user.id, companyId: companyRow.id },
  };

  mkdirSync(join(__dirname, '.auth'), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(accounts, null, 2));
}
