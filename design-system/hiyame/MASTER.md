# Hiyame — Design System (MASTER)

Global source of truth for Hiyame's UI. Page-specific overrides, if any, live in
`design-system/hiyame/pages/<page>.md` and win over this file.

Distilled from the `ui-ux-pro-max` UI/UX skill's priority rules. That skill is
now vendored at `.claude/skills/ui-ux-pro-max/` (MIT, from
github.com/nextlevelbuilder/ui-ux-pro-max-skill) — query it for specific UX
outcomes, stack guidance, palettes, fonts, icons, and chart types:

```
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <ux|style|color|typography|icons|chart|...>
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack react-native
```

The skill's generic `--design-system` output does NOT override this file — the
pinned direction below (X-blue + Instagram type) always wins. Tokens here are
mirrored in code in `lib/theme.ts` — change both together.

---

## Direction

- **Accent:** X / Twitter blue — `#1DA1F2`. Already the app accent in both themes.
  It is the *only* brand hue; semantic colors (success / warning / danger) are
  separate and never stand in for it.
- **Typography:** Instagram-style — the platform **system font** (what
  instagram.com uses on web), with a tight, modern hierarchy. No custom
  typeface is loaded. Register one in `app/_layout.tsx` `useFonts()` and set
  `FONT_FAMILY` in `lib/theme.ts` only if a branded face is later required.
- **Feel:** clean, content-first, minimal chrome. Not everything is a card —
  spend border / fill / radius / shadow by role, to lift the one thing that
  needs lifting.
- **Platforms:** React Native (Expo) + React Native Web. Mobile-first; the web
  build is the current delivery surface.

---

## Color tokens

Consume via `useTheme()` — never a raw hex in a component. Full values in
`lib/theme.ts` (`LIGHT` / `DARK`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F8F9FA` | `#0D0D0C` | screen background |
| `card` | `#FFFFFF` | `#161615` | raised surface / list rows |
| `surface` | `#F0F1F3` | `#232322` | inset fields, chips |
| `accent` | `#1DA1F2` | `#1DA1F2` | primary action, links, active nav |
| `accentBg` | `rgba(29,161,242,.08)` | `rgba(29,161,242,.12)` | accent-tinted fill |
| `textPrimary` | `#14171A` | `#F5F5F4` | headings, body |
| `textSecondary` | `#536471` | `#A3A3A2` | supporting text |
| `textMuted` | `#6E7B8B` | `#6B6B6A` | metadata, placeholders |
| `emerald` / `danger` / `amber` / `indigo` | see file | see file | success / error / warning-pending / info — semantic only |
| `border` | `#E1E8ED` | `#2A2A29` | hairlines, dividers |

Contrast: body/`textPrimary` and `textSecondary` on `bg`/`card` clear 4.5:1 in
both themes. `textMuted` is for non-essential text only — don't put anything a
user must read in it. Accent `#1DA1F2` on white is ~2.9:1 — fine for a large
button fill with white text, **not** for accent-colored body text on white; use
`accentDim` (`#0C7ABF`) when accent text must sit on a light ground.

---

## Typography scale  (`TYPE` in `lib/theme.ts`)

System font. `fontWeight` values are strings (RN requirement).

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 28 / 32 | 800 | -0.4 | screen title, one per screen |
| `title` | 22 / 27 | 800 | -0.3 | section hero |
| `heading` | 17 / 22 | 700 | -0.2 | card title, list-group header |
| `body` | 15 / 22 | 400 | 0 | default running text |
| `bodyStrong` | 15 / 22 | 600 | 0 | emphasized body, names |
| `callout` | 13 / 18 | 500 | 0 | secondary/meta text |
| `caption` | 12 / 16 | 500 | +0.1 | timestamps, counts |
| `overline` | 11 / 14 | 700 | +0.6 | ALL-CAPS section labels — tracking is load-bearing |

Body text sits at 15 (RN density convention) rather than 16; never below 12 for
anything readable. Headings get tight line-height and slight negative tracking;
uppercase labels get positive tracking or they read as a solid block.

## Spacing (`SPACING`) & radius (`RADIUS`)

- Spacing: 4-point — `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32`.
  Lay siblings out with flex/grid `gap`, not per-element margins.
- Radius by role — `chip 8 · control 12 · card 16 · sheet 20 · pill 999`.
  Don't stamp one radius on everything.

---

## Non-negotiable rules (priority order, from the skill)

1. **Accessibility (CRITICAL)** — text contrast ≥ 4.5:1; every image/icon that
   carries meaning has a text alternative; keyboard/focus order works and the
   focus ring is visible (never remove it); icon-only buttons carry
   `accessibilityLabel` + `accessibilityRole="button"`.
2. **Touch & interaction (CRITICAL)** — interactive targets ≥ 44×44 (`MIN_TOUCH`;
   use `hitSlop` when the visual is smaller); ≥ 8px between adjacent targets;
   every async action shows immediate feedback (disabled + spinner/label
   change); nothing depends on hover alone; state changes animate (~150–250ms),
   never 0ms.
3. **Performance (HIGH)** — reserve space for async content (no layout shift);
   lazy-load / virtualize long lists; images sized, not reflowing.
4. **Style consistency (HIGH)** — one visual language; **SVG / icon font, never
   emoji as UI icons**; don't mix flat and skeuomorphic at random.
5. **Layout & responsive (HIGH)** — mobile-first; no horizontal page scroll
   (wide tables/code/diagrams scroll inside their own container); never disable
   zoom; no fixed-px widths wider than the smallest screen.
6. **Typography & color (MEDIUM)** — use the `TYPE` tokens, not ad-hoc
   `fontSize`; semantic color tokens only, no raw hex in components; no
   gray-on-gray.
7. **Animation (MEDIUM)** — timing matches context (small toggles fast, page
   transitions slower); motion carries meaning / spatial continuity; exit
   faster than enter; honor `prefers-reduced-motion` / RN `AccessibilityInfo`;
   animate `transform`/`opacity`, not `width`/`height`.
8. **Forms & feedback (MEDIUM)** — visible labels (never placeholder-as-label);
   errors inline next to the field, not only summarized at the top; helper text
   before the error; progressive disclosure over one overwhelming form.
9. **Navigation (HIGH)** — predictable back; ≤ 5 items in bottom nav; support
   deep links.
10. **Charts & data (LOW)** — legends + tooltips; never color alone to encode a
    category; label the values the marks actually reach.

## Anti-patterns — do not ship

Emoji as icons · placeholder-only labels · error messages only at the top of a
form · one transition duration for everything · animating `width`/`height` ·
`opacity:0` content waiting on a scroll observer to appear · gray text on a gray
fill · raw hex literals in component styles · icon-only buttons with no label ·
removing the focus outline · fixed-px container widths · disabling pinch-zoom.

---

## Stack notes (React Native + RN Web)

- Theme through `useTheme()`; build `StyleSheet`s inside `useMemo(() => makeStyles(T), [T])`.
- Icon-only `Pressable` → `accessibilityRole="button"` + `accessibilityLabel`, and `hitSlop` if under 44px.
- `mailto:` / `tel:` / external URLs → `Linking.openURL(...)`.
- Alerts/confirms → `lib/notify.ts` (`Alert.alert` is a no-op on web).
- Web keeps inactive route screens mounted — don't assume a screen unmounts on tab change.
