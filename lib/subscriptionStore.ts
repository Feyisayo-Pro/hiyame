import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ── Tier Definitions ──
export type SubscriptionTier = 'scout' | 'hire' | 'scale';

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
  scout: {
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
  hire: {
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
  scale: {
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

// ── Context ──
export interface SubscriptionState {
  tier: SubscriptionTier;
  config: TierConfig;
  trialDaysLeft: number;
  swipesToday: number;
  canSwipe: boolean;
  recordSwipe: () => boolean;  // returns false if capped
  setTier: (t: SubscriptionTier) => void;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>('scale');
  const [swipesToday, setSwipesToday] = useState(0);
  const [trialDaysLeft] = useState(14);

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

  const value: SubscriptionState = {
    tier, config, trialDaysLeft, swipesToday, canSwipe, recordSwipe, setTier,
  };

  return React.createElement(SubscriptionContext.Provider, { value }, children);
}

export function useSubscription(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
