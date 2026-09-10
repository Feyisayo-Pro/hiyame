# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# UI / UX

Any work that changes how something looks, feels, moves, or is interacted with
follows `design-system/hiyame/MASTER.md` — the palette (X-blue accent), the
Instagram-style type scale (`TYPE` / `SPACING` / `RADIUS` in `lib/theme.ts`),
and the priority rules (accessibility and touch targets first). Use the tokens,
not ad-hoc `fontSize` / hex.

The `ui-ux-pro-max` skill is vendored at `.claude/skills/ui-ux-pro-max/`.
Query it for UX rules / stack guidance:
`python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack react-native`
(or `--domain ux|color|typography|icons|chart`). Its generic design-system
output never overrides MASTER.md's pinned direction.
