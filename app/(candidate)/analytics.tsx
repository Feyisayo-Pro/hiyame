import AnalyticsScreen from '@/components/AnalyticsScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CandidateAnalyticsTab() {
  usePersonaGuard('candidate');
  return <AnalyticsScreen persona="candidate" />;
}
