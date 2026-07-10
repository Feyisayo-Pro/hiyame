import { useCallback, useRef, useState, useMemo } from 'react';
import { Alert, Dimensions, Image, PanResponder, Pressable, ScrollView, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useSwipeStore, SwipeCandidate, SwipeMatch } from '@/lib/swipeStore';
import { useSubscription } from '@/lib/subscriptionStore';
import { useTheme, ThemePalette } from '@/lib/theme';
import MatchMomentModal from '@/components/MatchMomentModal';
import SwipeHint from '@/components/SwipeHint';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.25;

// Card content width accounts for the deckWrap horizontal padding (26 * 2) used in SwipeDiscovery.
const CARD_INNER_W = SCREEN_W - 52;
const CAROUSEL_HEIGHT_RATIO = 0.50;
const CARD_HEIGHT = SCREEN_H * 0.70; // slightly smaller so it sits inside a smaller frame

// ── Filter chip data ──
const ROLE_TYPES = ['Corporate', 'Freelance', 'Contract', 'Temporary'];
const FIELDS = ['Tech', 'Finance', 'Design', 'Marketing', 'Legal', 'Ops'];
const REGIONS = [
  { code: 'NG', label: 'Nigeria' },
  { code: 'GH', label: 'Ghana' },
  { code: 'KE', label: 'Kenya' },
  { code: 'SN', label: 'Senegal' },
  { code: 'AF', label: 'All Africa' },
  { code: 'GL', label: 'Global' },
];
const RATE_RANGES = ['Under $25/hr', '$25–75/hr', '$75–150/hr', '$150+/hr'];

