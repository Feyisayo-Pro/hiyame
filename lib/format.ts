// Small shared formatting helpers used across screens. `initials` used to be
// copy-pasted verbatim in app/(company)/index.tsx and app/(company)/shortlist.tsx
// (flagged in the code-health review) — one real export now.
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// A scheduled interview's date/time, read by a human — same shape
// lib/email.ts's interviewScheduledEmail already used (that one was fine;
// app/(company)/interviews.tsx and app/(candidate)/interviews.tsx were
// still on bare `.toLocaleString()`, which emits locale-default junk like
// "10/7/2026, 2:30:00 PM" — seconds included, no weekday, no real
// formatting). One shared export so every screen reads the same way.
export function formatInterviewTime(when: string | Date): string {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
