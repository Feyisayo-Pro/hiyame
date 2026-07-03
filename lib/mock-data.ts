// Corporate = large enterprise (500+ headcount, institutional)
// Blue-Collar = skilled trades & hands-on roles (Welders, Mechanics, Electricians, Construction)
// Short-Term = contract/project-based engagements
// Gig = freelance tasks, waitlisted until matching goes live
export type Tier = 'corporate' | 'blue_collar' | 'short_term' | 'gig';
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
}

// ── Tier presentation config (shared across screens) ──────────────────
export const TIER_CONFIG: Record<Tier, {
  label: string;
  color: string;     // card background
  accent: string;    // badges, icons, CTAs
  icon: string;      // Ionicons name
}> = {
  corporate:   { label: 'Corporate',    color: '#D7F0D0', accent: '#2E7D32', icon: 'business' },
  blue_collar:  { label: 'Blue-Collar',  color: '#BBDEFB', accent: '#1565C0', icon: 'hammer' },
  short_term:  { label: 'Short-Term',   color: '#E1BEE7', accent: '#7B1FA2', icon: 'time' },
  gig:         { label: 'Gig',          color: '#FFE0B2', accent: '#E65100', icon: 'flash' },
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
    created_at: '2026-06-20',
  },

  // ── BLUE-COLLAR (skilled trades & hands-on) ──
  {
    id: '7',
    tier: 'blue_collar',
    title: 'Certified Welder',
    function: 'Skilled Trades',
    required_skills: {
      must_have: ['MIG Welding', 'TIG Welding', 'Blueprint Reading'],
      nice_to_have: ['Pipe Welding', 'AWS Certification', 'CNC Cutting'],
    },
    experience_level: 'mid',
    location_type: 'on_site',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    contract_length: 'Permanent',
    rate_min: 1500,
    rate_max: 3000,
    rate_type: 'monthly',
    start_date: '2026-08-01',
    company_size_band: '51–200 employees',
    company_industry: 'Manufacturing',
    visibility_description: 'A steel fabrication company expanding its production capacity to meet growing demand across West Africa.',
    match_score: 89,
    status: 'matching',
    created_at: '2026-07-01',
  },
  {
    id: '8',
    tier: 'blue_collar',
    title: 'Automotive Mechanic',
    function: 'Skilled Trades',
    required_skills: {
      must_have: ['Engine Diagnostics', 'Brake Systems', 'Electrical Systems'],
      nice_to_have: ['Hybrid Vehicles', 'Fleet Management', 'OBD-II'],
    },
    experience_level: 'mid',
    location_type: 'on_site',
    location_city: 'Accra',
    location_country: 'Ghana',
    contract_length: 'Permanent',
    rate_min: 1200,
    rate_max: 2500,
    rate_type: 'monthly',
    start_date: '2026-08-15',
    company_size_band: '11–50 employees',
    company_industry: 'Automotive',
    visibility_description: 'A growing fleet services company looking for experienced mechanics to maintain a 200+ vehicle fleet across Ghana.',
    match_score: 82,
    status: 'matching',
    created_at: '2026-06-29',
  },
  {
    id: '3',
    tier: 'blue_collar',
    title: 'Industrial Electrician',
    function: 'Skilled Trades',
    required_skills: {
      must_have: ['Industrial Wiring', 'PLC Programming', 'Electrical Safety'],
      nice_to_have: ['Solar Installation', 'Generator Maintenance', 'SCADA'],
    },
    experience_level: 'senior',
    location_type: 'on_site',
    location_city: 'Nairobi',
    location_country: 'Kenya',
    contract_length: 'Permanent',
    rate_min: 2000,
    rate_max: 4000,
    rate_type: 'monthly',
    start_date: '2026-08-15',
    company_size_band: '201–500 employees',
    company_industry: 'Energy',
    visibility_description: 'A renewable energy company deploying solar and hybrid power solutions across East Africa.',
    match_score: 91,
    status: 'shortlisted',
    created_at: '2026-06-25',
  },
  {
    id: '9',
    tier: 'blue_collar',
    title: 'Construction Foreman',
    function: 'Construction',
    required_skills: {
      must_have: ['Site Supervision', 'Health & Safety', 'Project Scheduling'],
      nice_to_have: ['AutoCAD', 'Cost Estimation', 'Heavy Equipment'],
    },
    experience_level: 'senior',
    location_type: 'on_site',
    location_city: 'Cape Town',
    location_country: 'South Africa',
    contract_length: 'Permanent',
    rate_min: 2500,
    rate_max: 4500,
    rate_type: 'monthly',
    start_date: '2026-09-01',
    company_size_band: '201–500 employees',
    company_industry: 'Construction',
    visibility_description: 'A commercial construction firm building mixed-use developments across Southern Africa, looking for experienced site leadership.',
    match_score: 78,
    status: 'matching',
    created_at: '2026-06-27',
  },

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
    created_at: '2026-07-02',
  },
];
