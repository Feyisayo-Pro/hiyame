import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ── Tier Definitions ──
// Matches the architecture doc's companies.plan_tier enum exactly
// (pilot|starter|growth|enterprise). 'pilot' is new — a free, more limited
// trial tier below 'starter' — the other three are a straight rename of the
// former scout/hire/scale, same features/pricing, unchanged.
export type SubscriptionTier = 'pilot' | 'starter' | 'growth' | 'enterprise';

export interface TierConfig {
  name: string;
  price: number;
  swipesPerDay: number;        // -1 = unlimited
  activeMatchesCap: number;    // -1 = unlimited
  activeConversationsCap: number;
  advancedFilters: boolean;    // Field + Rate filters
  reliabilityVisible: boolean;
  atsIntegration: boolean;
  savedSearches: boolean;
  hiringAnalytics: boolean;
  teamSeatCap: number;         // -1 = unlimited
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  pilot: {
    name: 'Pilot',
    price: 0,
    swipesPerDay: 3,
    activeMatchesCap: 1,
    activeConversationsCap: 1,
    advancedFilters: false,
    reliabilityVisible: false,
    atsIntegration: false,
    savedSearches: false,
    hiringAnalytics: false,
    teamSeatCap: 1,
  },
  starter: {
    name: 'Starter',
    price: 0,
    swipesPerDay: 10,
    activeMatchesCap: 3,
    activeConversationsCap: 3,
    advancedFilters: false,
    reliabilityVisible: false,
    atsIntegration: false,
    savedSearches: false,
    hiringAnalytics: false,
    teamSeatCap: 1,
  },
  growth: {
    name: 'Growth',
    price: 250000,
    swipesPerDay: 50,
    activeMatchesCap: 15,
    activeConversationsCap: 25,
    advancedFilters: true,
    reliabilityVisible: true,
    atsIntegration: false,
    savedSearches: false,
    hiringAnalytics: false,
    teamSeatCap: 3,
  },
  enterprise: {
    name: 'Enterprise',
    price: 650000,
    swipesPerDay: -1,
    activeMatchesCap: -1,
    activeConversationsCap: -1,
    advancedFilters: true,
    reliabilityVisible: true,
    atsIntegration: true,
    savedSearches: true,
    hiringAnalytics: true,
    teamSeatCap: -1,
  },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
}

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  { id: 'tm-1', name: 'Ada Eze', email: 'ada@vertexglobal.com', role: 'Owner', avatarInitials: 'AE' },
  { id: 'tm-2', name: 'Chidi Okafor', email: 'chidi@vertexglobal.com', role: 'Hiring Manager', avatarInitials: 'CO' },
  { id: 'tm-3', name: 'Bisi Adeyemi', email: 'bisi@vertexglobal.com', role: 'Hiring Manager', avatarInitials: 'BA' },
];

// ── Context ──
export interface SubscriptionState {
  tier: SubscriptionTier;
  config: TierConfig;
  trialDaysLeft: number;
  swipesToday: number;
  canSwipe: boolean;
  recordSwipe: () => boolean;  // returns false if capped
  setTier: (t: SubscriptionTier) => void;

  // Team seats (per-tier cap; Growth = 3, Pilot/Starter = 1, Enterprise = unlimited)
  teamMembers: TeamMember[];
  canInviteTeamMember: boolean;
  addTeamMember: (member: Omit<TeamMember, 'id'>) => boolean; // returns false if capped
  removeTeamMember: (id: string) => void;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>('enterprise');
  const [swipesToday, setSwipesToday] = useState(0);
  const [trialDaysLeft] = useState(14);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);

  const config = TIER_CONFIGS[tier];
  const canSwipe = config.swipesPerDay === -1 || swipesToday < config.swipesPerDay;

  const recordSwipe = useCallback((): boolean => {
    if (config.swipesPerDay !== -1 && swipesToday >= config.swipesPerDay) return false;
    setSwipesToday((n) => n + 1);
    return true;
  }, [config.swipesPerDay, swipesToday]);

  const setTier = useCallback((t: SubscriptionTier) => {
    setTierState(t);
    setSwipesToday(0);
  }, []);

  const canInviteTeamMember = config.teamSeatCap === -1 || teamMembers.length < config.teamSeatCap;

  const addTeamMember = useCallback((member: Omit<TeamMember, 'id'>): boolean => {
    if (config.teamSeatCap !== -1 && teamMembers.length >= config.teamSeatCap) return false;
    setTeamMembers((prev) => [...prev, { ...member, id: `tm-${Date.now()}` }]);
    return true;
  }, [config.teamSeatCap, teamMembers.length]);

  const removeTeamMember = useCallback((id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value: SubscriptionState = {
    tier, config, trialDaysLeft, swipesToday, canSwipe, recordSwipe, setTier,
    teamMembers, canInviteTeamMember, addTeamMember, removeTeamMember,
  };

  return React.createElement(SubscriptionContext.Provider, { value }, children);
}

export function useSubscription(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
