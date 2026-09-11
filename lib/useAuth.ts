import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'candidate' | 'company' | null;

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  role: UserRole;
  /** The signed-in company's own id, once `role === 'company'` resolves. */
  companyId: string | null;
  /** The signed-in candidate's own id, once `role === 'candidate'` resolves. */
  candidateId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Resolve which persona a signed-in user is by checking which table has a row
// for them — RLS already scopes both queries to `auth_user_id = auth.uid()`, so
// this works fine with the anon-key client and never leaks another user's row.
async function resolveRole(userId: string): Promise<{ role: UserRole; companyId: string | null; candidateId: string | null }> {
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (candidate) {
    return { role: 'candidate', companyId: null, candidateId: candidate.id };
  }

  const { data: companyUser } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (companyUser) {
    return { role: 'company', companyId: companyUser.company_id, candidateId: null };
  }

  // Authenticated but no profile row yet — e.g. mid-signup, or an invited user
  // who hasn't completed the claim flow. Callers treat this as "needs onboarding".
  return { role: null, companyId: null, candidateId: null };
}

// This project requires email confirmation, so supabase.auth.signUp() often
// returns no session at all — the profile row can't be created right then (RLS
// needs auth.uid(), which doesn't exist yet). Instead, the signup screens stash
// the collected profile fields in signUp's `options.data` (persisted on the user
// record immediately, before confirmation). The first time a real session shows
// up here — whether that's seconds later or after the user confirms on a
// different day/device — this finishes creating the profile row from that
// stashed metadata, then re-resolves the role. Makes signup "self-healing"
// regardless of when/where confirmation happens.
async function completePendingSignup(userId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const meta = userData.user?.user_metadata as Record<string, unknown> | undefined;
  if (!meta?.pending_signup) return;

  if (meta.pending_signup === 'candidate') {
    await supabase.from('candidates').insert({
      auth_user_id: userId,
      full_name: meta.full_name,
      email: userData.user!.email,
      skill_tags: meta.core_skills ?? [],
      rate_preferred: meta.target_min_rate ?? null,
    });
  } else if (meta.pending_signup === 'company') {
    const { data: newCompanyId } = await supabase.rpc('create_company_and_claim', {
      company_data: {
        legal_name: meta.legal_name,
        trading_name: meta.trading_name,
        industry: meta.industry,
        size_range: meta.size_range,
        hq_location: meta.hq_location,
        website_url: meta.website_url,
        description: meta.description,
      },
    });
    // create_company_and_claim only inserts the columns it whitelists (deliberately,
    // for security) — plan_tier isn't one of them, so the plan chosen at signup is
    // applied as a follow-up update once the row (and this session's company_users
    // membership) exists. RLS's companies_update_own already covers this: no new
    // grant/migration needed.
    if (newCompanyId && typeof meta.plan_tier === 'string') {
      await supabase.from('companies').update({ plan_tier: meta.plan_tier }).eq('id', newCompanyId);
    }
  }
  // Clear the flag so a later sign-in never re-runs this (insert would just fail
  // harmlessly on the unique auth_user_id constraint anyway, but this is cleaner).
  await supabase.auth.updateUser({ data: { pending_signup: null } });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function applySession(next: Session | null) {
      setSession(next);
      if (!next) {
        setRole(null);
        setCompanyId(null);
        setCandidateId(null);
        setLoading(false);
        return;
      }
      let resolved = await resolveRole(next.user.id);
      if (resolved.role === null) {
        await completePendingSignup(next.user.id);
        if (cancelled) return;
        resolved = await resolveRole(next.user.id);
      }
      if (cancelled) return;
      setRole(resolved.role);
      setCompanyId(resolved.companyId);
      setCandidateId(resolved.candidateId);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setLoading(true);
      applySession(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = { session, loading, role, companyId, candidateId, signOut };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
