// Corporate = large enterprise (500+ headcount, institutional)
// Short-Term = contract/project-based engagements
// Gig = freelance tasks, waitlisted until matching goes live
export type Tier = 'corporate' | 'short_term' | 'gig';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead';

export interface Role {
  id: string;
  tier: Tier;
  title: string;
  function: string;
  required_skills: { must_have: string[]; nice_to_have: string[] };
  experience_level: ExperienceLevel;
  location_type: 'remote' | 'hybrid' | 'on_site';
  location_city?: string;
  location_country?: string;
  contract_length: string;
  rate_min: number;
  rate_max: number;
  rate_type: 'monthly' | 'hourly' | 'fixed';
  start_date: string;
  company_size_band: string;
  company_industry: string;
  visibility_description: string;
  match_score: number; // 0–100, used for compatibility display
  status: 'matching' | 'shortlisted' | 'introductions_pending';
  created_at: string;
  keyDeliverables: string[];
}

// ── Tier presentation config (shared across screens) ──────────────────
export const TIER_CONFIG: Record<Tier, {
  label: string;
  color: string;     // card background
  accent: string;    // badges, icons, CTAs
  icon: string;      // Ionicons name
}> = {
  corporate:   { label: 'Corporate',    color: '#D1FAE5', accent: '#059669', icon: 'business' },
  short_term:  { label: 'Short-Term',   color: '#E0E7FF', accent: '#4F46E5', icon: 'time' },
  gig:         { label: 'Gig',          color: '#F1F5F9', accent: '#64748B', icon: 'flash' },
};

