import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ==========================================
// CANDIDATE PROFILE TYPES
// ==========================================
export interface CandidateProfile {
  fullName: string;
  professionalTitle: string;
  coreSkills: string[];
  targetMinRate: number;
  photos: string[];  // URIs of uploaded photos (max 6)
  profileCompleted: boolean;
}

export interface CandidateProfileContextValue extends CandidateProfile {
  setProfile: (data: Omit<CandidateProfile, 'profileCompleted'>) => void;
  setPhotos: (photos: string[]) => void;
  clearProfile: () => void;
}

const INITIAL_PROFILE: CandidateProfile = {
  fullName: '',
  professionalTitle: '',
  coreSkills: [],
  targetMinRate: 0,
  photos: [],
  profileCompleted: false,
};

// ==========================================
// CONTEXT
// ==========================================
const CandidateProfileContext = createContext<CandidateProfileContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================
export function CandidateProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CandidateProfile>(INITIAL_PROFILE);

  const setProfile = useCallback((data: Omit<CandidateProfile, 'profileCompleted'>) => {
    setProfileState({
      ...data,
      profileCompleted: true,
    });
  }, []);

  const setPhotos = useCallback((photos: string[]) => {
    setProfileState(prev => ({ ...prev, photos: photos.slice(0, 6) }));
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(INITIAL_PROFILE);
  }, []);

  const value: CandidateProfileContextValue = {
    ...profile,
    setProfile,
    setPhotos,
    clearProfile,
  };

  return React.createElement(CandidateProfileContext.Provider, { value }, children);
}

// ==========================================
// HOOK
// ==========================================
export function useCandidateProfile(): CandidateProfileContextValue {
  const context = useContext(CandidateProfileContext);
  if (!context) {
    throw new Error('useCandidateProfile must be used within a CandidateProfileProvider');
  }
  return context;
}
