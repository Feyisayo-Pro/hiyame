import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Permanently deletes the caller's own account. The client can't do this
// itself — removing the auth.users row needs the service role, same as
// api/notify-introduction.ts's pattern (bearer token in, admin client
// verifies it, then acts with elevated privilege on that user's own data).
//
// Candidate: deletes their `candidates` row — verification_records,
// match_scores and introductions all reference candidate_id with
// `on delete cascade`, so their whole history goes with it.
// Company user: deletes just their `company_users` membership, UNLESS
// they're the last member of that company, in which case the whole
// company (and its roles / match_scores / introductions, all cascading)
// goes too — an orphaned company with zero members serves no one.
//
// Either way, the auth.users row itself is deleted last, after the app data
// is gone, so a failure partway through never leaves a signed-in user with
// no profile.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  const { data: candidate } = await admin
    .from('candidates')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  // Storage cleanup for whichever row actually gets deleted below — found
  // during a compliance audit: the DB row disappearing (and its cascades)
  // never touched the uploaded photo/logo file itself. The path is
  // deterministic (`${id}.${ext}`) but the extension isn't recorded
  // separately from the URL, so try all three formats the upload endpoints
  // accept; removing a path that was never uploaded is a silent no-op, not
  // an error, so this is safe to call unconditionally.
  const IMAGE_EXTS = ['jpg', 'png', 'webp'];
  const removeStoredImage = async (bucket: string, id: string) => {
    await admin.storage.from(bucket).remove(IMAGE_EXTS.map((ext) => `${id}.${ext}`));
  };

  if (candidate) {
    await removeStoredImage('candidate-photos', candidate.id);
    const { error } = await admin.from('candidates').delete().eq('id', candidate.id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { data: companyUser } = await admin
      .from('company_users')
      .select('id, company_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (companyUser) {
      const { count } = await admin
        .from('company_users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyUser.company_id)
        .neq('id', companyUser.id);

      if (!count) {
        // Last member — take the whole company (and its logo) with them.
        await removeStoredImage('company-logos', companyUser.company_id);
        const { error } = await admin.from('companies').delete().eq('id', companyUser.company_id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await admin.from('company_users').delete().eq('id', companyUser.id);
        if (error) return res.status(500).json({ error: error.message });
      }
    }
  }

  const { error: deleteUserErr } = await admin.auth.admin.deleteUser(authUserId);
  if (deleteUserErr) return res.status(500).json({ error: deleteUserErr.message });

  return res.status(200).json({ ok: true });
}
