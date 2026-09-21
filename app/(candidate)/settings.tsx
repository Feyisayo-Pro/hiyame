import AccountSettings from '@/components/AccountSettings';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CandidateSettingsTab() {
  usePersonaGuard('candidate');
  return <AccountSettings persona="candidate" />;
}
