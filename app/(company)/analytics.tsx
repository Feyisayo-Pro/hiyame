import AnalyticsScreen from '@/components/AnalyticsScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CompanyAnalyticsTab() {
  usePersonaGuard('company');
  return <AnalyticsScreen persona="company" />;
}
