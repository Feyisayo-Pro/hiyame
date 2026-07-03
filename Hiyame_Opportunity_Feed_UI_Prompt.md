# HIYAME — Opportunity Feed UI Prompt (v2)

---

## OVERVIEW

Design a **multi-screen mobile app UI** for Hiyame's candidate-facing opportunity feed. Hiyame is a privacy-first African talent marketplace that pushes matched roles to verified professionals — candidates never browse or apply. The visual language should feel like **dating-app discovery meets professional matching**: compatibility scores, swipe-style Pass/Interested actions, and curated match language throughout.

**Style:** Clean, modern, soft-gradient backgrounds, rounded corners everywhere, strong typographic hierarchy, Ionicons iconography (via `@expo/vector-icons`), tinted cards on light surfaces.

**Color palette:**

- Primary accent: sage green (`#43A047`)
- Background: off-white (`#FAFAFA`)
- Header tint: light mint (`#E8F5E9`)
- Corporate tier: sage green card (`#D7F0D0`), accent `#2E7D32`
- Blue-Collar tier: steel blue card (`#BBDEFB`), accent `#1565C0`
- Short-Term tier: lavender card (`#E1BEE7`), accent `#7B1FA2`
- Gig tier: warm amber card (`#FFE0B2`), accent `#E65100`
- Headings: near-black (`#1A1A1A`)
- Subtext: medium gray (`#6B7280`)
- Selected filter chips: dark charcoal (`#1A1A1A`) fill, white text
- Verified badge: green (`#43A047`)

**Typography:** Sans-serif system font (SF Pro / Inter); heading weight 800 26–28px, subheading 700 18–20px, body regular 13–14px, label/caption 600 11–12px.

**Corner radius:** 22–28px on cards, 50px on buttons and chips, 16–20px on info pills.

**Shared config:** All tier presentation (label, color, accent, icon) is driven by `TIER_CONFIG` in `lib/mock-data.ts`. Screens import this config rather than hardcoding tier colors.

---

## SCREEN 1 — ONBOARDING / SPLASH (`(auth)/welcome.tsx`)

**Layout:** Full-bleed splash screen. Background: off-white (`#FAFAFA`).

**Top zone:** Hiyame logo mark — a 56x56px rounded square (`#43A047` green fill) with a white `leaf` Ionicon centered. Animated entrance: fade + slide sequence.

**Hero card:** Centered card (90% width, ~300px height, 28px radius, white fill, soft shadow) containing:
- Decorative floating circles in sage green (opacity 0.15, various sizes, positioned around the card)
- Center: large `shield-checkmark` Ionicon (48px, `#43A047`) inside a circular green-tinted background

**Text block (below hero card, centered):**
- Line 1: `Opportunities` — weight 800, 32px, near-black
- Line 2: `Come to You` — weight 800, 32px, near-black, with green accent underline
- Tagline: `Get verified. Get matched. Get hired.` — 15px, gray

**CTA bar (bottom, pill button):**
- Full-width dark charcoal pill (`#1A1A1A`), 56px height, 50px radius
- Left: `Get Started` in white, weight 700, 17px
- Right: green circle (`#43A047`) with white `arrow-forward` Ionicon
- Press animation: scale to 0.97 on press

**Sign-in link:** `Already have an account? Sign In` — gray text, "Sign In" in green bold

---

## SCREEN 2 — ROLE SELECTION (`(auth)/register.tsx`)

**Layout:** Standard screen, off-white background.

**Top:** Back button (white circle, 40px, with `arrow-back` Ionicon), Hiyame logo mark (40x40, green, leaf icon), `Join Hiyame` title (28px, weight 800), subtitle explaining purpose.

**Role cards (2, vertically stacked):**
- Professional: `person-outline` Ionicon, for candidates seeking opportunities
- Company: `business-outline` Ionicon, for companies hiring

Each card: white fill, 16px radius, 2px border (gray default, green when selected), flexDirection row. Contains icon wrap (48px, rounded, gray bg / green bg when selected), text column (title + description), radio button (outer ring + inner dot).

**CTA:** Dark pill button, only visible when a role is selected. `Continue` + `arrow-forward` icon.

---

## SCREEN 3 — HOME DASHBOARD (`(candidate)/index.tsx`)

**Purpose:** Personalized overview — stats, quick actions, and top match previews. NOT a full feed. Drives users to the Opportunities tab for full exploration.

