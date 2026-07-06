import { useCallback, useRef, useState, useMemo } from 'react';
import { Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import SwipeHint from '@/components/SwipeHint';
import { mockRoles, Role, Tier } from '@/lib/mock-data';
import { useTheme, ThemePalette } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.25;

// ── Filter chip data ──
const TIERS: { key: Tier | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'short_term', label: 'Short-Term' },
  { key: 'gig', label: 'Gig' },
];
const LOCATIONS = ['Remote', 'Hybrid', 'On-site'];
const FIELDS = ['Engineering', 'Design', 'Finance', 'Marketing', 'Legal', 'Ops'];

// ═══════════════════════════════════════
// FILTER SETUP VIEW
// ═══════════════════════════════════════
function FilterSetup({ onStart }: { onStart: () => void }) {
  const T = useTheme();
  const fs = useMemo(() => makeFilterStyles(T), [T]);

  const [selectedTier, setSelectedTier] = useState<Tier | 'all'>('all');
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set(['Remote']));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['Engineering']));

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  const roleCount = mockRoles.filter(r => selectedTier === 'all' || r.tier === selectedTier).length;

  return (
    <ScrollView contentContainerStyle={fs.scroll} showsVerticalScrollIndicator={false}>
      <SwipeFadeContainer>
        {/* Header */}
        <View style={fs.header}>
          <View style={fs.headerIcon}>
            <Ionicons name="compass" size={22} color={T.accent} />
          </View>
          <Text style={fs.headerTitle}>Discover Opportunities</Text>
          <Text style={fs.headerSub}>Set your preferences and start exploring roles</Text>
        </View>

        {/* Role count */}
        <View style={fs.budgetCard}>
          <View style={fs.budgetRow}>
            <View style={fs.budgetIcon}>
              <Ionicons name="briefcase" size={16} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fs.budgetTitle}>Available Roles</Text>
              <Text style={fs.budgetSub}>{roleCount} roles match your filters</Text>
            </View>
          </View>
        </View>

        {/* Tier */}
        <View style={fs.filterSection}>
          <Text style={fs.filterLabel}>Role Type</Text>
          <View style={fs.chipRow}>
            {TIERS.map((t) => (
              <Pressable key={t.key} style={[fs.chip, selectedTier === t.key && fs.chipActive]} onPress={() => setSelectedTier(t.key)}>
                <Text style={[fs.chipText, selectedTier === t.key && fs.chipTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={fs.filterSection}>
          <Text style={fs.filterLabel}>Work Arrangement</Text>
          <View style={fs.chipRow}>
            {LOCATIONS.map((l) => (
              <Pressable key={l} style={[fs.chip, selectedLocations.has(l) && fs.chipActive]} onPress={() => toggle(selectedLocations, l, setSelectedLocations)}>
                <Text style={[fs.chipText, selectedLocations.has(l) && fs.chipTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Field */}
        <View style={fs.filterSection}>
          <Text style={fs.filterLabel}>Function</Text>
          <View style={fs.chipRow}>
            {FIELDS.map((f) => (
              <Pressable key={f} style={[fs.chip, selectedFields.has(f) && fs.chipActive]} onPress={() => toggle(selectedFields, f, setSelectedFields)}>
                <Text style={[fs.chipText, selectedFields.has(f) && fs.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Start button */}
        <Pressable style={fs.startBtn} onPress={onStart}>
          <Ionicons name="flash" size={20} color={T.textOnAccent} />
          <Text style={fs.startBtnText}>Start Exploring</Text>
        </Pressable>
      </SwipeFadeContainer>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// JOB SWIPE CARD
// ═══════════════════════════════════════
function JobSwipeCard({
  role,
  isTop,
  onPass,
  onSave,
  onApply,
}: {
  role: Role;
  isTop: boolean;
  onPass?: () => void;
  onSave?: () => void;
  onApply?: () => void;
}) {
  const T = useTheme();
  const sc = useMemo(() => makeCardStyles(T), [T]);

  const locationLabel = role.location_type === 'remote' ? 'Remote' :
    role.location_type === 'hybrid' ? `Hybrid · ${role.location_city}` :
    `${role.location_city}, ${role.location_country}`;

  const rateLabel = role.rate_type === 'monthly'
    ? `$${role.rate_min.toLocaleString()}–${role.rate_max.toLocaleString()}/mo`
    : role.rate_type === 'hourly'
    ? `$${role.rate_min}–${role.rate_max}/hr`
    : `$${role.rate_min.toLocaleString()} fixed`;

  const tierLabel = role.tier === 'corporate' ? 'Corporate' : role.tier === 'short_term' ? 'Short-Term' : 'Gig';

  return (
    <View style={[sc.card, !isTop && sc.cardBehind]}>
      {/* Company header */}
      <View style={sc.companyHeader}>
        <View style={sc.companyAvatar}>
          <Ionicons name="business" size={24} color={T.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sc.companyIndustry}>{role.company_industry}</Text>
          <Text style={sc.companySize}>{role.company_size_band}</Text>
        </View>
        <View style={sc.matchBadge}>
          <Ionicons name="heart" size={12} color={T.accent} />
          <Text style={sc.matchText}>{role.match_score}%</Text>
        </View>
      </View>

      {/* Role title */}
      <Text style={sc.roleTitle}>{role.title}</Text>
      <Text style={sc.roleFunction}>{role.function} · {role.experience_level}</Text>

      {/* Location + Rate */}
      <View style={sc.infoRow}>
        <View style={sc.infoBadge}>
          <Ionicons name="location" size={12} color={T.accent} />
          <Text style={sc.infoText}>{locationLabel}</Text>
        </View>
        <View style={sc.infoBadge}>
          <Ionicons name="cash" size={12} color={T.accent} />
          <Text style={sc.infoText}>{rateLabel}</Text>
        </View>
      </View>

      {/* Contract + Start */}
      <View style={sc.detailRow}>
        <View style={sc.detailItem}>
          <Ionicons name="time-outline" size={14} color={T.textMuted} />
          <Text style={sc.detailText}>{role.contract_length}</Text>
        </View>
        <View style={sc.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={T.textMuted} />
          <Text style={sc.detailText}>Start: {role.start_date}</Text>
        </View>
      </View>

      {/* Skills */}
      <View style={sc.skillsWrap}>
        {role.required_skills.must_have.map((s) => (
          <View key={s} style={sc.skillChip}>
            <Text style={sc.skillText}>{s}</Text>
          </View>
        ))}
        {role.required_skills.nice_to_have.slice(0, 2).map((s) => (
          <View key={s} style={sc.skillChipNice}>
            <Text style={sc.skillTextNice}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Key Deliverables */}
      {role.keyDeliverables && role.keyDeliverables.length > 0 && (
        <View style={sc.deliverablesWrap}>
          <Text style={sc.deliverablesTitle}>KEY DELIVERABLES</Text>
          {role.keyDeliverables.map((d, i) => (
            <View key={i} style={sc.deliverableRow}>
              <View style={sc.deliverableDot} />
              <Text style={sc.deliverableText}>{d}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={sc.footer}>
        <View style={sc.tierPill}>
          <Text style={sc.tierText}>{tierLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* In-card action buttons (top card only) */}
      {isTop && onSave && onApply && (
        <View style={sc.cardActions}>
          <Pressable style={sc.cardActionBtn} onPress={onSave}>
            <Ionicons name="bookmark" size={18} color={T.accent} />
          </Pressable>
          <Pressable style={sc.cardActionBtn} onPress={onApply}>
            <Ionicons name="checkmark" size={18} color={T.accent} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════
// SWIPE DISCOVERY VIEW
// ═══════════════════════════════════════
function JobSwipeDiscovery({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const sd = useMemo(() => makeDiscoveryStyles(T), [T]);
  const roles = mockRoles;
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swiping = useRef(false);

  const currentRole = roles[currentIndex % roles.length];
  const nextRole = roles[(currentIndex + 1) % roles.length];
  const deckEmpty = currentIndex >= roles.length;

  const advanceCard = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    setCurrentIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const fnRef = useRef({ advanceCard });
  fnRef.current.advanceCard = advanceCard;

  const doAnimateOff = useCallback((direction: number) => {
    if (swiping.current) return;
    swiping.current = true;
    translateX.value = withTiming(direction * SCREEN_W * 1.5, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(fnRef.current.advanceCard)();
      } else {
        swiping.current = false;
      }
    });
  }, [translateX]);

  const fnRefOff = useRef(doAnimateOff);
  fnRefOff.current = doAnimateOff;

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderMove: (_, g) => {
      if (swiping.current) return;
      translateX.value = g.dx;
      translateY.value = g.dy;
    },
    onPanResponderRelease: (_, g) => {
      if (swiping.current) return;
      if (g.dx > SWIPE_THRESHOLD) {
        fnRefOff.current(1);
      } else if (g.dx < -SWIPE_THRESHOLD) {
        fnRefOff.current(-1);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  }), [translateX, translateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: interpolate(translateX.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12]) + 'deg' },
    ],
  }));

  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SCREEN_W * 0.5, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const acceptOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_W * 0.5], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={sd.container}>
      {/* Header */}
      <View style={sd.header}>
        <Pressable style={sd.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <View style={sd.headerCenter}>
          <Ionicons name="compass" size={16} color={T.accent} />
          <Text style={sd.headerTitle}>Explore</Text>
        </View>
        <View style={sd.headerRight}>
          <Text style={sd.counterText}>{currentIndex + 1}/{roles.length}</Text>
        </View>
      </View>

      {/* Card Stack */}
      <View style={sd.deckWrap}>
        {deckEmpty ? (
          <SwipeFadeContainer>
            <View style={sd.emptyDeck}>
              <View style={sd.emptyIcon}>
                <Ionicons name="search" size={32} color={T.textMuted} />
              </View>
              <Text style={sd.emptyTitle}>All caught up!</Text>
              <Text style={sd.emptySub}>You have reviewed all available opportunities. Check back later or adjust your filters.</Text>
              <Pressable style={sd.resetBtn} onPress={onBack}>
                <Ionicons name="refresh" size={16} color={T.textOnAccent} />
                <Text style={sd.resetBtnText}>Adjust Filters</Text>
              </Pressable>
            </View>
          </SwipeFadeContainer>
        ) : (
          <>
            {nextRole && <JobSwipeCard role={nextRole} isTop={false} />}
            <Animated.View
              style={[sd.animatedCard, cardAnimatedStyle]}
              {...panResponder.panHandlers}
            >
              <JobSwipeCard
                role={currentRole}
                isTop={true}
                onPass={() => fnRefOff.current(-1)}
                onSave={() => fnRefOff.current(0.5)}
                onApply={() => fnRefOff.current(1)}
              />
              <Animated.View pointerEvents="none" style={[sd.swipeOverlay, sd.passOverlay, passOverlayStyle]}>
                <Ionicons name="close-circle" size={48} color={T.danger} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[sd.swipeOverlay, sd.acceptOverlay, acceptOverlayStyle]}>
                <Ionicons name="checkmark-circle" size={48} color={T.emerald} />
              </Animated.View>
            </Animated.View>
          </>
        )}

        {/* Swipe hint animation */}
        {!deckEmpty && <SwipeHint />}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════
export default function OpportunitiesScreen() {
  const T = useTheme();
  const [mode, setMode] = useState<'filter' | 'swipe'>('filter');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      {mode === 'filter' ? (
        <FilterSetup onStart={() => setMode('swipe')} />
      ) : (
        <JobSwipeDiscovery onBack={() => setMode('filter')} />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════
// STYLES — Filter Setup
// ═══════════════════════════════════════
const makeFilterStyles = (T: ThemePalette) => StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, backgroundColor: T.bg },
  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 14, color: T.textSecondary, textAlign: 'center' },

  budgetCard: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: T.border },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  budgetTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  budgetSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },

  filterSection: { marginBottom: 20 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.card },
  chipActive: { borderColor: T.accent, backgroundColor: T.accentBg },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  chipTextActive: { color: T.accent, fontWeight: '700' },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 50, height: 56, marginTop: 8, shadowColor: T.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  startBtnText: { fontSize: 18, fontWeight: '700', color: T.textOnAccent },
});

// ═══════════════════════════════════════
// STYLES — Job Swipe Card
// ═══════════════════════════════════════
const makeCardStyles = (T: ThemePalette) => StyleSheet.create({
  card: {
    position: 'absolute', width: '100%',
    backgroundColor: T.card, borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 6,
  },
  cardBehind: { top: 8, transform: [{ scale: 0.96 }], opacity: 0 },

  companyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  companyAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: T.accentBg20 },
  companyIndustry: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  companySize: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  matchText: { fontSize: 13, fontWeight: '800', color: T.accent },

  roleTitle: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 4 },
  roleFunction: { fontSize: 14, color: T.textSecondary, marginBottom: 16, fontWeight: '500' },

  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  infoText: { fontSize: 12, fontWeight: '700', color: T.accent },

  detailRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: T.textMuted, fontWeight: '500' },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  skillText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  skillChipNice: { backgroundColor: T.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed' },
  skillTextNice: { fontSize: 12, fontWeight: '500', color: T.textMuted, fontStyle: 'italic' },

  footer: { alignItems: 'center', gap: 8 },
  tierPill: { backgroundColor: T.accentBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: T.accent },
  visDesc: { fontSize: 12, color: T.textMuted, textAlign: 'center', lineHeight: 18 },

  /* In-card action buttons — compact */
  cardActions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 12, marginTop: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  cardActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.accentBg, borderWidth: 1.5, borderColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  deliverablesWrap: { marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  deliverablesTitle: { fontSize: 10, fontWeight: '800', color: T.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  deliverableRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  deliverableDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.accent, marginTop: 5 },
  deliverableText: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },

  cardActionBtnSmall: { width: 40, height: 40, borderRadius: 20 },
  cardActionLabel: {
    fontSize: 9, fontWeight: '700', color: T.accent,
    marginTop: 2, letterSpacing: 0.3,
  },
});

// ═══════════════════════════════════════
// STYLES — Swipe Discovery
// ═══════════════════════════════════════
const makeDiscoveryStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  headerRight: { alignItems: 'flex-end' },
  counterText: { fontSize: 13, fontWeight: '700', color: T.accent, backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

  deckWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, justifyContent: 'center' },
  animatedCard: { width: '100%', zIndex: 10, height: '100%', justifyContent: 'center' },
  swipeOverlay: {
    position: 'absolute', top: 24, alignItems: 'center', justifyContent: 'center',
    width: 64, height: 64, borderRadius: 32,
  },
  passOverlay: { left: 24, backgroundColor: T.dangerBg },
  acceptOverlay: { right: 24, backgroundColor: T.emeraldBg },

  emptyDeck: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 30, marginBottom: 24 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50 },
  resetBtnText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
});
