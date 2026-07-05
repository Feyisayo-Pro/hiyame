import { useEffect, useRef, useMemo } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwipeStore, SwipeMatch } from '@/lib/swipeStore';
import { useTheme, ThemePalette } from '@/lib/theme';

export default function MatchMomentModal({
  match,
  visible,
  onClose,
}: {
  match: SwipeMatch | null;
  visible: boolean;
  onClose: () => void;
}) {
  const T = useTheme();
  const ms = useMemo(() => makeStyles(T), [T]);
  const { matches } = useSwipeStore();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!match) return null;

  // Other pending matches (exclude current)
  const pendingMatches = matches.filter((m) => m.candidateId !== match.candidateId && (m.status === 'new' || m.status === 'pending')).slice(0, 5);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <Animated.View style={[ms.modal, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Close */}
          <Pressable style={ms.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={T.textMuted} />
          </Pressable>

          {/* Bullseye Icon */}
          <View style={ms.iconWrap}>
            <View style={ms.iconRing3}>
              <View style={ms.iconRing2}>
                <View style={ms.iconRing1}>
                  <MaterialCommunityIcons name="target" size={28} color={T.accent} />
                </View>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={ms.title}>It's a Match!</Text>
          <Text style={ms.subtitle}>
            {match.candidateName} accepted your shortlist.{'\n'}You have 48hrs to connect.
          </Text>

          {/* Connection graphic */}
          <View style={ms.connectionRow}>
            <View style={ms.connAvatar}>
              {match.candidatePhoto ? (
                <Image source={{ uri: match.candidatePhoto }} style={ms.connPhoto} />
              ) : (
                <Text style={ms.connInitials}>{match.candidateInitials}</Text>
              )}
            </View>
            <View style={ms.connLine}>
              <View style={ms.connDot} />
              <View style={ms.connDash} />
              <Ionicons name="heart" size={16} color={T.accent} />
              <View style={ms.connDash} />
              <View style={ms.connDot} />
            </View>
            <View style={ms.connCompany}>
              <Ionicons name="business" size={20} color={T.accent} />
            </View>
          </View>

          {/* Primary Actions */}
          <Pressable style={ms.primaryBtn} onPress={onClose}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={T.textOnAccent} />
            <Text style={ms.primaryBtnText}>Send Message</Text>
          </Pressable>

          <Pressable style={ms.secondaryBtn} onPress={onClose}>
            <Ionicons name="bookmark-outline" size={16} color={T.textPrimary} />
            <Text style={ms.secondaryBtnText}>Save for Later</Text>
          </Pressable>

          {/* Pending matches shelf */}
          {pendingMatches.length > 0 && (
            <View style={ms.shelfSection}>
              <Text style={ms.shelfLabel}>ALSO WAITING FOR YOU</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ms.shelfScroll}>
                {pendingMatches.map((pm) => (
                  <View key={pm.candidateId} style={ms.shelfCard}>
                    <View style={ms.shelfAvatar}>
                      {pm.candidatePhoto ? (
                        <Image source={{ uri: pm.candidatePhoto }} style={ms.shelfPhoto} />
                      ) : (
                        <Text style={ms.shelfAvatarText}>{pm.candidateInitials}</Text>
                      )}
                    </View>
                    <Text style={ms.shelfName} numberOfLines={1}>{pm.candidateName.split(' ')[0]}</Text>
                    <View style={[ms.shelfStatus, pm.status === 'new' ? ms.shelfNew : ms.shelfPending]}>
                      <Text style={[ms.shelfStatusText, { color: pm.status === 'new' ? T.emerald : T.accent }]}>
                        {pm.status === 'new' ? 'NEW' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: T.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: T.border },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 1, width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },

  iconWrap: { alignItems: 'center', marginBottom: 16 },
  iconRing3: { width: 88, height: 88, borderRadius: 44, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  iconRing2: { width: 68, height: 68, borderRadius: 34, backgroundColor: T.accentBg20, alignItems: 'center', justifyContent: 'center' },
  iconRing1: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.cardElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.accent },

  title: { fontSize: 26, fontWeight: '800', color: T.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  connectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 },
  connAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accentBg20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.accent },
  connInitials: { fontSize: 18, fontWeight: '800', color: T.accent },
  connPhoto: { width: 52, height: 52, borderRadius: 26 },
  connLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent },
  connDash: { width: 16, height: 2, backgroundColor: T.accentBg20 },
  connCompany: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.accent },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.accent, borderRadius: 14, height: 50, marginBottom: 10,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: T.textOnAccent },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: T.borderLight, marginBottom: 20,
    backgroundColor: T.surface,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: T.textPrimary },

  shelfSection: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 16 },
  shelfLabel: { fontSize: 10, fontWeight: '800', color: T.textMuted, letterSpacing: 0.5, marginBottom: 12, textAlign: 'center' },
  shelfScroll: { gap: 10, paddingHorizontal: 4 },
  shelfCard: { alignItems: 'center', width: 64 },
  shelfAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  shelfAvatarText: { fontSize: 14, fontWeight: '700', color: T.accent },
  shelfPhoto: { width: 40, height: 40, borderRadius: 20 },
  shelfName: { fontSize: 11, fontWeight: '600', color: T.textPrimary, marginBottom: 4 },
  shelfStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  shelfNew: { backgroundColor: T.emeraldBg },
  shelfPending: { backgroundColor: T.accentBg },
  shelfStatusText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
});
