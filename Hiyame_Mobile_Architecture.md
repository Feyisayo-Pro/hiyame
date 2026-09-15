# Hiyame — Mobile Architecture Document

**Status:** Proposed
**Date:** 20 June 2026
**Author:** Feyisayo (Strivo Labs)
**Deciders:** Feyisayo, Mayo (MD)
**Source documents:** `Hiyame_PRD_v1_2026.pdf` (v1.0, company-side perspective), prior cost estimate in `Next_Steps_Digital_Products_Recruitment_MVP.docx` (Section 2)

---

## 1. Context

The Hiyame PRD (v1.0) specifies Phase 1 as a **responsive web app**, with native mobile explicitly deferred to Phase 3 ("Mobile app. Phase 3. Phase 1 is a responsive web app that works on mobile but is not native" — PRD §11). A separate cost estimate already exists for that original web plan: Next.js + Vercel for the frontend, Supabase for backend, Cloudflare R2 for storage, Smile ID for identity verification, Stripe for billing, Resend for email.

Leadership has since decided to build Hiyame as a **native mobile app instead of web**, covering both company users and candidates, with mobile replacing the web app entirely rather than running alongside it. This document supersedes the web-frontend portion of that earlier plan. It keeps the backend choices (Supabase, Smile ID, R2, Stripe, Resend) that were already researched and costed, and replaces Next.js/Vercel with a mobile framework and mobile-specific tooling.

This is a sequencing change, not a scope change: everything the PRD marks out of scope for Phase 1 (§11) — Gig-tier matching, ATS integration, candidate re-engagement pool, in-app review submission, ML matching, referral tracking, bulk hiring pipelines — stays out of scope here too. Only the delivery surface (native mobile vs. responsive web) is changing, ahead of the PRD's original schedule.

**A gap worth naming up front:** the PRD is explicitly written from the company-side perspective. It does not specify candidate-side screens, onboarding, or verification flows in the same detail. Sections 6–8 of this document describe candidate-side behavior as *inferred* from what the company-side PRD implies (e.g. candidates must respond to introductions within a tier-specific window, must complete verification steps, etc.). Treat these as a starting assumption to confirm with Mayo, not as settled spec, before Claude Code builds candidate-facing screens.

## 2. Constraints

- **Team:** solo build (Feyisayo), using Claude Code as the primary development tool. No dedicated mobile or backend engineer.
- **Budget:** cost-conscious / bootstrapped — this is why the stack favors usage-based pricing (Supabase, Cloudflare R2, Resend) over fixed monthly platform fees wherever possible.
- **Timeline:** matches the PRD's Phase 1 scope (Corporate + Short-Term tiers, rule-based matching, Verified badge, Pilot/Starter/Growth/Enterprise plan gating). Gig tier ships as a non-functional UI stub with a waitlist, per PRD §11.
- **Platform:** must run on iOS and Android from a single codebase — a second native codebase is not feasible solo.
- **Existing decisions to preserve:** Supabase (Postgres + Auth + Storage + Edge Functions), Cloudflare R2 (video/document storage), Smile ID (identity verification), Stripe (success-fee billing), Resend (email).

## 3. Users and Roles

| Role | Side | Source |
|---|---|---|
| Hiring Manager | Company | PRD §2 — posts roles, reviews shortlists, decides on introductions. Usually Pilot/Starter plan. |
| Talent Lead / Operations | Company | PRD §2 — manages multiple roles/slots, needs cross-role visibility and analytics. Usually Growth/Enterprise plan. |
| Candidate | Talent | Inferred, not detailed in PRD v1.0 — builds a profile, completes Verified-badge steps, receives and responds to introduction requests. |

Both company roles share one interface (per PRD §2); the difference is which plan-gated features they see. Candidates are a structurally different user type with their own onboarding, profile, and verification flow.

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Mobile app (React Native + Expo)                       │
│  ┌───────────────────────┐  ┌───────────────────────┐   │
│  │ Candidate experience  │  │ Company experience    │   │
│  │ profile, verification,│  │ post role, shortlist,  │   │
│  │ browse, respond       │  │ introductions, plan    │   │
│  └───────────────────────┘  └───────────────────────┘   │
└──────────────────────────┬────────────────────────────────┘
                           │ supabase-js (REST + Realtime)
