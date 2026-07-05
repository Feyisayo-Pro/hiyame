import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ==========================================
// APPLICATION PIPELINE TYPES
// ==========================================

export interface CandidateApplication {
  id: string;
  roleId: string;
  roleTitle: string;
  roleTier: 'corporate' | 'short_term' | 'gig';
  candidateName: string;
  candidateTitle: string;
  coreSkills: string[];
  targetMinRate: number;
  verifiedCount: number;
  totalCount: number;
  /** Per-component verification booleans for the review modal */
  identityVerified: boolean;
  videoIntroUploaded: boolean;
  assessmentCompleted: boolean;
  employerReviewSecured: boolean;
  appliedAt: string;
}

/** Fields the caller must supply — id and appliedAt are auto-generated */
export type ApplyPayload = Omit<CandidateApplication, 'id' | 'appliedAt'>;

export interface ApplicationContextValue {
  appliedJobs: Set<string>;
  companyAlerts: CandidateApplication[];
  applyToRole: (application: ApplyPayload) => void;
  hasApplied: (roleId: string) => boolean;
  /** Gig waitlist role IDs */
  waitlistedGigs: Set<string>;
  joinGigWaitlist: (roleId: string) => void;
  isOnWaitlist: (roleId: string) => boolean;
}

// ==========================================
// CONTEXT
// ==========================================
const ApplicationContext = createContext<ApplicationContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================
export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [companyAlerts, setCompanyAlerts] = useState<CandidateApplication[]>([]);
  const [waitlistedGigs, setWaitlistedGigs] = useState<Set<string>>(new Set());

  const applyToRole = useCallback(
    (app: ApplyPayload) => {
      if (appliedJobs.has(app.roleId)) return;

      const fullApp: CandidateApplication = {
        ...app,
        id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        appliedAt: new Date().toISOString(),
      };

      setAppliedJobs((prev) => new Set(prev).add(app.roleId));
      setCompanyAlerts((prev) => [fullApp, ...prev]);
    },
    [appliedJobs],
  );

  const hasApplied = useCallback(
    (roleId: string) => appliedJobs.has(roleId),
    [appliedJobs],
  );

  const joinGigWaitlist = useCallback(
    (roleId: string) => {
      setWaitlistedGigs((prev) => new Set(prev).add(roleId));
    },
    [],
  );

  const isOnWaitlist = useCallback(
    (roleId: string) => waitlistedGigs.has(roleId),
    [waitlistedGigs],
  );

  const value: ApplicationContextValue = {
    appliedJobs,
    companyAlerts,
    applyToRole,
    hasApplied,
    waitlistedGigs,
    joinGigWaitlist,
    isOnWaitlist,
  };

  return React.createElement(ApplicationContext.Provider, { value }, children);
}

// ==========================================
// HOOK
// ==========================================
export function useApplicationStore(): ApplicationContextValue {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplicationStore must be used within an ApplicationProvider');
  }
  return context;
}