export const mockRoles: Role[] = [
  // ── CORPORATE (large enterprise) ──
  {
    id: '1',
    tier: 'corporate',
    title: 'Senior Backend Engineer',
    function: 'Engineering',
    required_skills: {
      must_have: ['Node.js', 'PostgreSQL', 'TypeScript'],
      nice_to_have: ['GraphQL', 'AWS', 'Docker'],
    },
    experience_level: 'senior',
    location_type: 'remote',
    contract_length: 'Permanent',
    rate_min: 5000,
    rate_max: 8000,
    rate_type: 'monthly',
    start_date: '2026-08-01',
    company_size_band: '501–1000 employees',
    company_industry: 'Fintech',
    visibility_description: 'A leading pan-African fintech scaling its core payments infrastructure to serve 10M+ users.',
    match_score: 94,
    status: 'matching',
    keyDeliverables: ['Migrate monolith to microservices for 2M+ daily transactions', 'Build real-time fraud detection pipeline with sub-50ms latency', 'Reduce API response times by 40% across payment endpoints'],
    created_at: '2026-06-28',
  },
  {
    id: '6',
    tier: 'corporate',
    title: 'DevOps Engineer',
    function: 'Engineering',
    required_skills: {
      must_have: ['Kubernetes', 'Terraform', 'AWS'],
      nice_to_have: ['GCP', 'Datadog', 'Helm'],
    },
    experience_level: 'lead',
    location_type: 'remote',
    contract_length: 'Permanent',
    rate_min: 7000,
    rate_max: 11000,
    rate_type: 'monthly',
    start_date: '2026-09-01',
    company_size_band: '1000+ employees',
    company_industry: 'Banking',
    visibility_description: 'A tier-1 pan-African bank modernising its cloud infrastructure across 12 countries.',
    match_score: 95,
    status: 'matching',
    keyDeliverables: ['Redesign patient onboarding flow achieving 85% completion rate', 'Build design system with 60+ reusable components', 'Lead user research across 5 African markets with 200+ participants'],
    created_at: '2026-06-20',
  },

  // ── BLUE-COLLAR (skilled trades & hands-on) ──

  // ── SHORT-TERM (contract / project-based) ──
  {
    id: '2',
    tier: 'short_term',
    title: 'Product Designer',
    function: 'Design',
    required_skills: {
      must_have: ['Figma', 'User Research', 'Design Systems'],
      nice_to_have: ['Prototyping', 'Framer'],
    },
    experience_level: 'mid',
    location_type: 'hybrid',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    contract_length: '3 months',
    rate_min: 3000,
    rate_max: 5000,
    rate_type: 'monthly',
    start_date: '2026-07-15',
    company_size_band: '11–50 employees',
    company_industry: 'E-commerce',
    visibility_description: 'An e-commerce startup redesigning their mobile checkout experience.',
    match_score: 87,
    status: 'matching',
    keyDeliverables: ['Build executive dashboards tracking $50M+ GMV in real-time', 'Automate weekly reporting saving 20 analyst-hours per cycle', 'Design A/B testing framework to optimize conversion by 15%'],
    created_at: '2026-06-30',
  },
  {
    id: '4',
    tier: 'short_term',
    title: 'Mobile Developer (React Native)',
    function: 'Engineering',
    required_skills: {
      must_have: ['React Native', 'TypeScript', 'Expo'],
      nice_to_have: ['iOS native', 'CI/CD', 'Jest'],
    },
    experience_level: 'senior',
    location_type: 'remote',
    contract_length: '6 months',
    rate_min: 5500,
    rate_max: 8500,
    rate_type: 'monthly',
    start_date: '2026-07-20',
    company_size_band: '11–50 employees',
    company_industry: 'Healthtech',
    visibility_description: 'A healthtech startup building a patient-facing mobile app for West Africa.',
    match_score: 88,
    status: 'matching',
    keyDeliverables: ['Achieve 99.95% uptime SLA across 12 regional clusters', 'Cut cloud infrastructure costs by 35% via optimization', 'Implement zero-downtime deployment for 50+ services'],
    created_at: '2026-07-01',
  },

  // ── GIG (freelance / waitlisted) ──
  {
    id: '5',
    tier: 'gig',
    title: 'Brand Identity Designer',
    function: 'Design',
    required_skills: {
      must_have: ['Brand Design', 'Adobe Illustrator', 'Typography'],
      nice_to_have: ['Motion Graphics', 'Packaging Design'],
    },
    experience_level: 'mid',
    location_type: 'remote',
    contract_length: '2 weeks',
    rate_min: 1500,
    rate_max: 2500,
    rate_type: 'fixed',
    start_date: '2026-07-10',
    company_size_band: '1–10 employees',
    company_industry: 'Consumer Goods',
    visibility_description: 'An early-stage consumer brand preparing for its market launch.',
    match_score: 0, // waitlisted — score not yet calculated
    status: 'matching',
    keyDeliverables: ['Ship cross-platform app serving 500K+ users in 3 countries', 'Implement offline-first sync for low-connectivity regions', 'Reduce app crash rate to under 0.1% with robust error handling'],
    created_at: '2026-07-02',
  },
  {
    id: '10',
    tier: 'gig',
    title: 'Social Media Content Creator',
    function: 'Marketing',
    required_skills: {
      must_have: ['Content Creation', 'Instagram', 'Canva'],
      nice_to_have: ['TikTok', 'Video Editing', 'Copywriting'],
    },
    experience_level: 'junior',
    location_type: 'remote',
    contract_length: '1 week',
    rate_min: 500,
    rate_max: 1000,
    rate_type: 'fixed',
    start_date: '2026-07-08',
    company_size_band: '1–10 employees',
    company_industry: 'Fashion',
    visibility_description: 'A Lagos-based fashion brand launching a new collection and needs social media buzz.',
    match_score: 0,
    status: 'matching',
    keyDeliverables: ['Grow organic sign-ups to 10K monthly through content strategy', 'Launch influencer program generating 3x ROI on ad spend', 'Build attribution model tracking journeys across 8 channels'],
    created_at: '2026-07-02',
  },
];

// ── Company-side types & mock data ──────────────────────────────────

export type SubscriptionPlan = 'pilot' | 'starter' | 'growth' | 'enterprise';

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  size_band: string;
  logo_url?: string;
  plan: SubscriptionPlan;
  job_slots_total: number;
  job_slots_active: number;
  verified: boolean;
  created_at: string;
}

export interface CandidateVerification {
  identity: boolean;
  video_intro: boolean;
  skills_assessment: boolean;
  employer_review: boolean;
}

