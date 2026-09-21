import HelpCenterScreen from '@/components/HelpCenterScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CompanyHelpTab() {
  usePersonaGuard('company');
  return <HelpCenterScreen persona="company" />;
}
