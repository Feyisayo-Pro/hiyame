import ConnectionsScreen from '@/components/ConnectionsScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CompanyConnectionsTab() {
  usePersonaGuard('company');
  return <ConnectionsScreen persona="company" />;
}
