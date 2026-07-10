import { useCallback, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useSubscription, SubscriptionTier } from '@/lib/subscriptionStore';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// ── Plan copy (maps onto the underlying scout/hire/scale tiers) ──
interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: 'scout',
    name: 'Starter',
    subtitle: 'Free',
    price: '₦0',
    period: '/mo',
    features: [
      '5 candidate matches / month',
      'Basic search & filtering',
      'Standard email support',
      '1 team seat',
    ],
  },
  {
    id: 'hire',
    name: 'Growth',
    subtitle: 'Pro',
    price: '₦250,000',
    period: '/mo',
    features: [
      'Unlimited candidate matches',
      'Priority candidate filtering',
      'Up to 3 team seats',
      'Priority support',
    ],
    highlight: true,
  },
  {
    id: 'scale',
    name: 'Enterprise',
    subtitle: 'Scale',
    price: '₦650,000',
    period: '/mo',
    features: [
      'Unlimited candidate matches',
      'Dedicated sourcing dashboard',
      'Unlimited team seats',
      'Dedicated account manager',
    ],
  },
];

// ── Paystack checkout placeholder ──
// Logs the selected tier's payload and mocks the gateway round-trip. When the
// real integration lands, this is the seam where the Paystack SDK call goes.
function buildCheckoutPayload(plan: PricingPlan) {
  return {
    tierId: plan.id,
    planName: plan.name,
    amount: plan.price,
    currency: 'NGN',
    provider: 'paystack',
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════
// PRICING CARD
// ═══════════════════════════════════════
function PricingCard({
  plan,
  isCurrent,
  onSelect,
  T,
}: {
  plan: PricingPlan;
  isCurrent: boolean;
  onSelect: () => void;
  T: ThemePalette;
}) {
  const s = useMemo(() => makeCardStyles(T), [T]);

  return (
    <View style={[s.card, plan.highlight && s.cardHighlight]}>
      {plan.highlight && (
        <View style={s.popularBadge}>
          <Text style={s.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      <Text style={s.planName}>{plan.name}</Text>
      <Text style={s.planSubtitle}>{plan.subtitle}</Text>

      <View style={s.priceRow}>
        <Text style={s.price}>{plan.price}</Text>
        <Text style={s.period}>{plan.period}</Text>
      </View>

      <View style={s.featuresList}>
        {plan.features.map((f) => (
          <View key={f} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={T.accent} />
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <Pressable
        disabled={isCurrent}
        onPress={onSelect}
        style={({ pressed }) => [
          s.ctaBtn,
          isCurrent && s.ctaBtnCurrent,
          pressed && !isCurrent && { opacity: 0.85 },
        ]}
      >
        <Text style={[s.ctaBtnText, isCurrent && s.ctaBtnTextCurrent]}>
          {isCurrent ? 'Current Plan' : 'Select Package'}
        </Text>
      </Pressable>
    </View>
  );
}

// ═══════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════
export default function SubscriptionsScreen() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const router = useRouter();
  const { tier, setTier } = useSubscription();

  const initiatePaystackCheckout = useCallback((tierId: string) => {
    const plan = PLANS.find((p) => p.id === tierId);
    if (!plan) return;

    const payload = buildCheckoutPayload(plan);
    console.log('[Paystack] Initiating checkout with payload:', payload);

    Alert.alert(
      'Paystack Secure Checkout',
      'Connecting to Paystack Secure Checkout Gateway...',
      [
        {
          text: 'OK',
          onPress: () => {
            // Mock a successful transaction by updating shared subscription state.
            setTier(plan.id);
          },
        },
      ],
    );
  }, [setTier]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Plans & Pricing</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer>
          <Text style={styles.intro}>
            Choose the plan that fits your hiring needs. Upgrade or downgrade anytime.
          </Text>

          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrent={tier === plan.id}
              onSelect={() => initiatePaystackCheckout(plan.id)}
              T={T}
            />
          ))}
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: T.textSecondary, marginBottom: 20, lineHeight: 20 },
});

const makeCardStyles = (T: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: T.card, borderRadius: 20, borderWidth: 1, borderColor: T.border,
    padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHighlight: { borderWidth: 2, borderColor: T.accent },
  popularBadge: {
    position: 'absolute', top: -10, right: 20,
    backgroundColor: T.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '800', color: T.textOnAccent, letterSpacing: 0.3 },

  planName: { fontSize: 20, fontWeight: '800', color: T.textPrimary },
  planSubtitle: { fontSize: 13, fontWeight: '600', color: T.textSecondary, marginTop: 2, marginBottom: 14 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  price: { fontSize: 30, fontWeight: '800', color: T.accent },
  period: { fontSize: 14, color: T.textSecondary },

  featuresList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { flex: 1, fontSize: 13, color: T.textSecondary },

  ctaBtn: {
    backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnCurrent: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
  ctaBtnTextCurrent: { color: T.textSecondary },
});
