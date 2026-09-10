import { supabase } from './supabase';

// Contact details revealed once an introduction is accepted (architecture doc
// §7.4). The get_introduction_contact RPC only returns a row when the caller
// is one of the two parties and the introduction status is 'accepted';
// otherwise this resolves to null.
export interface IntroductionContact {
  introductionId: string;
  companyId: string;
  companyName: string;
  companyWebsite: string | null;
  companyIndustry: string | null;
  companySizeRange: string | null;
  hiringContactName: string | null;
  hiringContactEmail: string | null;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
}

// Matches get_introduction_contact()'s RETURNS TABLE columns — no generated
// Supabase types exist in this project, so .rpc() is otherwise untyped.
interface IntroductionContactRow {
  introduction_id: string;
  company_id: string;
  company_name: string;
  company_website: string | null;
  company_industry: string | null;
  company_size_range: string | null;
  hiring_contact_name: string | null;
  hiring_contact_email: string | null;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
}

export async function getIntroductionContact(
  introductionId: string,
): Promise<IntroductionContact | null> {
  const { data, error } = await supabase
    .rpc('get_introduction_contact', { p_introduction_id: introductionId })
    .maybeSingle<IntroductionContactRow>();
  if (error || !data) return null;
  return {
    introductionId: data.introduction_id,
    companyId: data.company_id,
    companyName: data.company_name,
    companyWebsite: data.company_website,
    companyIndustry: data.company_industry,
    companySizeRange: data.company_size_range,
    hiringContactName: data.hiring_contact_name,
    hiringContactEmail: data.hiring_contact_email,
    candidateName: data.candidate_name,
    candidateEmail: data.candidate_email,
    candidatePhone: data.candidate_phone,
  };
}