┌──────────────────────────▼────────────────────────────────┐
│  Supabase backend                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Auth + DB   │  │ Storage      │  │ Edge Functions     │ │
│  │ Postgres,   │  │ resumes,     │  │ matching engine,    │ │
│  │ RLS by role │  │ attachments  │  │ badge gating, jobs  │ │
│  └─────────────┘  └──────────────┘  └───────────────────┘ │
└───────┬───────────────┬───────────────┬───────────────┬───┘
        │               │               │               │
   ┌────▼────┐    ┌─────▼────┐   ┌──────▼─────┐   ┌─────▼──────┐
   │ Smile ID│    │ Stripe   │   │ Resend     │   │ Cloudflare │
   │ identity│    │ success- │   │ email      │   │ R2 — video │
   │ verify  │    │ fee bill │   │ alerts     │   │ + documents│
   └─────────┘    └──────────┘   └────────────┘   └────────────┘
```

Push notifications (Expo push service, see ADR-4) and crash/performance monitoring (Sentry, see ADR-5) wrap the mobile app itself and aren't shown as backend boxes above.

## 5. Technology Decisions

Each decision below follows: Context → Decision → Options considered → Trade-offs → Consequences. Alternatives are listed deliberately, per the standing instruction to flag what should be researched before treating any of this as final.

### ADR-1: Mobile framework — React Native + Expo

**Context:** Need one codebase covering iOS + Android, buildable and maintainable by a solo developer working with Claude Code, with no dedicated native mobile engineer.

**Decision:** React Native, using the Expo managed workflow and EAS (Build, Update, Submit).

**Options considered:**

| Dimension | React Native + Expo | Flutter | Native (Swift + Kotlin) |
|---|---|---|---|
| Language | JavaScript/TypeScript — same family as the Supabase backend code | Dart — new language | Swift + Kotlin — two codebases |
| Solo-dev build effort | Low — EAS removes most native tooling/DevOps | Medium — single codebase, different toolchain | High — effectively two builds |
| Performance ceiling | Good; New Architecture (Fabric) closing the gap | Slightly better for heavy animation/graphics | Best, but not the bottleneck for this app |
| Hiring pool (if Mayo brings in help later) | Large (JS/TS) | Smaller (Dart) | Large but split across two skill sets |
| OTA hotfixes | Yes — EAS Update ships JS fixes without app-store review | Possible but less turnkey | No — every fix needs a store review |

**Trade-offs:** Flutter is a legitimate alternative if Hiyame's UI ever needs heavy custom animation or graphics work that React Native struggles with — worth revisiting only if that becomes a real requirement, not a default. Native is the highest-quality option per platform but isn't realistic for a solo build on this timeline.

**Consequences:** Identity-verification and any other native-module dependency (see ADR-3) must support Expo's managed workflow or be compatible with an Expo *development build* (`expo run`), since some native SDKs don't work inside Expo Go.

### ADR-2: Backend — keep Supabase

**Context:** Supabase (Postgres + Auth + Storage + Edge Functions) was already chosen and costed for the web build. The question is whether that choice still holds once the frontend becomes mobile-only.

**Decision:** Keep Supabase. It has official React Native/Expo client SDKs, and the matching-engine schema work already designed around Postgres carries over unchanged.

**Options considered:**

| Dimension | Supabase | Firebase | Custom Node backend |
|---|---|---|---|
| Data model fit | Relational — matches the matching-engine logic (scored joins across skills, experience, rate, location) | NoSQL (Firestore) — would require redesigning the matching schema | Relational, full control |
| Mobile-native tooling maturity | Good, growing (Auth, Storage, Realtime have RN SDKs; push notifications are not built in — see ADR-4) | More mature out of the box (FCM, Crashlytics, Analytics bundled) | None — build everything |
| Scaling path | Supavisor connection pooling (tested to ~1M concurrent clients), read replicas addable later | Scales well but pricing gets less predictable at high read/write volume | Fully manual — your responsibility |
| Solo-build effort | Low — most of backend logic is already designed | Medium — rework needed | High |

**Trade-offs:** Firebase remains the strongest alternative specifically because its mobile tooling (push, crash reporting, analytics) is more bundled — but switching now means re-deriving the data model and losing the matching-engine design work already done. Not worth it unless Supabase hits a specific wall.

**Consequences:** Push notifications need a third-party add-on (ADR-4) since Supabase doesn't provide this natively.

### ADR-3: Identity verification — Smile ID, Expo-compatible SDK

**Context:** PRD §8 requires identity verification as one of four Verified-badge components, with the explicit requirement that "Hiyame does not store the ID document itself — only the verification result." Smile ID was already chosen for African ID coverage in the original cost estimate.

**Decision:** Use `@smile_identity/react-native-expo`, Smile ID's official Expo-compatible package, with verification results delivered via a server-side callback (Supabase Edge Function), not client-side polling.

**Options considered:**

| Dimension | Native Expo SDK | Hosted web verification (WebView) |
|---|---|---|
| UX | Native camera/liveness flow, better completion rates | Camera handoff inside a WebView is clunkier |
| Build complexity | Requires an EAS development/production build (incompatible with Expo Go) | Lower native-integration risk |
| Maintenance risk | SDK version must track Expo SDK version; confirm compatibility before each Expo upgrade | Lower — it's just a link |

**Trade-offs:** The hosted WebView flow is the documented fallback if the native SDK breaks on an Expo upgrade or has integration issues mid-build — keep it as Plan B, don't build it preemptively.

**Consequences:** The verification flow can never be tested in Expo Go — every developer (even a solo one switching machines) needs a dev client build from day one. The backend must implement a callback endpoint keyed by `job_id`, and must confirm with Smile ID's data-flow docs that only the verification result (not raw biometric images) reaches Hiyame's database — this directly satisfies the PRD's own "do not store the ID document" requirement and should be verified, not assumed.

### ADR-4: Push notifications — Expo push service (default), OneSignal (upgrade path)

**Context:** PRD §6.1 and §6.5 require both email and in-app/push notifications for shortlist-ready alerts and introduction requests, with tier-specific response-window reminders (§6.5: one reminder at the halfway point of 72h/48h/24h).

**Decision:** Start with Expo's built-in push notification service — free, already integrated with the Expo/EAS toolchain.

**Options considered:**

| Dimension | Expo push | OneSignal | Firebase Cloud Messaging (raw) |
|---|---|---|---|
| Cost | Free | Free tier, then ~$19+/mo | Free (zero per-message cost) |
| Engineering effort | Lowest — already wired into Expo | Low — managed segmentation/A-B testing | Highest — must build scheduling/segmentation yourself |
| Fit for tier-specific reminder timing | Sufficient — this is simple scheduled sends, not marketing segmentation | Overkill at this stage | Sufficient but more to build |

**Trade-offs:** If Hiyame later wants segmented or marketing-style notifications (e.g. re-engagement campaigns to dormant candidates — itself a Phase 2 PRD item), OneSignal is the natural upgrade. Not needed for Phase 1's transactional alerts.

**Consequences:** The halfway-point reminder and 72h/48h/24h expiry logic (§6.5) needs a scheduled job — see §7.4 below — that checks pending introductions and fires both an Expo push and a Resend email.

### ADR-5: Stability tooling — Sentry + EAS Build/Update

**Context:** User explicitly asked for a "scalable and stable" build with no dedicated QA or ops support.

**Decision:** Sentry for React Native (crash + performance monitoring, free Developer tier to start) and EAS Update for shipping JS-only fixes without app-store review delay.

**Trade-offs:** None of the alternatives (Bugsnag, Firebase Crashlytics) offer a meaningfully better fit at this stage; Sentry's Expo-specific setup is the most documented path. Re-evaluate only if Sentry's paid tier (~$26/mo Team plan) becomes a real cost concern.

**Consequences:** Native-module changes (e.g. a new Smile ID SDK version) still require a full app-store review cycle; only JS/business-logic fixes get the fast OTA path.

### ADR-6: Service architecture pattern — modular monolith

**Context:** Matching engine, badge gating, plan enforcement, and billing triggers all need to live somewhere. The question is whether to split these into separate services now or keep them together.

**Decision:** A modular monolith — Supabase Postgres + a set of Edge Functions, organized by domain (matching, verification, billing, notifications) but deployed and scaled together.

**Trade-offs:** Microservices would add real operational overhead (separate deploys, inter-service auth, monitoring per service) with no current traffic to justify it. The one component worth watching is the matching engine — if it becomes compute-heavy as the talent pool grows, it's the most likely candidate to be pulled into its own service later.

**Consequences:** Keeps solo-build complexity manageable now; revisit only when a specific bottleneck is observed, not preemptively.

## 6. Data Model

This reflects the PRD's matching logic (§5), shortlist mechanics (§6), tier rules (§7), Verified badge (§8), and plan gating (§9) as closely as possible. Field names are suggestions for Claude Code to refine during implementation, not a frozen schema.

```
companies
  id, legal_name, trading_name, industry, size_range, hq_location, website_url,
  description (300 char max, PRD §3.1), plan_tier (pilot|starter|growth|enterprise),
  verified_at, billing_customer_id (Stripe), created_at

