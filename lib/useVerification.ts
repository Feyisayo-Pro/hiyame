import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ==========================================
// VERIFICATION STATE TYPES
// ==========================================
export interface VerificationState {
  identityVerified: boolean;
  videoIntroUploaded: boolean;
  assessmentCompleted: boolean;
  employerReviewSecured: boolean;
}

export interface VerificationContextValue extends VerificationState {
  toggleIdentity: () => void;
  toggleVideoIntro: () => void;
  toggleAssessment: () => void;
  toggleEmployerReview: () => void;
  completedCount: number;
  totalCount: number;
  isFullyVerified: boolean;
}

const INITIAL_STATE: VerificationState = {
  identityVerified: false,
  videoIntroUploaded: false,
  assessmentCompleted: false,
  employerReviewSecured: false,
};

// ==========================================
// CONTEXT
// ==========================================
const VerificationContext = createContext<VerificationContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================
export function VerificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VerificationState>(INITIAL_STATE);

  const toggleIdentity = useCallback(() => {
    setState((prev) => ({ ...prev, identityVerified: !prev.identityVerified }));
  }, []);

  const toggleVideoIntro = useCallback(() => {
    setState((prev) => ({ ...prev, videoIntroUploaded: !prev.videoIntroUploaded }));
  }, []);

  const toggleAssessment = useCallback(() => {
    setState((prev) => ({ ...prev, assessmentCompleted: !prev.assessmentCompleted }));
  }, []);

  const toggleEmployerReview = useCallback(() => {
    setState((prev) => ({ ...prev, employerReviewSecured: !prev.employerReviewSecured }));
  }, []);

  const completedCount = [
    state.identityVerified,
    state.videoIntroUploaded,
    state.assessmentCompleted,
    state.employerReviewSecured,
  ].filter(Boolean).length;

  const value: VerificationContextValue = {
    ...state,
    toggleIdentity,
    toggleVideoIntro,
    toggleAssessment,
    toggleEmployerReview,
    completedCount,
    totalCount: 4,
    isFullyVerified: completedCount === 4,
  };

  return React.createElement(VerificationContext.Provider, { value }, children);
}

// ==========================================
// HOOK
// ==========================================
export function useVerification(): VerificationContextValue {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
