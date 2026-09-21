import ConnectionsScreen from '@/components/ConnectionsScreen';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
export default function CandidateConnectionsTab() {
  usePersonaGuard('candidate');
  return <ConnectionsScreen persona="candidate" />;
}