company_users
  id, company_id, email, role (hiring_manager|talent_lead), created_at

candidates
  id, full_name, email, phone, photo_url, function_tags (up to 3), skill_tags,
  experience_level (junior|mid|senior|lead), location, remote_preference,
  tier_preferences (corporate|short_term|gig — multi), rate_min, rate_preferred, rate_max,
  availability_date, reliability_score (0-100), verified_badge_status, last_verified_at,
  inactive_since, created_at

verification_records
  id, candidate_id, component (identity|video_intro|skills_assessment|employer_review),
  status (pending|passed|failed|resubmission), provider_ref (e.g. Smile ID job_id),
  reviewed_by (for video_intro — Hiyame team member), created_at, updated_at

portfolio_items
  id, candidate_id, title, description, created_at  -- up to 5 per PRD §5.1

employer_reviews
  id, candidate_id, reviewer_identity (internal only, never exposed), quality_rating,
  reliability_rating, communication_rating, would_rehire (bool), review_text,
  submitted_via (emailed_link — PRD §11, in-app review is Phase 2), created_at

job_slots
  id, company_id, status (free|active), plan_tier_at_creation, created_at

roles
  id, company_id, job_slot_id, tier (corporate|short_term|gig), title, function,
  required_skills (must_have[], nice_to_have[]), experience_level, location_type,
  location_city, location_country, contract_length, scope_of_work (gig only, 500 char max),
  rate_min, rate_max, rate_type, start_date, visibility_description,
  status (draft|matching|shortlisted|introductions_pending|filled|withdrawn), created_at

