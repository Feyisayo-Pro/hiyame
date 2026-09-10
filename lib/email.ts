// Server-only. Sends transactional email through Resend. Requires
// RESEND_API_KEY (a restricted send-only key) and EMAIL_FROM in the
// environment — set as Vercel project env vars, never shipped to the client.
//
// EMAIL_FROM defaults to "Hiyame <onboarding@resend.dev>", which Resend only
// delivers to the account owner's own address. Once a domain is verified at
// resend.com/domains, set EMAIL_FROM to an address on that domain (e.g.
// "Hiyame <notifications@hiyame.com>") and real recipients work — no code
// change needed.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM = process.env.EMAIL_FROM || 'Hiyame <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'https://hiyame-five.vercel.app';

const ACCENT = '#1DA1F2';

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };
  if (!opts.to) return { ok: false, error: 'no recipient' };

  let resp: Response;
  try {
    resp = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }

  const body = await resp.json().catch(() => null);
  if (!resp.ok) return { ok: false, error: body?.message ?? `Resend ${resp.status}` };
  return { ok: true, id: body?.id };
}

// ── Layout ──────────────────────────────────────────────────────────────
function shell(heading: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  const button = cta
    ? `<tr><td style="padding-top:24px">
         <a href="${cta.href}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:12px">${cta.label}</a>
       </td></tr>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #e1e8ed;border-radius:16px;overflow:hidden">
          <tr><td style="padding:22px 28px;border-bottom:1px solid #e1e8ed">
            <span style="font-size:18px;font-weight:800;letter-spacing:-0.3px;color:#14171a">Hiyame</span>
          </td></tr>
          <tr><td style="padding:28px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:19px;font-weight:800;color:#14171a;letter-spacing:-0.2px;padding-bottom:12px">${heading}</td></tr>
              <tr><td style="font-size:15px;line-height:1.55;color:#536471">${bodyHtml}</td></tr>
              ${button}
            </table>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #e1e8ed;font-size:12px;color:#8899a6">
            You're receiving this because of activity on your Hiyame account.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

// ── Templates ───────────────────────────────────────────────────────────

// Introduction sent — to the candidate. Company identity stays masked
// (function + size band only), per architecture doc §7.4.
export function introductionSentEmail(p: {
  roleTitle: string;
  roleFunction: string | null;
  companyIndustry: string | null;
  companySizeRange: string | null;
  hoursToRespond: number;
}): { subject: string; html: string } {
  const band = [p.companyIndustry, p.companySizeRange].filter(Boolean).join(' · ') || 'a company on Hiyame';
  return {
    subject: `A company wants to connect — ${p.roleTitle}`,
    html: shell(
      'A company wants to connect',
      `<p style="margin:0 0 12px">You've been matched to <b>${esc(p.roleTitle)}</b>${p.roleFunction ? ` (${esc(p.roleFunction)})` : ''} at ${esc(band)}.</p>
       <p style="margin:0">The company's identity is revealed once you accept. You have <b>${p.hoursToRespond} hours</b> to respond.</p>`,
      { label: 'Review the introduction', href: `${APP_URL}/opportunities` },
    ),
  };
}

// Introduction accepted — to the company. Candidate contact revealed.
export function introductionAcceptedCompanyEmail(p: {
  roleTitle: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
}): { subject: string; html: string } {
  const lines = [
    p.candidateEmail ? `Email: <a href="mailto:${esc(p.candidateEmail)}" style="color:${ACCENT}">${esc(p.candidateEmail)}</a>` : null,
    p.candidatePhone ? `Phone: ${esc(p.candidatePhone)}` : null,
  ].filter(Boolean);
  return {
    subject: `${p.candidateName} accepted your introduction — ${p.roleTitle}`,
    html: shell(
      `${esc(p.candidateName)} accepted`,
      `<p style="margin:0 0 12px"><b>${esc(p.candidateName)}</b> accepted your introduction for <b>${esc(p.roleTitle)}</b>. You can reach out directly:</p>
       <p style="margin:0">${lines.join('<br>') || 'Contact details are on the introduction in-app.'}</p>`,
      { label: 'Open in Hiyame', href: `${APP_URL}/messages` },
    ),
  };
}

// Halfway-point reminder — to the candidate. Still masked.
export function introductionReminderEmail(p: {
  roleTitle: string;
  companyIndustry: string | null;
  companySizeRange: string | null;
  hoursLeft: number;
}): { subject: string; html: string } {
  const band = [p.companyIndustry, p.companySizeRange].filter(Boolean).join(' · ') || 'a company on Hiyame';
  return {
    subject: `Reminder: respond to your introduction — ${p.roleTitle}`,
    html: shell(
      'Your introduction is still waiting',
      `<p style="margin:0 0 12px">You have <b>${p.hoursLeft} hour${p.hoursLeft === 1 ? '' : 's'}</b> left to respond to the introduction for <b>${esc(p.roleTitle)}</b> at ${esc(band)}.</p>
       <p style="margin:0">If you don't respond by the deadline it will expire and the company won't be able to connect.</p>`,
      { label: 'Respond now', href: `${APP_URL}/opportunities` },
    ),
  };
}

// Introduction expired — to the company. No candidate response in the window.
export function introductionExpiredEmail(p: {
  roleTitle: string;
  candidateName: string;
}): { subject: string; html: string } {
  return {
    subject: `Introduction expired — ${p.roleTitle}`,
    html: shell(
      'An introduction expired',
      `<p style="margin:0 0 12px"><b>${esc(p.candidateName)}</b> didn't respond to your introduction for <b>${esc(p.roleTitle)}</b> within the response window, so it has expired.</p>
       <p style="margin:0">Their seat on the shortlist is free again — you can send another introduction from the role's shortlist.</p>`,
      { label: 'View the shortlist', href: `${APP_URL}/roles` },
    ),
  };
}

// Introduction accepted — to the candidate. Company + hiring contact revealed.
export function introductionAcceptedCandidateEmail(p: {
  roleTitle: string;
  companyName: string;
  hiringContactName: string | null;
  hiringContactEmail: string | null;
}): { subject: string; html: string } {
  const lines = [
    p.hiringContactName ? `Contact: ${esc(p.hiringContactName)}` : null,
    p.hiringContactEmail ? `Email: <a href="mailto:${esc(p.hiringContactEmail)}" style="color:${ACCENT}">${esc(p.hiringContactEmail)}</a>` : null,
  ].filter(Boolean);
  return {
    subject: `You're connected with ${p.companyName} — ${p.roleTitle}`,
    html: shell(
      `You're connected with ${esc(p.companyName)}`,
      `<p style="margin:0 0 12px">Your introduction for <b>${esc(p.roleTitle)}</b> at <b>${esc(p.companyName)}</b> is confirmed. Here's how to reach them:</p>
       <p style="margin:0">${lines.join('<br>') || 'Contact details are on the introduction in-app.'}</p>`,
      { label: 'Open in Hiyame', href: `${APP_URL}/messages` },
    ),
  };
}
