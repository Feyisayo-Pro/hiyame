import AccountSettings from '@/components/AccountSettings';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CompanySettingsTab() {
  usePersonaGuard('company');
  return <AccountSettings persona="company" />;
}
