// Server-only. Calls Anthropic's Messages API directly via fetch — no SDK
// dependency, same lightweight shape as lib/email.ts's Resend wrapper.
// Requires ANTHROPIC_API_KEY in the environment (a Vercel project env var,
// never committed, never EXPO_PUBLIC_ — same posture as RESEND_API_KEY).
// Every exported function returns { ok: false, skipped: true } rather than
// throwing when the key isn't set, so a deploy without it degrades to a
// clear "not configured" response instead of a crash.

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

interface AiResult<T> {
  ok: boolean;
  data?: T;
  skipped?: boolean;
  error?: string;
}

type MessageContent = string | Array<Record<string, unknown>>;

// The "assistant prefill" trick: seeding the assistant turn with "{" biases
// the model into continuing valid JSON rather than wrapping it in prose or
// a markdown fence, so the caller can JSON.parse the response directly.
// Shared by every caller below — callJson for plain-text prompts, callJson
// WithDocument for the CV-extraction path, which needs a `document` content
// block instead of a plain string user turn.
async function callAnthropicJson<T>(systemPrompt: string, userContent: MessageContent, maxTokens: number): Promise<AiResult<T>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'ANTHROPIC_API_KEY not set' };

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: '{' },
        ],
      }),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }

  const body = await resp.json().catch(() => null);
  if (!resp.ok) return { ok: false, error: body?.error?.message ?? `Anthropic ${resp.status}` };

  const text = body?.content?.[0]?.text;
  if (typeof text !== 'string') return { ok: false, error: 'Unexpected response shape from Anthropic.' };

  try {
    // The prefill "{" was sent as the start of the assistant turn but isn't
    // echoed back in the response text, so it has to be re-added before parsing.
    const parsed = JSON.parse(`{${text}`) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'Could not parse the AI response.' };
  }
}

function callJson<T>(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AiResult<T>> {
  return callAnthropicJson<T>(systemPrompt, userPrompt, maxTokens);
}

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

const NO_FABRICATION_RULE =
  'Only use the facts given below. Never invent company name, culture, benefits, team size, funding, ' +
  'or any other claim not explicitly provided — write around what is known rather than making something up.';

export async function draftJobDescription(input: DraftJdInput): Promise<AiResult<DraftJdOutput>> {
  const facts = [
    `Title: ${input.title}`,
    `Tier: ${input.tier}`,
    input.roleFunction ? `Function: ${input.roleFunction}` : null,
    `Must-have skills: ${input.mustHave.join(', ') || 'none given'}`,
    input.niceToHave.length ? `Nice-to-have skills: ${input.niceToHave.join(', ')}` : null,
    input.experienceLevel ? `Experience level: ${input.experienceLevel}` : null,
    input.employmentType ? `Employment type: ${input.employmentType}` : null,
    input.locationType ? `Location type: ${input.locationType}` : null,
    input.locationCity || input.locationCountry ? `Location: ${[input.locationCity, input.locationCountry].filter(Boolean).join(', ')}` : null,
    input.rateMin || input.rateMax ? `Rate: ${input.rateMin ?? '?'}–${input.rateMax ?? '?'} (${input.rateType ?? 'monthly'})` : null,
    input.contractLength ? `Contract length: ${input.contractLength}` : null,
  ].filter(Boolean).join('\n');

  const system =
    'You write concise, professional job descriptions for an African tech-hiring platform. ' +
    NO_FABRICATION_RULE +
    ' Respond with ONLY a JSON object, no markdown fences, no prose outside the JSON, matching exactly: ' +
    '{"overview": string, "responsibilities": string, "requirements": string}. ' +
    'Each value is plain text (no markdown), 2-4 sentences for overview, a short paragraph or a few sentences for the other two.';

  return callJson<DraftJdOutput>(system, facts, 700);
}

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
  const facts = [
    `Title: ${input.title}`,
    `Tier: ${input.tier}`,
    `Must-have skills (${input.requiredSkills.mustHave.length}): ${input.requiredSkills.mustHave.join(', ') || 'none'}`,
    `Nice-to-have skills (${input.requiredSkills.niceToHave.length}): ${input.requiredSkills.niceToHave.join(', ') || 'none'}`,
    input.experienceLevel ? `Experience level: ${input.experienceLevel}` : null,
    input.locationType ? `Location type: ${input.locationType}` : null,
    input.rateMin != null || input.rateMax != null ? `Rate range: ${input.rateMin ?? '?'}–${input.rateMax ?? '?'}` : 'Rate range: not set',
    `Candidates matched so far: ${input.matchCount}`,
    `Average match score: ${input.avgScore != null ? input.avgScore.toFixed(1) : 'n/a'}`,
    `Candidates the company skipped: ${input.skippedCount}`,
    `Candidates the company saved: ${input.savedCount}`,
  ].join('\n');

  const system =
    'You review a job posting\'s real performance data on a hiring platform and suggest concrete, specific ' +
    'improvements to reach more matching candidates. ' +
    NO_FABRICATION_RULE +
    ' Ground every suggestion in the actual numbers given (e.g. a long must-have list, zero matches, a rate ' +
    'below what the role\'s tier/experience level would need) — do not give generic hiring advice unrelated to ' +
    'this data. Respond with ONLY a JSON object, no markdown fences, no prose outside the JSON, matching exactly: ' +
    '{"suggestions": string[]}. 3 to 5 suggestions, each one short sentence, plain text.';

  return callJson<BoostRoleOutput>(system, facts, 500);
}

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

// Claude reads the PDF directly as a document content block — no separate
// text-extraction library needed. Dates are asked for in YYYY-MM-DD (or
// null if the CV only gives a year/month); the caller is responsible for
// only writing extracted data into fields that are currently empty.
export async function extractCvData(pdfBase64: string): Promise<AiResult<CvExtractOutput>> {
  const system =
    'You extract structured data from an uploaded CV/résumé PDF for a hiring platform. ' +
    'Only report what the document actually says — never invent a skill, employer, date, or qualification ' +
    'that isn\'t genuinely there, and use null for anything not stated rather than guessing. ' +
    'Respond with ONLY a JSON object, no markdown fences, no prose outside the JSON, matching exactly: ' +
    '{"summary": string|null, "skillTags": string[], "experienceLevel": "junior"|"mid"|"senior"|"lead"|null, ' +
    '"experience": [{"jobTitle": string, "companyName": string|null, "startDate": string|null, "endDate": string|null, "isCurrent": boolean, "description": string|null}], ' +
    '"education": [{"institution": string, "qualification": string, "fieldOfStudy": string|null, "startDate": string|null, "endDate": string|null}], ' +
    '"certifications": [{"name": string, "issuingOrganization": string|null, "issueDate": string|null, "expiryDate": string|null}]}. ' +
    'Dates as YYYY-MM-DD when a day is known, YYYY-MM-01 when only month/year is known, or null. ' +
    '"summary" is a 2-3 sentence professional summary synthesized from the CV (not copied verbatim). ' +
    'experienceLevel is your best read of their overall seniority from the work history.';

  const content = [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
    { type: 'text', text: 'Extract this CV into the JSON shape described in the system prompt.' },
  ];

  return callAnthropicJson<CvExtractOutput>(system, content, 1500);
}
