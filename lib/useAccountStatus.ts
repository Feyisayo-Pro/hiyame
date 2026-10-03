import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AccountStatus = 'pending' | 'approved' | 'rejected';

// Lightweight account-vetting gate (2026-10-02, ahead of the real CRM
// integration) — shared by every company/candidate screen that needs to
// block on admin approval (see supabase/migrations/20261002090000_
// account_vetting_status.sql and api/admin-review.ts). Returns null while
// loading, so a screen doesn't flash blocked then unblocked for an
// already-approved account on every visit. A missing `status` column
// (migration not yet applied) degrades to 'approved' — infrastructure
// that isn't live yet must never block a real account from working.
export function useAccountStatus(table: 'companies' | 'candidates', id: string | null): AccountStatus | null {
  const [status, setStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from(table).select('status').eq('id', id).maybeSingle().then(({ data, error }) => {
      setStatus(error ? 'approved' : ((data?.status as AccountStatus) ?? 'approved'));
    });
  }, [table, id]);

  return status;
}
