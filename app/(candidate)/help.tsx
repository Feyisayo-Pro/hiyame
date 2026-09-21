import HelpCenterScreen from '@/components/HelpCenterScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CandidateHelpTab() {
  usePersonaGuard('candidate');
  return <HelpCenterScreen persona="candidate" />;
}