// ═══════════════════════════════════════
// FILTER SETUP VIEW
// ═══════════════════════════════════════
function FilterSetup({ onStart }: { onStart: () => void }) {
  const T = useTheme();
  const fs = useMemo(() => makeStyles(T), [T]);
  const { tier, config, swipesToday } = useSubscription();
  const advancedFilters = config.advancedFilters;
  const swipesRemaining = config.swipesPerDay === -1 ? null : Math.max(config.swipesPerDay - swipesToday, 0);

  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['Corporate']));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['Tech']));
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set(['NG']));
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set(['$75–150/hr']));

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const showPremiumFilterGate = useCallback(() => {
    Alert.alert('Premium Filters', 'Premium Filters are only available on Growth and Enterprise tiers.');
  }, []);

  return (
    <ScrollView contentContainerStyle={fs.scroll} showsVerticalScrollIndicator={false}>
      <SwipeFadeContainer>
        {/* Header */}
        <View style={fs.header}>
          <View style={fs.headerIcon}>
            <Ionicons name="options" size={22} color={T.accent} />
          </View>
          <Text style={fs.headerTitle}>Discover Talent</Text>
          <Text style={fs.headerSub}>Set your preferences and start reviewing candidates</Text>
        </View>

        {/* Daily Swipe Budget */}
        {swipesRemaining !== null && (
          <View style={fs.budgetCard}>
            <View style={fs.budgetRow}>
              <View style={fs.budgetIcon}>
                <Ionicons name="flash" size={16} color={T.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fs.budgetTitle}>Daily Swipe Budget</Text>
                <Text style={fs.budgetSub}>
                  {swipesRemaining} of {config.swipesPerDay} remaining today
                </Text>
              </View>
            </View>
            <View style={fs.budgetBarTrack}>
              <View style={[fs.budgetBarFill, { width: `${(swipesRemaining / config.swipesPerDay) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Role Type */}
        <View style={fs.filterSection}>
          <Text style={fs.filterLabel}>Role Type</Text>
          <View style={fs.chipRow}>
            {ROLE_TYPES.map((r) => (
              <Pressable key={r} style={[fs.chip, selectedRoles.has(r) && fs.chipActive]} onPress={() => toggle(selectedRoles, r, setSelectedRoles)}>
                <Text style={[fs.chipText, selectedRoles.has(r) && fs.chipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Field */}
        <View style={fs.filterSection}>
          <View style={fs.filterLabelRow}>
            <Text style={fs.filterLabel}>Industry / Field</Text>
            {!advancedFilters && (
              <View style={fs.lockBadge}>
                <Ionicons name="lock-closed" size={10} color={T.textMuted} />
                <Text style={fs.lockText}>Hire+</Text>
              </View>
            )}
          </View>
          <View style={[fs.chipRow, !advancedFilters && fs.chipRowLocked]}>
            {FIELDS.map((f) => (
              <Pressable key={f} style={[fs.chip, selectedFields.has(f) && fs.chipActive, !advancedFilters && fs.chipDisabled]} onPress={() => (advancedFilters ? toggle(selectedFields, f, setSelectedFields) : showPremiumFilterGate())}>
                <Text style={[fs.chipText, selectedFields.has(f) && fs.chipTextActive, !advancedFilters && fs.chipTextDisabled]}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Region */}
        <View style={fs.filterSection}>
          <Text style={fs.filterLabel}>Region</Text>
          <View style={fs.chipRow}>
            {REGIONS.map((r) => (
              <Pressable key={r.code} style={[fs.chip, selectedRegions.has(r.code) && fs.chipActive]} onPress={() => toggle(selectedRegions, r.code, setSelectedRegions)}>
                <Text style={[fs.chipText, selectedRegions.has(r.code) && fs.chipTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Rate Range */}
        <View style={fs.filterSection}>
          <View style={fs.filterLabelRow}>
            <Text style={fs.filterLabel}>Rate Range</Text>
            {!advancedFilters && (
              <View style={fs.lockBadge}>
                <Ionicons name="lock-closed" size={10} color={T.textMuted} />
                <Text style={fs.lockText}>Hire+</Text>
              </View>
            )}
          </View>
          <View style={[fs.chipRow, !advancedFilters && fs.chipRowLocked]}>
            {RATE_RANGES.map((r) => (
              <Pressable key={r} style={[fs.chip, selectedRates.has(r) && fs.chipActive, !advancedFilters && fs.chipDisabled]} onPress={() => (advancedFilters ? toggle(selectedRates, r, setSelectedRates) : showPremiumFilterGate())}>
                <Text style={[fs.chipText, selectedRates.has(r) && fs.chipTextActive, !advancedFilters && fs.chipTextDisabled]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tier upsell */}
        {tier === 'scout' && (
          <View style={fs.upsellCard}>
            <Ionicons name="sparkles" size={16} color={T.accent} />
            <View style={{ flex: 1 }}>
              <Text style={fs.upsellTitle}>Upgrade to Growth</Text>
              <Text style={fs.upsellSub}>Unlock field and rate filters, plus unlimited monthly matches.</Text>
            </View>
          </View>
        )}

        {/* Start button */}
        <Pressable style={fs.startBtn} onPress={onStart}>
          <Ionicons name="flash" size={20} color={T.textOnAccent} />
          <Text style={fs.startBtnText}>Start Reviewing Candidates</Text>
        </Pressable>
      </SwipeFadeContainer>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// PHOTO CAROUSEL
// ═══════════════════════════════════════
function PhotoCarousel({ candidate, height }: { candidate: SwipeCandidate; height: number }) {
  const T = useTheme();
  const photos = candidate.photos ?? [];
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * CARD_INNER_W, animated: true });
  }, [photos.length]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / CARD_INNER_W);
    if (newIndex !== index) setIndex(newIndex);
  };

  // Derive a brightness-varied shade per photo index.
  const shadeSteps = [T.surface, T.surfaceHover, T.border, T.borderLight, T.surface];

  // No photos: fall back to the original large-initials-circle treatment.
  if (photos.length === 0) {
    return (
      <View style={[pcStyles.singleWrap, { height, backgroundColor: T.surface }]}>
        <View style={[pcStyles.singleCircle, { backgroundColor: T.accentBg, borderColor: T.accent }]}>
          <Text style={[pcStyles.singleCircleText, { color: T.accent }]}>{candidate.avatarInitials}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[pcStyles.wrap, { height, backgroundColor: T.surface }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={StyleSheet.absoluteFill}
      >
        {photos.map((uri, i) => (
          <View key={i} style={[pcStyles.slide, { width: CARD_INNER_W, height, backgroundColor: T.surface }]}>
            <Image
              source={{ uri }}
              resizeMode="cover"
              style={{ width: CARD_INNER_W, height }}
            />
            {/* Initials overlay as fallback while loading */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
              <Text style={pcStyles.slideInitials}>{candidate.avatarInitials}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Progress dashes at the very top edge */}
      <View style={pcStyles.dashRow} pointerEvents="none">
        {photos.map((_, i) => (
          <View key={i} style={pcStyles.dashTrack}>
            <View style={[pcStyles.dashFill, i === index && pcStyles.dashFillActive]} />
          </View>
        ))}
      </View>

      {/* Tap zones: left half = previous, right half = next */}
      <View style={StyleSheet.absoluteFill}>
        <View style={pcStyles.tapRow}>
          <Pressable style={pcStyles.tapZone} onPress={() => goTo(index - 1)} />
          <Pressable style={pcStyles.tapZone} onPress={() => goTo(index + 1)} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// SWIPE CARD
// ═══════════════════════════════════════
function SwipeCard({
  candidate,
  isTop,
  onPass,
  onShortlist,
  onAccept,
}: {
  candidate: SwipeCandidate;
  isTop: boolean;
  onPass?: () => void;
  onShortlist?: () => void;
  onAccept?: () => void;
}) {
  const T = useTheme();
  const sc = useMemo(() => makeCardStyles(T), [T]);
  const { config } = useSubscription();
  const showReliability = config.reliabilityVisible;
  const carouselHeight = 420 * CAROUSEL_HEIGHT_RATIO;

  return (
    <View style={[sc.card, !isTop && sc.cardBehind]}>
      {/* Photo carousel */}
      <View style={sc.carouselContainer}>
        <PhotoCarousel candidate={candidate} height={carouselHeight} />
      </View>

      {/* Name + Title directly below photo */}
      <View style={sc.profileSection}>
        <Text style={sc.name}>{candidate.fullName}</Text>
        <Text style={sc.title}>{candidate.professionalTitle}</Text>
      </View>

      {/* Top badges */}
      <View style={sc.badgeRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={sc.locationBadge}>
            <Ionicons name="location" size={12} color={T.accent} />
            <Text style={sc.locationText}>{candidate.location}</Text>
          </View>
          <View style={sc.tierPill}>
            <Text style={sc.tierText}>{candidate.tierLabel.toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {showReliability && (
            <View style={sc.reliabilityBadge}>
              <MaterialCommunityIcons name="shield-check" size={12} color={T.emerald} />
              <Text style={sc.reliabilityText}>{candidate.reliabilityScore}</Text>
            </View>
          )}
          {candidate.verified && (
            <View style={sc.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={T.emerald} />
              <Text style={sc.verifiedText}>VERIFIED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={sc.statsRow}>
        <View style={sc.stat}>
          <Text style={sc.statValue}>${candidate.hourlyRate}</Text>
          <Text style={sc.statLabel}>/hr</Text>
        </View>
        <View style={sc.statDivider} />
        <View style={sc.stat}>
          <Text style={sc.statValue}>{candidate.yearsExp}</Text>
          <Text style={sc.statLabel}>yrs exp</Text>
        </View>
        <View style={sc.statDivider} />
        <View style={sc.stat}>
          <Ionicons name="star" size={14} color={T.amber} />
          <Text style={sc.statValue}>{candidate.rating}</Text>
        </View>
      </View>

      {/* Skills */}
      <View style={sc.skillsWrap}>
        {candidate.coreSkills.map((s) => (
          <View key={s} style={sc.skillChip}>
            <Text style={sc.skillText}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Key Achievements — capped to 2 lines each, 2 bullets, so the section has a
          predictable height that always fits the card rather than relying on overflow clipping. */}
      {candidate.keyAchievements && candidate.keyAchievements.length > 0 && (
        <View style={sc.achievementsWrap}>
          <Text style={sc.achievementsTitle}>KEY ACHIEVEMENTS</Text>
          {candidate.keyAchievements.slice(0, 2).map((a, i) => (
            <View key={i} style={sc.achievementRow}>
              <View style={sc.achievementDot} />
              <Text style={sc.achievementText} numberOfLines={2}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* In-card action buttons (top card only) */}
      {isTop && onShortlist && onAccept && (
        <View style={sc.cardActions}>
          <Pressable style={sc.cardActionBtn} onPress={onShortlist}>
            <Ionicons name="bookmark" size={18} color={T.accent} />
          </Pressable>
          <Pressable style={sc.cardActionBtn} onPress={onAccept}>
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
function SwipeDiscovery({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const sd = useMemo(() => makeDiscoveryStyles(T), [T]);
  const router = useRouter();
  const { candidates, currentIndex, swipeAction } = useSwipeStore();
  const { config, swipesToday, canSwipe, recordSwipe } = useSubscription();
  const [matchResult, setMatchResult] = useState<SwipeMatch | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swiping = useSharedValue(false);

  const swipesRemaining = config.swipesPerDay === -1 ? null : Math.max(config.swipesPerDay - swipesToday, 0);

  const showSwipeLimitAlert = useCallback(() => {
    Alert.alert(
      'Daily Swipe Limit Reached!',
      `You've used all ${config.swipesPerDay} of your daily candidate swipes on the ${config.name} plan. Upgrade to unlock more daily swipes.`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/(company)/subscriptions') },
      ],
    );
  }, [config, router]);

  const currentCandidate = candidates[currentIndex % candidates.length];
  const nextCandidate = candidates[(currentIndex + 1) % candidates.length];
  const deckEmpty = currentIndex >= candidates.length;

  const candidateRef = useRef(currentCandidate);
  candidateRef.current = currentCandidate;

  const handleSwipeComplete = useCallback((action: 'pass' | 'shortlist' | 'accept') => {
    if (!swiping.value) return;
    swiping.value = false;
    recordSwipe();
    const match = swipeAction(candidateRef.current.id, action);
    if (match) setMatchResult(match);
    translateX.value = 0;
    translateY.value = 0;
  }, [swipeAction, translateX, translateY, recordSwipe, swiping]);

  // handleSwipeComplete is captured directly in doAnimateOff's closure (via the
  // dependency array below) rather than through a mutable ref, since the withTiming
  // callback below runs as a worklet — mutating a plain ref's `.current` that a
  // worklet also reads triggers Reanimated's "already converted to a Shareable" warning.
  const doAnimateOff = useCallback((direction: number, action: 'pass' | 'shortlist' | 'accept') => {
    if (swiping.value) return;
    swiping.value = true;
    translateX.value = withTiming(direction * SCREEN_W * 1.5, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(handleSwipeComplete)(action);
      } else {
        swiping.value = false;
      }
    });
  }, [translateX, swiping, handleSwipeComplete]);

  const fnRefOff = useRef(doAnimateOff);
  fnRefOff.current = doAnimateOff;

  // Keep a ref so the PanResponder (memoized once) always sees the latest
  // swipe-limit gate state without needing to be recreated every render.
  const gateRef = useRef({ canSwipe, showSwipeLimitAlert });
  gateRef.current.canSwipe = canSwipe;
  gateRef.current.showSwipeLimitAlert = showSwipeLimitAlert;

  const attemptSwipe = useCallback((direction: number, action: 'pass' | 'shortlist' | 'accept') => {
    if (!gateRef.current.canSwipe) {
      gateRef.current.showSwipeLimitAlert();
      return;
    }
    fnRefOff.current(direction, action);
  }, []);

  const attemptAccept = useCallback(() => attemptSwipe(1, 'accept'), [attemptSwipe]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    // Capture-phase check so a drag started over the photo carousel's tap zones
    // (which claim the responder on touch-start) still gets stolen by the card
    // once the gesture is clearly a horizontal swipe rather than a tap.
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderMove: (_, g) => {
      if (swiping.value) return;
      translateX.value = g.dx;
      translateY.value = g.dy;
    },
    onPanResponderRelease: (_, g) => {
      if (swiping.value) return;
      if (Math.abs(g.dx) < SWIPE_THRESHOLD) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        return;
      }
      if (!gateRef.current.canSwipe) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        gateRef.current.showSwipeLimitAlert();
        return;
      }
      if (g.dx > SWIPE_THRESHOLD) {
        fnRefOff.current(1, 'accept');
      } else {
        fnRefOff.current(-1, 'pass');
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
      <MatchMomentModal match={matchResult} visible={matchResult !== null} onClose={() => setMatchResult(null)} />

      {/* Header */}
      <View style={sd.header}>
        <Pressable style={sd.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <View style={sd.headerCenter}>
          <Ionicons name="flash" size={16} color={T.accent} />
          <Text style={sd.headerTitle}>Discover</Text>
        </View>
        <View style={sd.headerRight}>
          {swipesRemaining === null ? (
            <Text style={sd.counterText}>Unlimited</Text>
          ) : (
            <>
              <Text style={[sd.counterText, swipesRemaining === 0 && { color: T.danger }]}>
                {swipesToday}/{config.swipesPerDay}
              </Text>
              <Text style={sd.swipesLeftText}>Daily swipes</Text>
            </>
          )}
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
              <Text style={sd.emptySub}>You have reviewed all available candidates. Check back later or adjust your filters.</Text>
              <Pressable style={sd.resetBtn} onPress={onBack}>
                <Ionicons name="refresh" size={16} color={T.textOnAccent} />
                <Text style={sd.resetBtnText}>Adjust Filters</Text>
              </Pressable>
            </View>
          </SwipeFadeContainer>
        ) : (
          <>
            {/* Next card (behind) */}
            {nextCandidate && <SwipeCard candidate={nextCandidate} isTop={false} />}

            {/* Current card (top, draggable) */}
            <Animated.View
              style={[sd.animatedCard, cardAnimatedStyle]}
              {...panResponder.panHandlers}
            >
              <SwipeCard
                candidate={currentCandidate}
                isTop={true}
                onPass={() => attemptSwipe(-1, 'pass')}
                onShortlist={() => fnRefOff.current(0.5, 'shortlist')}
                onAccept={attemptAccept}
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

        {/* Swipe hint animation -- only shows on first load */}
        {!deckEmpty && <SwipeHint />}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// MAIN SCREEN — STATE TOGGLE
// ═══════════════════════════════════════
export default function CompanyRolesScreen() {
  const T = useTheme();

  const [mode, setMode] = useState<'filter' | 'swipe'>('filter');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      {mode === 'filter' ? (
        <FilterSetup onStart={() => setMode('swipe')} />
      ) : (
        <SwipeDiscovery onBack={() => setMode('filter')} />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════
// STYLES — Filter Setup
// ═══════════════════════════════════════
const makeStyles = (T: ThemePalette) => StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, backgroundColor: T.bg },
  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 14, color: T.textSecondary, textAlign: 'center' },

  budgetCard: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: T.border },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  budgetIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  budgetTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  budgetSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  budgetBarTrack: { height: 6, borderRadius: 3, backgroundColor: T.surface, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 3, backgroundColor: T.accent },

  filterSection: { marginBottom: 20 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lockText: { fontSize: 10, fontWeight: '700', color: T.textMuted },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRowLocked: { opacity: 0.4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.card },
  chipActive: { borderColor: T.accent, backgroundColor: T.accentBg },
  chipDisabled: { borderColor: T.border, backgroundColor: T.surface },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  chipTextActive: { color: T.accent, fontWeight: '700' },
  chipTextDisabled: { color: T.textMuted },

  upsellCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.accentBg, borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' },
  upsellTitle: { fontSize: 14, fontWeight: '700', color: T.accent },
  upsellSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 50, height: 56, shadowColor: T.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  startBtnText: { fontSize: 18, fontWeight: '700', color: T.textOnAccent },
});

// ═══════════════════════════════════════
// STYLES — Photo Carousel (theme-independent parts only; dynamic colors inlined)
// ═══════════════════════════════════════
const pcStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideInitials: {
    fontSize: 64,
    fontWeight: '800',
    color: 'rgba(245,245,244,0.18)',
    letterSpacing: 1,
  },
  dashRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  dashTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  dashFill: {
    height: '100%',
    width: '0%',
    backgroundColor: 'transparent',
  },
  dashFillActive: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  tapRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
  singleWrap: {
    width: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  singleCircleText: {
    fontSize: 30,
    fontWeight: '800',
  },
});