export interface MatchedCandidate {
  id: string;
  name: string;
  title: string;
  location_city: string;
  location_country: string;
  match_score: number;
  original_score?: number; // before cap (if missing must_have skill)
  skills: string[];
  missing_must_have?: string[]; // skills that cap score at 50
  rate_expectation?: number; // candidate's expected rate
  experience_level: ExperienceLevel;
  verified: boolean;
  verification: CandidateVerification;
  avatar_placeholder: string;
  status: 'matched' | 'intro_sent' | 'intro_accepted' | 'intro_expired';
  intro_sent_at?: string;
}

export interface CompanyRole {
  id: string;
  role_id: string;
  tier: Tier;
  title: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  candidates_matched: number;
  candidates_shortlisted: number;
  intros_sent: number;
  intros_accepted: number;
  created_at: string;
  deadline_hours: number;
}

export const PLAN_CONFIG: Record<SubscriptionPlan, {
  label: string;
  color: string;
  slots: number;
  features: string[];
}> = {
  pilot: {
    label: 'Pilot',
    color: '#6B7280',
    slots: 1,
    features: ['1 job slot', 'Basic matching', 'Email support'],
  },
  starter: {
    label: 'Starter',
    color: '#1565C0',
    slots: 3,
    features: ['3 job slots', 'Priority matching', 'Chat support'],
  },
  growth: {
    label: 'Growth',
    color: '#2E7D32',
    slots: 10,
    features: ['10 job slots', 'Advanced analytics', 'Dedicated CSM'],
  },
  enterprise: {
    label: 'Enterprise',
    color: '#7B1FA2',
    slots: 50,
    features: ['Unlimited slots', 'Custom matching', 'API access', 'SLA'],
  },
};

export const mockCompany: CompanyProfile = {
  id: 'c1',
  name: 'Paystack Technologies',
  industry: 'Fintech',
  size_band: '501-1000 employees',
  plan: 'growth',
  job_slots_total: 10,
  job_slots_active: 4,
  verified: true,
  created_at: '2026-01-15',
};

export const mockCompanyRoles: CompanyRole[] = [
  {
    id: 'cr1',
    role_id: '1',
    tier: 'corporate',
    title: 'Senior Backend Engineer',
    status: 'active',
    candidates_matched: 12,
    candidates_shortlisted: 5,
    intros_sent: 3,
    intros_accepted: 2,
    created_at: '2026-06-28',
    deadline_hours: 72,
  },
  {
    id: 'cr2',
    role_id: '6',
    tier: 'corporate',
    title: 'DevOps Engineer',
    status: 'active',
    candidates_matched: 8,
    candidates_shortlisted: 3,
    intros_sent: 1,
    intros_accepted: 0,
    created_at: '2026-06-20',
    deadline_hours: 72,
  },
  {
    id: 'cr3',
    role_id: '2',
    tier: 'short_term',
    title: 'Product Designer',
    status: 'active',
    candidates_matched: 15,
    candidates_shortlisted: 5,
    intros_sent: 4,
    intros_accepted: 3,
    created_at: '2026-06-30',
    deadline_hours: 48,
  },
  {
    id: 'cr4',
    role_id: '4',
    tier: 'short_term',
    title: 'Mobile Developer (React Native)',
    status: 'paused',
    candidates_matched: 6,
    candidates_shortlisted: 2,
    intros_sent: 0,
    intros_accepted: 0,
    created_at: '2026-07-01',
    deadline_hours: 48,
  },
];