**Layout:** White background (`#FFFFFF`). No colored header zone — clean Eventor-inspired design.

**Header row:**
- Left: circular avatar (40px, `#E8F5E9` bg, `person` Ionicon) + greeting text ("Good morning") + user name (16px, weight 700)
- Right: notification bell in `#F9FAFB` circle button with red dot indicator

**Match banner (below header):**
- Full-width dark green (`#1B5E20`) rounded card (14px radius), flexDirection row
- Left: heart icon in semi-transparent white circle
- Center: `N new matches this week` title (15px, white, weight 700) + `Tap to explore all opportunities` subtitle
- Right: forward arrow icon
- Tapping navigates to Opportunities tab

**Stats row (3 equal cards):**
- Matches (heart icon, green), Saved (bookmark icon, blue), Intros (people icon, purple)
- Each card: white bg, `#F3F4F6` border, icon in tinted circle, large count (22px, weight 800), small label

**Quick actions (3 icon buttons):**
- Explore (compass), Verify (shield-checkmark), Profile (create)
- Each: 48px `#F0F9F0` rounded square with green border, label below

**Top Matches section:**
- Section header: `Top Matches` (18px, weight 800) + `See All` link (green)
- 3 compact horizontal list items (NOT full cards), each containing:
  - Compat ring (44px, tier accent border, score inside)
  - Title (15px, weight 700), tier dot + label + location, rate
  - Chevron arrow (right)
- Staggered fade + slide entrance animation

**Footer CTA:** `View All Matches` green-tinted button linking to Opportunities tab

---

## SCREEN 4 — EXPLORE MATCHES / FULL FEED (`(candidate)/opportunities.tsx`)

**Purpose:** Full scrollable feed with search, filters, and all matched opportunities. This is where candidates browse and act on roles.

**Layout:** White background. FlatList with ListHeaderComponent containing title, search bar, and filter chips.

**Header zone:**
- Title row: `Explore Matches` (24px, weight 800) + `Sorted by compatibility` subtitle + count badge (green pill `#1B5E20`, white text showing filtered count)
- **Search bar:** `#F9FAFB` rounded input (12px radius, 44px height, 1px `#F3F4F6` border) with search icon, placeholder `Search roles, skills, locations...`, clear button (close-circle icon) when text entered. Searches across title, industry, skills, and location fields.
- **Filter chips row (horizontal scroll, 5 chips):**
  - `All` | `Corporate` | `Blue-Collar` | `Short-Term` | `Gig`
  - Selected: `#1B5E20` fill, white text
  - Unselected: `#F9FAFB` fill, `#E5E7EB` border, dark text
  - Pill shape, 20px radius, 13px font weight 600

**Opportunity Cards (full cards with actions):**

Each card: white bg, 16px radius, 1px `#F3F4F6` border, subtle shadow. Anatomy:

- **Top row:** Tier pill (accent + `14` opacity bg, dot + uppercase label) + Compat ring (38px, tier accent border, score inside)
- **Company row:** Lock icon in `#F9FAFB` square (38px, 10px radius) + `Verified Company` with checkmark + industry/size subtitle
- **Role title:** 17px, weight 700
- **Rate:** 18px, weight 800 + gray suffix
- **Meta chips:** Location, contract length, experience level — each in `#F9FAFB` rounded chip with icon
- **Skills row:** Up to 3 green-tinted pills (`#F0F9F0`, `#E8F5E9` border) + `+N` overflow
- **Divider:** 1px `#F3F4F6` line
- **Action row:** Pass button (40px circle, `#F9FAFB`, X icon) + Interested button (flex, tier accent fill, heart icon + text) — or "Join Waitlist" for gig tier

**Empty state:** Search icon in gray circle, contextual title/subtitle based on whether search is active.

**Behavior:**
- Cards sorted by `match_score` descending
- Search filters across title, industry, skills, city, country
- Passed roles filtered from feed; pull-to-refresh resets passed roles and clears search
- Press scale animation on cards, staggered fade + slide entrance (60ms delay per card)

---

## SCREEN 5 — OPPORTUNITY DETAIL (`(candidate)/role/[id].tsx`)

**Layout:** Top ~25% is a tier-colored header zone (color from `tierHeaderColor` map — lighter variants of the tier colors). Bottom ~75% is white with rounded top corners (28px radius), overlapping the header slightly.

