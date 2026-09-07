// Web build of the identity verification modal — deliberately has NO import of
// @smile_identity/react-native-expo. That package calls requireNativeViewManager
// at module-evaluation time, which throws immediately under web/SSR (not just at
// render time), so it can't even be imported here, only on native (see the
// sibling SmileIdVerificationModal.tsx, which Metro picks for iOS/Android).
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
  userId: string;
  countryCode?: string;
}

export default function SmileIdVerificationModal({ visible, onClose }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={s.overlay}>
        <View style={s.card}>
          <Ionicons name="phone-portrait-outline" size={32} color={T.textMuted} />
          <Text style={s.title}>Coming Soon</Text>
          <Text style={s.body}>
            Identity verification uses native camera and liveness capture, so it only runs in the
            mobile app — not on the web.
          </Text>
          <Pressable style={s.actionBtn} onPress={onClose}>
            <Text style={s.actionBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: T.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary, textAlign: 'center' },
  body: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  actionBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  actionBtnText: { color: T.textOnAccent, fontWeight: '700' },
});
