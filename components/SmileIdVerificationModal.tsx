import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SmileIDDocumentVerificationView } from '@smile_identity/react-native-expo';
import type { DocumentVerificationParams } from '@smile_identity/react-native-expo';

import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { initializeSmileId, isSmileIdConfigured } from '@/lib/smileId';

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
  userId: string;
  countryCode?: string;
}

// Native only — Metro resolves SmileIdVerificationModal.web.tsx for web builds instead,
// which never imports @smile_identity/react-native-expo at all (see that file for why).
type Status = 'initializing' | 'capturing' | 'processing' | 'error' | 'unconfigured';

export default function SmileIdVerificationModal({ visible, onClose, onVerified, userId, countryCode = 'NG' }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [status, setStatus] = useState<Status>('initializing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!visible) return;

    if (!isSmileIdConfigured()) {
      setStatus('unconfigured');
      return;
    }

    setStatus('initializing');
    initializeSmileId()
      .then(() => setStatus('capturing'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err?.message ?? 'Could not start identity verification.');
      });
  }, [visible]);

  const params: DocumentVerificationParams = useMemo(() => ({
    userId,
    jobId: `job-${Date.now()}`,
    countryCode,
  }), [userId, countryCode]);

  const handleResult = useCallback((result: any) => {
    setStatus('processing');
    onVerified();
    onClose();
  }, [onVerified, onClose]);

  const handleError = useCallback((error: any) => {
    setStatus('error');
    setErrorMessage(error?.message ?? 'Verification failed. Please try again.');
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.backBtn}>
            <Ionicons name="close" size={22} color={T.textPrimary} />
          </Pressable>
          <Text style={s.headerTitle}>Identity Verification</Text>
          <View style={{ width: 36 }} />
        </View>

        {status === 'unconfigured' ? (
          <View style={s.centerWrap}>
            <Ionicons name="warning-outline" size={32} color={T.amber} />
            <Text style={s.title}>Not Configured Yet</Text>
            <Text style={s.body}>
              Smile ID needs EXPO_PUBLIC_SMILE_PARTNER_ID, EXPO_PUBLIC_SMILE_AUTH_TOKEN, EXPO_PUBLIC_SMILE_PROD_URL,
              and EXPO_PUBLIC_SMILE_TEST_URL set in .env (see .env.example).
            </Text>
            <Pressable style={s.actionBtn} onPress={onClose}>
              <Text style={s.actionBtnText}>Close</Text>
            </Pressable>
          </View>
        ) : status === 'initializing' ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={T.accent} />
            <Text style={s.body}>Starting verification…</Text>
          </View>
        ) : status === 'error' ? (
          <View style={s.centerWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={T.danger} />
            <Text style={s.body}>{errorMessage}</Text>
            <Pressable style={s.actionBtn} onPress={() => setStatus('capturing')}>
              <Text style={s.actionBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : status === 'processing' ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={T.accent} />
            <Text style={s.body}>Processing verification…</Text>
          </View>
        ) : (
          <SmileIDDocumentVerificationView
            style={{ flex: 1 }}
            params={params}
            onResult={handleResult}
            onError={handleError}
          />
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.textPrimary },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary, textAlign: 'center' },
  body: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  actionBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  actionBtnText: { color: T.textOnAccent, fontWeight: '700' },
});