export const mockMatchedCandidates: MatchedCandidate[] = [
  {
    id: 'mc1',
    name: 'Adaeze Okoro',
    title: 'Senior Software Engineer',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    match_score: 96,
    skills: ['Node.js', 'PostgreSQL', 'TypeScript', 'GraphQL'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'intro_accepted',
    intro_sent_at: '2026-07-01T10:00:00Z',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc2',
    name: 'Kwame Asante',
    title: 'Lead Backend Developer',
    location_city: 'Accra',
    location_country: 'Ghana',
    match_score: 94,
    skills: ['Node.js', 'PostgreSQL', 'TypeScript', 'AWS'],
    experience_level: 'lead',
    verified: true,
    avatar_placeholder: 'person',
    status: 'intro_sent',
    intro_sent_at: '2026-07-02T14:30:00Z',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc3',
    name: 'Fatima Diallo',
    title: 'Full-Stack Engineer',
    location_city: 'Dakar',
    location_country: 'Senegal',
    match_score: 91,
    skills: ['Node.js', 'TypeScript', 'Docker', 'AWS'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'intro_accepted',
    intro_sent_at: '2026-06-30T09:15:00Z',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc4',
    name: 'Tendai Moyo',
    title: 'Backend Engineer',
    location_city: 'Harare',
    location_country: 'Zimbabwe',
    match_score: 89,
    skills: ['Node.js', 'PostgreSQL', 'GraphQL'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: false },
  },
  {
    id: 'mc5',
    name: 'Amina Yusuf',
    title: 'Software Engineer',
    location_city: 'Nairobi',
    location_country: 'Kenya',
    match_score: 87,
    skills: ['TypeScript', 'PostgreSQL', 'Docker'],
    experience_level: 'mid',
    verified: false,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: false, skills_assessment: true, employer_review: false },
    rate_expectation: 9000,
  },
  {
    id: 'mc6',
    name: 'Oluwaseun Bello',
    title: 'Backend Developer',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    match_score: 84,
    skills: ['Node.js', 'TypeScript'],
    experience_level: 'mid',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc7',
    name: 'Chidinma Eze',
    title: 'API Engineer',
    location_city: 'Abuja',
    location_country: 'Nigeria',
    match_score: 82,
    skills: ['Node.js', 'PostgreSQL'],
    experience_level: 'mid',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: false },
  },
  {
    id: 'mc8',
    name: 'Kofi Mensah',
    title: 'Software Developer',
    location_city: 'Kumasi',
    location_country: 'Ghana',
    match_score: 79,
    skills: ['TypeScript', 'AWS'],
    experience_level: 'mid',
    verified: false,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: false, skills_assessment: false, employer_review: false },
    missing_must_have: ['PostgreSQL'],
    original_score: 85,
  },
  {
    id: 'mc9',
    name: 'Zainab Okafor',
    title: 'Backend Engineer',
    location_city: 'Port Harcourt',
    location_country: 'Nigeria',
    match_score: 77,
    skills: ['Node.js', 'Docker'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'intro_expired',
    intro_sent_at: '2026-06-28T08:00:00Z',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc10',
    name: 'Jabari Kamau',
    title: 'DevOps & Backend',
    location_city: 'Nairobi',
    location_country: 'Kenya',
    match_score: 75,
    skills: ['Node.js', 'PostgreSQL', 'AWS'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc11',
    name: 'Ngozi Uche',
    title: 'Junior Engineer',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    match_score: 72,
    skills: ['TypeScript', 'Node.js'],
    experience_level: 'junior',
    verified: false,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: false, skills_assessment: false, employer_review: false },
    missing_must_have: ['PostgreSQL'],
    original_score: 80,
  },
  {
    id: 'mc12',
    name: 'Thabo Nkosi',
    title: 'Backend Developer',
    location_city: 'Johannesburg',
    location_country: 'South Africa',
    match_score: 70,
    skills: ['PostgreSQL', 'Docker'],
    experience_level: 'mid',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc13',
    name: 'Binta Sow',
    title: 'Software Engineer',
    location_city: 'Conakry',
    location_country: 'Guinea',
    match_score: 68,
    skills: ['Node.js', 'TypeScript'],
    experience_level: 'mid',
    verified: false,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: false, skills_assessment: true, employer_review: false },
  },
  {
    id: 'mc14',
    name: 'Emeka Nwankwo',
    title: 'Platform Engineer',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    match_score: 65,
    skills: ['AWS', 'TypeScript', 'Docker'],
    experience_level: 'senior',
    verified: true,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: true, skills_assessment: true, employer_review: true },
  },
  {
    id: 'mc15',
    name: 'Aisha Traore',
    title: 'Junior Backend Dev',
    location_city: 'Bamako',
    location_country: 'Mali',
    match_score: 62,
    skills: ['Node.js'],
    experience_level: 'junior',
    verified: false,
    avatar_placeholder: 'person',
    status: 'matched',
    verification: { identity: true, video_intro: false, skills_assessment: false, employer_review: false },
  },
];
