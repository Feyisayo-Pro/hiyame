// Home-grown "AI assist" engine — no external API, no API key, no per-call
// cost. Replaces an earlier version that called the Anthropic API directly;
// this is deterministic template/rule logic instead. Honest tradeoff: it
// won't write as fluently as a real LLM, and CV extraction is keyword/regex
// heuristics rather than true language understanding — but it's free, it
// has no external dependency to configure, and it works today.
//
// Every exported function keeps the exact same name and return shape
// ({ ok, data }) the Anthropic-backed version had, so api/ai-assist.ts and
// api/video-intro.ts needed zero changes to switch over.

interface AiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ───────────────────────── Job description drafting ─────────────────────

export interface DraftJdInput {
  title: string;
  tier: string;
  roleFunction?: string;
  mustHave: string[];
  niceToHave: string[];
  experienceLevel?: string | null;
  employmentType?: string | null;
  locationType?: string;
  locationCity?: string;
  locationCountry?: string;
  rateMin?: string;
  rateMax?: string;
  rateType?: string;
  contractLength?: string;
}

export interface DraftJdOutput {
  overview: string;
  responsibilities: string;
  requirements: string;
}

const LEVEL_OPENER: Record<string, string> = {
  junior: 'a motivated',
  mid: 'an experienced',
  senior: 'a seasoned',
  lead: 'an accomplished, senior',
};

const LEVEL_YEARS: Record<string, string> = {
  junior: '0–2 years',
  mid: '2–5 years',
  senior: '5–8 years',
  lead: '8+ years',
};

const TIER_PHRASE: Record<string, string> = {
  corporate: 'joining a growing team',
  short_term: 'with a clearly defined scope and timeline',
  gig: 'with flexible, project-based work',
};

function locationSentence(input: DraftJdInput): string {
  const place = [input.locationCity, input.locationCountry].filter(Boolean).join(', ');
  if (input.locationType === 'remote') return ', fully remote';
  if (input.locationType === 'hybrid') return ` in a hybrid setup${place ? ` out of ${place}` : ''}`;
  if (input.locationType === 'on_site') return ` on-site${place ? ` in ${place}` : ''}`;
  return '';
}

export async function draftJobDescription(input: DraftJdInput): Promise<AiResult<DraftJdOutput>> {
  const opener = (input.experienceLevel && LEVEL_OPENER[input.experienceLevel]) || 'a skilled';
  const funcPhrase = input.roleFunction ? ` in ${input.roleFunction}` : '';
  const empPhrase = input.employmentType === 'contract' ? 'a contract engagement' : 'a full-time role';
  const tierPhrase = TIER_PHRASE[input.tier];
  const topSkills = input.mustHave.slice(0, 3).join(', ');

  const overview = [
    `We're looking for ${opener} ${input.title}${funcPhrase} to join our team${locationSentence(input)}.`,
    `This is ${empPhrase}${tierPhrase ? `, ${tierPhrase}` : ''}.`,
    topSkills ? `You'll bring hands-on expertise in ${topSkills} to help drive real impact from day one.` : '',
  ].filter(Boolean).join(' ');

  const skillLines = input.mustHave.slice(0, 4).map((s) => `• Apply strong ${s} skills to deliver high-quality, reliable work.`);
  const genericLines = [
    '• Collaborate closely with cross-functional teammates to plan and execute on shared goals.',
    '• Take ownership of your area of work, from planning through delivery.',
    '• Communicate progress, blockers, and decisions clearly and proactively.',
  ];
  const responsibilities = [...skillLines, ...genericLines].join('\n');

  const reqLines: string[] = [];
  if (input.experienceLevel && LEVEL_YEARS[input.experienceLevel]) {
    reqLines.push(`• ${LEVEL_YEARS[input.experienceLevel]} of relevant experience.`);
  }
  input.mustHave.forEach((s) => reqLines.push(`• Proven, hands-on experience with ${s}.`));
  input.niceToHave.forEach((s) => reqLines.push(`• Familiarity with ${s} is a plus, not required.`));
  if (input.contractLength) reqLines.push(`• Available for a ${input.contractLength} engagement.`);
  reqLines.push('• Strong communication skills and the ability to work independently.');

  return { ok: true, data: { overview, responsibilities, requirements: reqLines.join('\n') } };
}

// ───────────────────────── Role-boost suggestions ────────────────────────

export interface BoostRoleInput {
  title: string;
  tier: string;
  requiredSkills: { mustHave: string[]; niceToHave: string[] };
  experienceLevel?: string | null;
  locationType?: string | null;
  rateMin?: number | null;
  rateMax?: number | null;
  matchCount: number;
  avgScore: number | null;
  skippedCount: number;
  savedCount: number;
}

export interface BoostRoleOutput {
  suggestions: string[];
}