**Header zone:**
- Navigation row: back button (white circle, 40px, `arrow-back`) + centered `Opportunity Details` title (17px, weight 700) + bookmark button (white circle, `bookmark`/`bookmark-outline` toggle)
- Center: Company logo placeholder (white circle, 60px, `lock-closed` icon, soft shadow) with a decorative ring border (76px, 2px, white 40% opacity)

**White content zone:**
- **Title:** 24px, weight 800, centered, near-black, letter-spacing -0.5
- **Tier badge:** Small pill below title — tier icon + label, using tier accent color tint background
- **3-column info pills:** Rate, Contract, Location — each in a white pill with light border, icon on top, label in uppercase gray, value in bold
- **Match section:** Light green tinted card (`#F8FFF8`, green border) containing:
  - Sparkle icon in green circle + `Your Match` title + score badge (green or amber pill)
  - Checklist: green check-circles + match criteria text (skills matched, experience match, rate match, availability)
- **Required Skills:** Green-tinted pills with `checkmark-circle` icon per skill
- **Nice to Have:** Gray pills, plain text
- **About This Opportunity:** Body text (3 lines truncated) + `See More...` / `Show Less` toggle in green
- **Company info row:** Business icon + size band, layers icon + industry
- **Hidden card:** Light card with `lock-closed-outline` icon + `Company details revealed after mutual acceptance`

**Bottom action bar (sticky footer):**
- Left: Bookmark circle button (52px, gray bg, toggle icon)
- Right: Full-width pill CTA in tier accent color, with heart icon + label:
  - Non-gig: `I'm Interested` + `heart` icon (tier accent bg)
  - Gig: `Join Waitlist` + `time-outline` icon (amber `#E65100` bg)
- CTA has press scale animation (0.96) and shadow

---

## SCREEN 6 — NOTIFICATIONS (`(candidate)/notifications.tsx`)

**Layout:** Standard screen with header.

**Header:** `Notifications` title (26px, weight 800), filter Ionicon button (right).

**Empty state:** `notifications-outline` Ionicon (48px, gray) in a light circle, `You're all caught up` title, `New matches and updates will appear here` subtitle.

---

## SCREEN 7 — PROFILE (`(candidate)/profile.tsx`)

**Layout:** Standard screen with header.

**Header:** `Profile` title (26px, weight 800), settings gear Ionicon button (right).

**Avatar section:** Large avatar circle (80px, placeholder with `person` icon), verified badge overlay (green circle, `checkmark` icon), user name (20px, weight 700), `Verified Professional` subtitle in green.

**Stats row (3 columns):** Matches: 6 | Saved: 0 | Intros: 0 — each with count (20px bold) + label (12px gray).

**Empty state card:** `Profile editing coming soon` with sparkle icon.

---

## BOTTOM TAB BAR (`(candidate)/_layout.tsx`)

4 tabs: Home (`home`), Opportunities (`briefcase`), Alerts (`notifications`, with red dot badge), Profile (`person`).

Active state: icon wrapped in a green pill background (`#E8F5E9`), tinted.
Inactive: gray outline icon.

`role/[id]` route hidden from tabs via `href: null`.

---

## DESIGN PRINCIPLES

- **Dating-app feel.** Compatibility scores replace job-board metrics. "Interested" replaces "Apply." Cards have Pass/Interested actions like swipe apps. Language uses "match," "discover," "compatibility" throughout.
- **Privacy is core.** Company identity (name, logo) is hidden behind lock icons and frosted circles on all screens until mutual acceptance. Never use placeholder text — the lock icon communicates the mechanic visually.
- **No search, no browse, no apply.** Candidates receive matched opportunities. The feed is populated by the matching engine. Match summary pill replaces search UI. CTA is "I'm Interested" not "Apply."
- **4-tier system:** Corporate (large enterprise, 500+, sage green), Blue-Collar (skilled trades — welders, mechanics, electricians, construction, steel blue), Short-Term (contract/project, lavender), Gig (freelance/waitlisted, amber). All tier presentation driven by shared `TIER_CONFIG`.
- **Match score is the primary signal.** Displayed as a compatibility ring on cards and a score badge on detail screens. Cards sorted by score descending.
- **Gig waitlist.** Gig tier shows `—` instead of a score in the compat ring, and the CTA becomes `Join Waitlist`. Gig matching logic is not built yet (PRD §11).
- **Verified badge.** Reflects completion of Smile ID identity verification + other badge components per architecture doc §7.3.
- **Animations.** Cards use staggered fade + slide entrance. CTAs have press scale effects. Welcome screen has sequenced animations.
