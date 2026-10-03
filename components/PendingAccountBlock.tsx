import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { useTheme, ThemePalette } from '@/lib/theme';
import type { AccountStatus } from '@/lib/useAccountStatus';

interface Props {
  status: Exclude<AccountStatus, 'approved'>;
  // Filled into the pending/rejected copy, e.g. "post roles", "view your
  // shortlist", "schedule interviews", "browse open roles".
  action: string;
}

export default function PendingAccountBlock({ status, action }: Props) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const rejected = status === 'rejected';

  return (
    <View style={st.block}>
      <AppIcon name={rejected ? 'close-circle-outline' : 'time-outline'} size={28} color={T.textMuted} />
      <Text style={st.title}>{rejected ? 'Account not approved' : 'Account pending approval'}</Text>
      <Text style={st.sub}>
        {rejected
          ? `Your account wasn't approved to ${action}. Contact Hiyame support if you think this is a mistake.`
          : `Your account is awaiting review. You'll be able to ${action} once it's approved.`}
      </Text>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  block: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary, textAlign: 'center' },
  sub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
});
