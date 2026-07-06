import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import React from 'react';

// ── Types ──
export interface SwipeCandidate {
  id: string;
  fullName: string;
  professionalTitle: string;
  location: string;
  countryCode: string;
  city: string;
  hourlyRate: number;
  yearsExp: number;
  coreSkills: string[];
  tier: 'corporate' | 'freelance' | 'contract' | 'temporary';
  tierLabel: string;
  field: string;
  verified: boolean;
  reliabilityScore: number;  // 0-100
  rating: number;
  avatarInitials: string;
  photos: string[];  // Portfolio photo URIs
  keyAchievements: string[];
}

export type SwipeAction = 'pass' | 'shortlist' | 'accept';

export interface SwipeMatch {
  candidateId: string;
  candidateName: string;
  candidateTitle: string;
  candidateInitials: string;
  candidatePhoto: string | null;
  matchedAt: string;
  status: 'new' | 'pending' | 'in_conversation' | 'hired';
}

export interface SwipeMetrics {
  profilesSwiped: number;
  activeMatches: number;
  inConversation: number;
  hired: number;
}

export interface SwipeStoreValue {
  candidates: SwipeCandidate[];
  currentIndex: number;
  matches: SwipeMatch[];
  metrics: SwipeMetrics;
  swipeAction: (candidateId: string, action: SwipeAction) => SwipeMatch | null;
  resetDeck: () => void;
}