// ═══════════════════════════════════════
// STYLES — Swipe Card
// ═══════════════════════════════════════
const makeCardStyles = (T: ThemePalette) => StyleSheet.create({
  card: {
    position: 'absolute', width: '100%', height: CARD_HEIGHT,
    backgroundColor: T.card, borderRadius: 24, overflow: 'hidden',
    padding: 20, borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 6,
  },
  cardBehind: { top: 8, transform: [{ scale: 0.96 }], opacity: 0.5 },

  carouselContainer: { marginHorizontal: -20, marginTop: -20, marginBottom: 16 },

  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  locationText: { fontSize: 12, fontWeight: '700', color: T.accent },
  reliabilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.emeraldBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  reliabilityText: { fontSize: 11, fontWeight: '800', color: T.emerald },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.emeraldBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  verifiedText: { fontSize: 10, fontWeight: '800', color: T.emerald, letterSpacing: 0.5 },

  profileSection: { marginBottom: 10 },
  avatar: { display: 'none' as any },
  avatarText: { display: 'none' as any },
  name: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  title: { fontSize: 14, color: T.textSecondary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12, paddingVertical: 9, backgroundColor: T.surface, borderRadius: 14 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  statLabel: { fontSize: 12, color: T.textMuted, fontWeight: '500' },
  statDivider: { width: 1, height: 20, backgroundColor: T.border },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, justifyContent: 'center' },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  skillText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },

  tierPill: { backgroundColor: T.accentBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: T.accent },

  achievementsWrap: { marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  achievementsTitle: { fontSize: 10, fontWeight: '800', color: T.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  achievementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  achievementDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.accent, marginTop: 5 },
  achievementText: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },

  /* In-card action buttons — pinned to the card's bottom edge so they're never
     clipped by overflow:hidden regardless of how much achievement text precedes them. */
  cardActions: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 12, paddingTop: 10, paddingBottom: 4,
    backgroundColor: T.card,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  cardActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.accentBg, borderWidth: 1.5, borderColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  cardActionBtnStar: { width: 40, height: 40, borderRadius: 20 },
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  headerRight: { alignItems: 'flex-end' },
  counterText: { fontSize: 13, fontWeight: '700', color: T.accent, backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  swipesLeftText: { fontSize: 10, color: T.textMuted, marginTop: 4 },

  deckWrap: { flex: 1, paddingHorizontal: 26, paddingTop: 20, paddingBottom: 28, justifyContent: 'center', alignItems: 'center' },
  animatedCard: { width: '100%', height: CARD_HEIGHT, zIndex: 10 },
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