export async function suggestRoleBoosts(input: BoostRoleInput): Promise<AiResult<BoostRoleOutput>> {
  const s: string[] = [];
  const mustCount = input.requiredSkills.mustHave.length;

  if (input.matchCount === 0) {
    s.push('No candidates have matched this role yet — widening the must-have skills list or the experience level requirement usually surfaces more of the pool.');
  }
  if (mustCount > 5) {
    s.push(`The must-have list has ${mustCount} skills — roles with 3–4 tightly-scoped requirements typically match more candidates. Consider moving the less critical ones to nice-to-have.`);
  }
  if (mustCount === 0) {
    s.push('No must-have skills are set, so matching has nothing firm to score against — add at least 2–3 to get meaningful results.');
  }
  if (input.avgScore !== null && input.avgScore < 60) {
    s.push(`Matched candidates average a ${Math.round(input.avgScore)}% fit — that's low. The required skill combination may be narrower than what's available in the current pool.`);
  }
  if (input.rateMin == null && input.rateMax == null) {
    s.push("No rate range is set — candidates can't gauge fit on compensation before engaging. Adding one usually improves the quality of who applies or accepts.");
  }
  if (input.skippedCount > 3 && input.skippedCount > input.savedCount * 2) {
    s.push("You've skipped far more candidates than you've saved on this role — that's often a sign the listed requirements don't quite match who you're actually looking for.");
  }
  if (input.requiredSkills.niceToHave.length === 0) {
    s.push('No nice-to-have skills are listed — these help differentiate close-call candidates without hard-blocking anyone who lacks them.');
  }
  if (!input.experienceLevel) {
    s.push('No experience level is set — candidates and the matching engine both use this as a key signal; adding one narrows the pool to people who are actually a fit.');
  }

  if (s.length === 0) {
    s.push('This role looks well-optimized — a solid must-have list, a set experience level, and healthy match activity. Nothing obvious to change right now.');
  }

  return { ok: true, data: { suggestions: s.slice(0, 5) } };
}

// ───────────────────────── CV extraction ──────────────────────────────

export interface CvExtractedExperience {
  jobTitle: string;
  companyName: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface CvExtractedEducation {
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CvExtractedCertification {
  name: string;
  issuingOrganization: string | null;
  issueDate: string | null;
  expiryDate: string | null;
}

export interface CvExtractOutput {
  summary: string | null;
  skillTags: string[];
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead' | null;
  experience: CvExtractedExperience[];
  education: CvExtractedEducation[];
  certifications: CvExtractedCertification[];
}

const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'React', 'React Native', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'AWS', 'Azure', 'GCP', 'Docker',
  'Kubernetes', 'CI/CD', 'Git', 'Linux', 'DevOps', 'Terraform', 'HTML', 'CSS', 'Tailwind', 'Figma', 'Adobe XD',
  'UI/UX Design', 'Product Management', 'Project Management', 'Agile', 'Scrum', 'Data Analysis', 'Data Science',
  'Machine Learning', 'Excel', 'Power BI', 'Tableau', 'Salesforce', 'SEO', 'Digital Marketing', 'Content Writing',
  'Copywriting', 'Social Media Marketing', 'Accounting', 'Bookkeeping', 'Financial Analysis', 'QuickBooks',
  'Customer Service', 'Sales', 'Business Development', 'Human Resources', 'Recruitment', 'Payroll',
  'Supply Chain', 'Logistics', 'Operations Management', 'Legal Research', 'Contract Management',
  'Graphic Design', 'Video Editing', 'WordPress', 'Shopify', 'Email Marketing',
];

const SENIOR_KEYWORDS = /\b(lead|principal|head of|director|vp\b|chief)\b/i;
const MID_SENIOR_KEYWORD = /\bsenior\b|\bsr\.?\b/i;
const JUNIOR_KEYWORDS = /\bjunior\b|\bjr\.?\b|\bintern(ship)?\b|\bentry[- ]level\b/i;

const DEGREE_KEYWORDS = /\b(bachelor'?s?|b\.?sc\.?|b\.?a\.?|b\.?eng\.?|master'?s?|m\.?sc\.?|m\.?a\.?|mba|ph\.?d\.?|doctorate|hnd|ond|diploma|associate'?s?)\b/i;
const INSTITUTION_HINT = /\b(university|polytechnic|institute|college|school of)\b/i;
const CERT_KEYWORDS = /\b(certified|certificate|certification|pmp\b|cfa\b|cpa\b|scrum master|itil\b|six sigma|aws certified)\b/i;
const DATE_RANGE = /\b(19|20)\d{2}\b\s*[-–—to]+\s*(\b(19|20)\d{2}\b|present|current)/i;
const YEAR = /\b(19|20)\d{2}\b/g;

function extractSkills(text: string): string[] {
  const found: string[] = [];
  for (const skill of SKILL_KEYWORDS) {
    const re = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) found.push(skill);
  }
  return found.slice(0, 15);
}

function inferExperienceLevel(text: string): CvExtractOutput['experienceLevel'] {
  if (SENIOR_KEYWORDS.test(text)) return 'lead';
  if (MID_SENIOR_KEYWORD.test(text)) return 'senior';
  if (JUNIOR_KEYWORDS.test(text)) return 'junior';
  const years = Array.from(text.matchAll(YEAR)).map((m) => parseInt(m[0], 10)).filter((y) => y >= 1970 && y <= new Date().getFullYear());
  if (years.length >= 2) {
    const span = Math.max(...years) - Math.min(...years);
    if (span >= 8) return 'senior';
    if (span >= 3) return 'mid';
    return 'junior';
  }
  return null;
}

const SECTION_HEADER = /^(summary|profile|objective|about me|professional summary|skills|experience|work experience|education|certifications?|projects|references)\s*:?$/i;

function extractSummary(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const headerIdx = lines.findIndex((l) => /^(summary|profile|objective|about me|professional summary)\s*:?$/i.test(l));
  if (headerIdx === -1) return null;
  const body: string[] = [];
  for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 6) && body.length < 3; i++) {
    if (!lines[i]) continue;
    if (SECTION_HEADER.test(lines[i])) break;
    body.push(lines[i]);
  }
  const joined = body.join(' ').trim();
  return joined.length > 20 ? joined.slice(0, 400) : null;
}

