// Supabase's own signUp() error text ("User already registered") is accurate
// but terse — surfaced as-is it just reads as a generic failure. This turns
// it into the one thing a signup screen actually needs to say: this exact
// scenario is the real answer to "I hope candidate and company don't share
// a login" — Supabase itself refuses a second signUp() on an existing email
// before any app code runs (verified live against the project), so the only
// way to see this message is genuinely already having an account.
export function friendlyAuthError(message: string): string {
  if (isAlreadyRegistered(message)) {
    return 'This email already has a Hiyame account. Sign in instead, or use a different email to create a separate one.';
  }
  return message;
}

// Matches both Supabase's raw wording and this file's own friendlyAuthError()
// output, so callers can check either the original error or the already-
// transformed message stored in UI state.
export function isAlreadyRegistered(message: string): boolean {
  return /already registered|already has a hiyame account/i.test(message);
}