match_scores
  id, role_id, candidate_id, score (0-100), score_breakdown (jsonb — per-signal detail),
  rank, is_alternate (bool — top 5 vs next 10, PRD §5.3), created_at

introductions
  id, role_id, candidate_id, status (sent|accepted|declined|expired),
  response_window_hours (72|48|24 per tier, PRD §6.5), reminder_sent_at,
  sent_at, responded_at

hires
  id, role_id, candidate_id, marked_by (company_user_id), hired_at,
  success_fee_invoiced (bool), success_fee_amount

plans
  id, company_id, tier, slot_count, contract_type (none|annual|custom),
  success_fee_opted_in (bool), current_period_start, 

billing_events
  id, company_id, type (subscription|success_fee), stripe_event_id, amount, status, created_at
```

Row Level Security (Supabase) policies should enforce: company users can only read/write rows scoped to their `company_id`; candidates can only read/write their own candidate row and see role data only through the introduction flow (never raw role/company data outside an active introduction or shortlist match); no client-side query should be able to read another company's roles or another candidate's verification records.

## 7. Core Business Logic

### 7.1 Matching engine (PRD §5.2)

Implement as a Postgres function or Edge Function triggered when a role moves from `draft` to `matching`. Must replicate the PRD's exact rules, not an approximation:

- Must-have skill missing → score capped at 50, regardless of other signals.
- Nice-to-have overlap → proportional partial credit.
- Experience level: exact match or one level above → full credit; two or more levels below → **excluded**, not just penalized.
- Rate: candidate minimum within company maximum → full credit; above → partial credit + flag on card (Corporate/Short-Term) or **hard exclude** (Gig — no soft flag, per PRD §7.3).
- Availability: within 14 days of requested start → full credit; within 30 days → partial; beyond 30 days → low credit, not excluded.
- Location: remote+remote-open → full credit; on-site+willing-to-relocate → partial; on-site+unwilling+different city → excluded.
- Contract tier preference is a **hard filter**, not a score input — exclude candidates who haven't marked the posted tier as open.
- Reliability score and employer-review presence add small boosts only; do not heavily penalize low/missing values at launch (PRD explicitly notes reliability data is thin on a new platform).
- Exclude any candidate scoring below the threshold (start at 60, calibrate during beta — make this a configurable value, not a hardcoded constant).
- Talent pool is Verified-badge candidates only (full requirements vary by tier — see §7.3 below); unverified candidates never enter scoring at all.

### 7.2 Shortlist assembly (PRD §5.3)

Top 5 by score become the shortlist; next 10 become alternates (visible Starter and above, not pushed in notifications). If fewer than 5 clear the threshold, return what exists and flag "shallow pool" to the company rather than padding with weak matches.

### 7.3 Verified badge gating (PRD §8, §7)

Badge eligibility is tier-dependent, not a single global gate:

| Tier | Required components |
|---|---|
| Corporate | All 4: identity, video intro, skills assessment, ≥1 employer review |
| Short-Term | 3 of 4: identity, video intro, skills assessment (review preferred, not required — ranks below reviewed peers if scores tie) |
| Gig | All 4, no exceptions |

A candidate inactive 18+ months should be flagged for re-verification before appearing in any new shortlist (PRD §8). Build this as a scheduled check, not a real-time one.

### 7.4 Introduction lifecycle & timers (PRD §6.5)

On company "Accept": create an `introductions` row, notify the candidate (push + email via Resend) without revealing the company name yet — only function and company-size band. Start a response-window timer: 72h (Corporate), 48h (Short-Term), 24h (Gig). A scheduled job should: fire one reminder at the halfway point; mark as `expired`/declined if no response by the deadline; on acceptance, reveal full details to both sides (candidate's name/LinkedIn/email to company; company name/hiring-manager name/email to candidate) and notify both.

### 7.5 Plan gating (PRD §9)

Treat plan tier as a single source of truth checked at the API/Edge Function layer, not just hidden in the UI — every gated action (posting beyond slot count, accessing Gig tier, unlimited re-runs, analytics depth, ATS integration) must be enforced server-side, since a mobile client can be inspected or modified. Job slots: one active role per slot; slot frees on fill/withdraw; unused slots don't carry over billing periods (PRD §9).

### 7.6 Hire marking & billing (PRD §6.6)

Marking a hire (honour system, no independent verification at launch per PRD) should: update company hire history, feed the candidate's reliability score positively, retire the job slot, and — if the company opted into the success fee (Starter and above, 8–10% per PRD §9) — create a Stripe invoice via a billing Edge Function.

## 8. Security Considerations

- **Auth tokens:** Supabase Auth JWTs stored in Expo SecureStore (iOS Keychain / Android Keystore), not plain AsyncStorage. Enable refresh-token rotation.
- **Identity verification data:** confirm with Smile ID's docs that Hiyame's database stores only verification status + provider reference, never raw ID photos or liveness video (this is a PRD requirement, §8, not just a best practice).
- **File uploads** (resumes, portfolio attachments, video introductions): use short-lived, signed URLs to Cloudflare R2 / Supabase Storage. Never embed storage credentials in the mobile app bundle.
- **Row Level Security:** every table above needs an explicit policy — default-deny, then allow by role and ownership. Test that a candidate JWT cannot read another candidate's verification_records or another company's roles.
- **Payments:** Stripe handles card data directly (Hiyame never touches raw card numbers); success-fee invoicing should be idempotent against `billing_events.stripe_event_id` to avoid duplicate charges on retry/webhook redelivery.
- **Secrets:** Supabase service-role keys, Stripe secret keys, Smile ID API keys, and Resend API keys must never ship inside the mobile app bundle — they belong only in Edge Function environment variables, managed through Supabase's secrets store, not committed to the repo. Use short-lived, scoped tokens for any CI/CD automation (EAS, GitHub Actions) rather than broad personal access tokens.
- **npm/package hygiene:** install with `--ignore-scripts` by default; check any new third-party package (especially the Smile ID and payment-adjacent packages) on socket.dev before adding it.

## 9. Scalability & Reliability

- Supavisor (Supabase's connection pooler) handles high concurrent mobile client counts without a re-architecture; add read replicas only if read load becomes the bottleneck, not preemptively.
- The matching engine is the component most likely to need to be pulled out of the monolith first, if/when the talent pool and role-posting volume grow significantly — design its Edge Function with that extraction in mind (clear input/output contract, no hidden dependencies on other functions' internal state).
- EAS Update enables fast-follow fixes for JS-only bugs without waiting on app-store review; native-module changes still go through full review — plan release timing accordingly around App Store / Play Store review windows.
- Sentry gives crash/performance visibility from day one rather than discovering issues from user complaints.

## 10. CI/CD & Environments

- Three EAS build profiles: `development` (dev client, for local testing including Smile ID), `preview` (internal testing builds), `production` (store submission).
- Supabase: separate `staging` and `production` projects, with migrations tracked in version control and applied via Supabase CLI, not made manually in the dashboard.
- Apple Developer ($99/yr) and Google Play Developer ($25 one-time) accounts are new costs versus the original web plan; Vercel hosting is no longer needed.

## 11. Known Gaps and Risks

1. **No candidate-side PRD.** Sections 6–8 of this document infer candidate-facing behavior from the company-side PRD. Confirm actual candidate onboarding/profile/verification screens with Mayo before building them — this is the single biggest spec gap.
2. **Company mobile UX risk.** Recruiter workflows (filtering candidates, managing multiple slots, analytics) are traditionally desktop-friendly tasks. Watch for friction once Talent Lead users (Growth/Enterprise, multi-slot) are on a phone-sized screen — may need tablet-optimized layouts sooner than expected.
3. **Smile ID SDK / Expo version coupling.** The Expo-compatible Smile ID package must be re-verified for compatibility every time the Expo SDK is upgraded. Treat Expo upgrades as a task that includes "re-test Smile ID flow," not a routine dependency bump.
4. **Gig tier is a UI stub, not a feature.** Per PRD §11, Gig-tier matching (scope-of-work parsing, 4-hour SLA) is Phase 3 work. Build the tier-selection screen so it visually exists and routes to a waitlist, but do not build scoring logic for it yet — building it early would be scope creep against the PRD's own sequencing.
5. **This is a sequencing change leadership requested**, not a PRD revision — Mayo should be aware the PRD itself still says "Phase 1 is responsive web." Worth a short note back to leadership confirming this document is the authoritative override for the mobile decision.

## 12. Phase 1 Build Scope (what to build now)

In scope: company onboarding (PRD §3), role posting for Corporate and Short-Term tiers (§4), the rule-based matching engine (§5), shortlist UI and actions (§6), Verified badge flow for all 4 components with tier-dependent gating (§8), Pilot/Starter/Growth/Enterprise plan gating (§9), company dashboard (§10), Stripe success-fee billing, Resend email + Expo push notifications, Sentry monitoring, EAS build/release pipeline.

Explicitly out of scope for now (per PRD §11, unchanged by the mobile decision): Gig-tier matching logic (UI stub + waitlist only), ATS integration, candidate re-engagement pool, in-app employer-review submission (stays an emailed link), ML-based matching, referral tracking, bulk hiring pipelines.
 