// ── Mock Candidates (Launch Markets: Lagos, Abuja, Accra, Nairobi) ──
const MOCK_CANDIDATES: SwipeCandidate[] = [
  {
    id: 'sc-1', fullName: 'Amara Osei', professionalTitle: 'Senior Backend Engineer',
    location: 'NG Lagos', countryCode: 'NG', city: 'Lagos', hourlyRate: 85, yearsExp: 7,
    coreSkills: ['Node.js', 'PostgreSQL', 'AWS', 'TypeScript', 'Docker'],
    tier: 'corporate', tierLabel: 'Corporate', field: 'Tech',
    verified: true, reliabilityScore: 98, rating: 4.8, avatarInitials: 'AO',
    keyAchievements: ['Scaled payment API from 100K to 2M daily transactions at Paystack', 'Reduced database query latency by 60% serving 500K+ users', 'Led migration to event-driven architecture processing $30M monthly'],
    photos: ['https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-2', fullName: 'Kwame Asante', professionalTitle: 'Product Designer',
    location: 'GH Accra', countryCode: 'GH', city: 'Accra', hourlyRate: 65, yearsExp: 5,
    coreSkills: ['Figma', 'UI/UX', 'Design Systems', 'Prototyping'],
    tier: 'freelance', tierLabel: 'Freelance', field: 'Design',
    verified: true, reliabilityScore: 95, rating: 4.6, avatarInitials: 'KA',
    keyAchievements: ['Designed product used by 1.2M+ users across 8 African countries', 'Built design system adopted by 3 product teams reducing dev time by 40%', 'Won African Design Award 2025 for inclusive fintech UX'],
    photos: ['https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1642257859842-c95f9fa8121d?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1668752741330-8adc5cef7485?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-3', fullName: 'Fatima Diallo', professionalTitle: 'Data Scientist',
    location: 'KE Nairobi', countryCode: 'KE', city: 'Nairobi', hourlyRate: 95, yearsExp: 6,
    coreSkills: ['Python', 'TensorFlow', 'SQL', 'Tableau', 'R'],
    tier: 'contract', tierLabel: 'Contract', field: 'Tech',
    verified: true, reliabilityScore: 97, rating: 4.9, avatarInitials: 'FD',
    keyAchievements: ['Built ML model predicting churn with 94% accuracy saving $2M ARR', 'Automated reporting pipeline reducing analyst workload by 70%', 'Published research on African market segmentation cited 45+ times'],
    photos: ['https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1532076904124-d4e8fe7fbbec?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-4', fullName: 'Chidinma Eze', professionalTitle: 'DevOps Engineer',
    location: 'NG Abuja', countryCode: 'NG', city: 'Abuja', hourlyRate: 75, yearsExp: 4,
    coreSkills: ['Kubernetes', 'Terraform', 'CI/CD', 'AWS', 'Linux'],
    tier: 'corporate', tierLabel: 'Corporate', field: 'Tech',
    verified: true, reliabilityScore: 92, rating: 4.5, avatarInitials: 'CE',
    keyAchievements: ['Achieved 99.99% uptime across 8 production clusters for 2 years', 'Cut cloud costs by $180K annually through infrastructure optimization', 'Implemented CI/CD pipeline reducing deployment time from 2hrs to 8min'],
    photos: ['https://images.unsplash.com/photo-1772714601002-fbb0fea8a911?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1739300293504-234817eead52?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-5', fullName: 'Tendai Moyo', professionalTitle: 'Mobile Developer',
    location: 'KE Nairobi', countryCode: 'KE', city: 'Nairobi', hourlyRate: 70, yearsExp: 5,
    coreSkills: ['React Native', 'Swift', 'Kotlin', 'Firebase'],
    tier: 'freelance', tierLabel: 'Freelance', field: 'Tech',
    verified: true, reliabilityScore: 96, rating: 4.7, avatarInitials: 'TM',
    keyAchievements: ['Shipped fintech app reaching 800K downloads in first 6 months', 'Reduced app crash rate from 2.1% to 0.08% across iOS and Android', 'Built offline-first sync engine serving users in low-connectivity regions'],
    photos: ['https://images.unsplash.com/photo-1668753700627-f76915cfb515?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1668752600261-e56e7f3780b6?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-6', fullName: 'Adaeze Nwosu', professionalTitle: 'Marketing Strategist',
    location: 'NG Lagos', countryCode: 'NG', city: 'Lagos', hourlyRate: 55, yearsExp: 6,
    coreSkills: ['Growth Marketing', 'SEO', 'Analytics', 'Content Strategy'],
    tier: 'temporary', tierLabel: 'Temporary', field: 'Marketing',
    verified: true, reliabilityScore: 89, rating: 4.3, avatarInitials: 'AN',
    keyAchievements: ['Grew organic traffic from 5K to 120K monthly visitors in 10 months', 'Launched referral program generating 35% of total new user sign-ups', 'Built content strategy reaching 2M+ social impressions monthly'],
    photos: ['https://images.unsplash.com/photo-1527201987695-67c06571957e?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-7', fullName: 'Moussa Keita', professionalTitle: 'Full Stack Engineer',
    location: 'GH Accra', countryCode: 'GH', city: 'Accra', hourlyRate: 80, yearsExp: 8,
    coreSkills: ['React', 'Node.js', 'GraphQL', 'MongoDB', 'TypeScript'],
    tier: 'corporate', tierLabel: 'Corporate', field: 'Tech',
    verified: true, reliabilityScore: 99, rating: 4.8, avatarInitials: 'MK',
    keyAchievements: ['Architected real-time trading platform handling 50K concurrent users', 'Led team of 6 engineers delivering MVP in 12 weeks at 2x velocity', 'Open-source GraphQL toolkit starred 3.2K+ times on GitHub'],
    photos: ['https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-8', fullName: 'Aisha Bello', professionalTitle: 'UX Researcher',
    location: 'NG Lagos', countryCode: 'NG', city: 'Lagos', hourlyRate: 60, yearsExp: 4,
    coreSkills: ['User Research', 'Usability Testing', 'Figma', 'Analytics'],
    tier: 'freelance', tierLabel: 'Freelance', field: 'Design',
    verified: true, reliabilityScore: 94, rating: 4.4, avatarInitials: 'AB',
    keyAchievements: ['Conducted 200+ user interviews across 5 African markets', 'Improved onboarding completion from 34% to 78% through UX research', 'Established usability testing program reducing post-launch bug reports by 55%'],
    photos: ['https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1611432579699-484f7990b127?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1596075780750-81249df16d19?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-9', fullName: 'Emeka Okoro', professionalTitle: 'Finance Analyst',
    location: 'NG Abuja', countryCode: 'NG', city: 'Abuja', hourlyRate: 70, yearsExp: 5,
    coreSkills: ['Financial Modeling', 'Excel', 'Power BI', 'Forecasting'],
    tier: 'contract', tierLabel: 'Contract', field: 'Finance',
    verified: true, reliabilityScore: 91, rating: 4.5, avatarInitials: 'EO',
    keyAchievements: ['Built financial model that secured $15M Series B funding', 'Automated month-end close process reducing time from 10 days to 3', 'Identified $2.4M in cost savings through spend analysis dashboard'],
    photos: ['https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1598201116904-9613ee826e9a?w=400&h=500&fit=crop&crop=face'],
  },
  {
    id: 'sc-10', fullName: 'Wanjiku Kamau', professionalTitle: 'Legal Counsel',
    location: 'KE Nairobi', countryCode: 'KE', city: 'Nairobi', hourlyRate: 110, yearsExp: 9,
    coreSkills: ['Corporate Law', 'Compliance', 'Contract Drafting', 'IP Law'],
    tier: 'corporate', tierLabel: 'Corporate', field: 'Legal',
    verified: true, reliabilityScore: 100, rating: 4.9, avatarInitials: 'WK',
    keyAchievements: ['Secured regulatory licenses in 6 African jurisdictions in 18 months', 'Negotiated $45M in partnership agreements with zero litigation', 'Built compliance framework adopted as industry standard by 3 peers'],
    photos: ['https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=400&h=500&fit=crop&crop=face', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face'],
  },
];

const INITIAL_MATCHES: SwipeMatch[] = [
  {
    candidateId: 'prev-1', candidateName: 'Oluwaseun Balogun', candidateTitle: 'Frontend Engineer',
    candidateInitials: 'OB', matchedAt: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'new', candidatePhoto: null,
  },
  {
    candidateId: 'prev-2', candidateName: 'Grace Wanjiku', candidateTitle: 'Cloud Architect',
    candidateInitials: 'GW', matchedAt: new Date(Date.now() - 24 * 3600000).toISOString(), status: 'pending', candidatePhoto: null,
  },
  {
    candidateId: 'prev-3', candidateName: 'Emeka Okonkwo', candidateTitle: 'QA Lead',
    candidateInitials: 'EO', matchedAt: new Date(Date.now() - 48 * 3600000).toISOString(), status: 'in_conversation', candidatePhoto: null,
  },
];

// ── Context ──
const SwipeStoreContext = createContext<SwipeStoreValue | null>(null);

export function SwipeStoreProvider({ children }: { children: ReactNode }) {
  const [candidates] = useState<SwipeCandidate[]>(MOCK_CANDIDATES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<SwipeMatch[]>(INITIAL_MATCHES);
  const [metrics, setMetrics] = useState<SwipeMetrics>({
    profilesSwiped: 47,
    activeMatches: 3,
    inConversation: 1,
    hired: 0,
  });

  const swipeAction = useCallback((candidateId: string, action: SwipeAction): SwipeMatch | null => {
    setCurrentIndex((i) => i + 1);
    setMetrics((m) => ({ ...m, profilesSwiped: m.profilesSwiped + 1 }));

    if (action === 'accept') {
      const isMatch = Math.random() < 0.4;
      if (isMatch) {
        const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId);
        if (candidate) {
          const newMatch: SwipeMatch = {
            candidateId,
            candidateName: candidate.fullName,
            candidateTitle: candidate.professionalTitle,
            candidateInitials: candidate.avatarInitials,
        candidatePhoto: candidate.photos[0] || null,
            matchedAt: new Date().toISOString(),
            status: 'new',
          };
          setMatches((prev) => [newMatch, ...prev]);
          setMetrics((m) => ({ ...m, activeMatches: m.activeMatches + 1 }));
          return newMatch;
        }
      }
    }

    if (action === 'shortlist') {
      const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId);
      if (candidate) {
        const pending: SwipeMatch = {
          candidateId,
          candidateName: candidate.fullName,
          candidateTitle: candidate.professionalTitle,
          candidateInitials: candidate.avatarInitials,
        candidatePhoto: candidate.photos[0] || null,
          matchedAt: new Date().toISOString(),
          status: 'pending',
        };
        setMatches((prev) => [pending, ...prev]);
      }
    }

    return null;
  }, []);

  const resetDeck = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const value: SwipeStoreValue = {
    candidates, currentIndex, matches, metrics, swipeAction, resetDeck,
  };

  return React.createElement(SwipeStoreContext.Provider, { value }, children);
}

export function useSwipeStore(): SwipeStoreValue {
  const ctx = useContext(SwipeStoreContext);
  if (!ctx) throw new Error('useSwipeStore must be used within SwipeStoreProvider');
  return ctx;
}