function extractExperience(text: string): CvExtractedExperience[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: CvExtractedExperience[] = [];
  for (const line of lines) {
    const match = line.match(DATE_RANGE);
    if (!match) continue;
    const isCurrent = /present|current/i.test(match[0]);
    const jobTitle = line.replace(DATE_RANGE, '').replace(/[|,·–—-]+$/g, '').trim();
    if (!jobTitle || jobTitle.length < 3 || jobTitle.length > 100) continue;
    const years = Array.from(match[0].matchAll(YEAR)).map((m) => m[0]);
    out.push({
      jobTitle,
      companyName: null,
      startDate: years[0] ? `${years[0]}-01-01` : null,
      endDate: !isCurrent && years[1] ? `${years[1]}-01-01` : null,
      isCurrent,
      description: null,
    });
    if (out.length >= 5) break;
  }
  return out;
}

function extractEducation(text: string): CvExtractedEducation[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: CvExtractedEducation[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DEGREE_KEYWORDS.test(lines[i])) continue;
    const institutionLine = INSTITUTION_HINT.test(lines[i]) ? lines[i] : [lines[i - 1], lines[i + 1]].find((l) => l && INSTITUTION_HINT.test(l));
    out.push({
      institution: institutionLine ?? 'Not specified',
      qualification: lines[i].slice(0, 100),
      fieldOfStudy: null,
      startDate: null,
      endDate: null,
    });
    if (out.length >= 3) break;
  }
  return out;
}

function extractCertifications(text: string): CvExtractedCertification[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: CvExtractedCertification[] = [];
  for (const line of lines) {
    if (!CERT_KEYWORDS.test(line)) continue;
    out.push({ name: line.slice(0, 120), issuingOrganization: null, issueDate: null, expiryDate: null });
    if (out.length >= 3) break;
  }
  return out;
}

// pdf-parse's PDFParse is built on pdfjs-dist, which expects a few browser
// globals (DOMMatrix being the one that actually gets hit, for text-position
// transforms) that plain Node — including Vercel's serverless runtime —
// doesn't provide. Confirmed live: worked in local `tsx` runs (which must
// pick up some ambient global), threw "DOMMatrix is not defined" in
// production. Polyfilled once, lazily, only when actually needed.
async function ensureDomMatrixPolyfill(): Promise<void> {
  if (typeof (globalThis as any).DOMMatrix !== 'undefined') return;
  const mod = await import('dommatrix');
  (globalThis as any).DOMMatrix = (mod as any).default ?? mod;
}

export async function extractCvData(pdfBase64: string): Promise<AiResult<CvExtractOutput>> {
  let text: string;
  try {
    await ensureDomMatrixPolyfill();
    // Lazy import — pdf-parse pulls in a decent chunk of code, no reason to
    // pay that cost for api/ai-assist.ts's other code paths that never touch it.
    const { PDFParse } = await import('pdf-parse');
    const buffer = Buffer.from(pdfBase64, 'base64');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text || '';
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read the PDF.' };
  }

  if (text.trim().length < 30) {
    return { ok: false, error: 'Could not extract readable text from this PDF.' };
  }

  return {
    ok: true,
    data: {
      summary: extractSummary(text),
      skillTags: extractSkills(text),
      experienceLevel: inferExperienceLevel(text),
      experience: extractExperience(text),
      education: extractEducation(text),
      certifications: extractCertifications(text),
    },
  };
}
