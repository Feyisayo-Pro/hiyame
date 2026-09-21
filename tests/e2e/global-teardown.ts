// Tears down the throwaway accounts global-setup created. Deliberately goes
// through the real api/delete-account endpoint (sign in as the test user,
// POST the access token) rather than deleting rows directly with the
// service role — that's the same code path a real user's "Delete account"
// button hits, so every E2E run is also a live regression check on
// deletion + its Storage cleanup, not just on the features the specs
// exercise directly. Falls back to a direct service-role delete only if
// sign-in itself fails, so a broken sign-in doesn't strand test accounts.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, E2E_BASE_URL } from './testEnv';
import type { E2EAccounts } from './global-setup';

const STATE_PATH = join(__dirname, '.auth', 'accounts.json');

async function deleteViaApi(email: string, password: string): Promise<boolean> {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;

  const res = await fetch(`${E2E_BASE_URL}/api/delete-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  return res.ok;
}

async function deleteViaServiceRole(admin: SupabaseClient, authUserId: string) {
  // Mirrors api/delete-account.ts's own ordering: app-data rows first (FK
  // cascades take verification_records/match_scores/introductions/roles
  // with them), auth.users last — deleting auth.users first would fail the
  // no-cascade auth_user_id foreign key on candidates/companies.
  await admin.from('candidates').delete().eq('auth_user_id', authUserId);
  const { data: companyUser } = await admin
    .from('company_users')
    .select('company_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle<{ company_id: string }>();
  if (companyUser) {
    await admin.from('companies').delete().eq('id', companyUser.company_id);
  }
  await admin.auth.admin.deleteUser(authUserId);
}

export default async function globalTeardown() {
  if (!existsSync(STATE_PATH)) return;
  const accounts: E2EAccounts = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  for (const [label, account] of [
    ['candidate', accounts.candidate] as const,
    ['company', accounts.company] as const,
  ]) {
    const ok = await deleteViaApi(account.email, account.password);
    if (!ok) {
      console.warn(`[e2e teardown] delete-account API failed for ${label} test account — falling back to a direct service-role delete.`);
      await deleteViaServiceRole(admin, account.authUserId);
    }
  }

  rmSync(STATE_PATH, { force: true });
}
