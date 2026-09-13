// Small shared formatting helpers used across screens. `initials` used to be
// copy-pasted verbatim in app/(company)/index.tsx and app/(company)/shortlist.tsx
// (flagged in the code-health review) — one real export now.
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
