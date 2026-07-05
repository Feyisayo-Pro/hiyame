/**
 * AccountSettings -- premium account settings & SaaS subscription gateway.
 * Shared component for both candidate and company personas.
 */
import { useState, useMemo, useCallback } from 'react';
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';
import { useSubscription } from '@/lib/subscriptionStore';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

type Persona = 'company' | 'candidate';

// == Plan Data ==

interface PlanInfo {
  key: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const COMPANY_PLANS: PlanInfo[] = [
  {
    key: 'scout',
    name: 'Scout',
    price: '$0',
    period: '/month',
    features: ['10 daily swipes', 'Basic filters', '3 active matches', 'Email support'],
  },
  {
    key: 'hire',
    name: 'Hire',
    price: '$49',
    period: '/month',
    features: ['50 daily swipes', 'Advanced filters', '15 active matches', 'Priority support', 'Analytics dashboard'],
    popular: true,
  },
  {
    key: 'scale',
    name: 'Scale',
    price: '$149',
    period: '/month',
    features: ['Unlimited swipes', 'All filters', 'Unlimited matches', 'Dedicated manager', 'API access', 'Custom branding'],
  },
];

const CANDIDATE_PLANS: PlanInfo[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['Basic profile', '5 daily applications', 'Job alerts', 'Community access'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$9',
    period: '/month',
    features: ['Priority visibility', '25 daily applications', 'Profile analytics', 'Read receipts', 'Featured badge'],
    popular: true,
  },
];

// == Payment Modal ==

function PaymentModal({
  visible,
  onClose,
  plan,
  T,
}: {
  visible: boolean;
  onClose: () => void;
  plan: PlanInfo | null;
  T: ThemePalette;
}) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('');

  const handlePay = useCallback(() => {
    setStep('processing');
    setTimeout(() => setStep('success'), 2000);
  }, []);

  const handleClose = useCallback(() => {
    setStep('form');
    setCvc('');
    onClose();
  }, [onClose]);

  if (!plan) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: T.textPrimary }}>
              {step === 'success' ? 'Payment Successful' : 'Upgrade to ' + plan.name}
            </Text>
            <Pressable onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            {step === 'success' ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Ionicons name="checkmark-circle" size={40} color={T.emerald} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 8 }}>Welcome to {plan.name}!</Text>
                <Text style={{ fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                  Your account has been upgraded. All premium features are now active.
                </Text>

                {/* Receipt */}
                <View style={{ width: '100%', backgroundColor: T.surface, borderRadius: 16, padding: 16, gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 4 }}>Receipt</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: T.textSecondary }}>Plan</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textPrimary }}>{plan.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: T.textSecondary }}>Amount</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textPrimary }}>{plan.price}{plan.period}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: T.textSecondary }}>Card</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textPrimary }}>**** 4242</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: T.textSecondary }}>Date</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textPrimary }}>{new Date().toLocaleDateString()}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: T.border, marginVertical: 4 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary }}>Total</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: T.accent }}>{plan.price}{plan.period}</Text>
                  </View>
                </View>

                <Pressable onPress={handleClose} style={{ backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 24 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: T.textOnAccent }}>Done</Text>
                </Pressable>
              </View>
            ) : step === 'processing' ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Ionicons name="card" size={28} color={T.accent} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>Processing payment...</Text>
                <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 4 }}>This will only take a moment</Text>
              </View>
            ) : (
              <>
                {/* Plan Summary */}
                <View style={{ backgroundColor: T.accentBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: T.accent }}>{plan.price}</Text>
                    <Text style={{ fontSize: 14, color: T.textSecondary }}>{plan.period}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary }}>{plan.name} Plan</Text>
                </View>

                {/* Card Form - MOCK UI ONLY */}
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 10 }}>Payment Details</Text>
                <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>This is a mock checkout for demonstration purposes.</Text>

                <View style={{ gap: 12, marginBottom: 24 }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginBottom: 4 }}>Card Number</Text>
                    <TextInput
                      style={{ backgroundColor: T.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: T.inputText, borderWidth: 1, borderColor: T.border }}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      placeholderTextColor={T.inputPlaceholder}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginBottom: 4 }}>Expiry</Text>
                      <TextInput
                        style={{ backgroundColor: T.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: T.inputText, borderWidth: 1, borderColor: T.border }}
                        value={expiry}
                        onChangeText={setExpiry}
                        placeholderTextColor={T.inputPlaceholder}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginBottom: 4 }}>CVC</Text>
                      <TextInput
                        style={{ backgroundColor: T.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: T.inputText, borderWidth: 1, borderColor: T.border }}
                        value={cvc}
                        onChangeText={setCvc}
                        placeholder="123"
                        placeholderTextColor={T.inputPlaceholder}
                        keyboardType="number-pad"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>

                {/* Security Note */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 10, padding: 12, marginBottom: 20 }}>
                  <Ionicons name="lock-closed" size={16} color={T.emerald} />
                  <Text style={{ fontSize: 12, color: T.textSecondary, flex: 1 }}>Mock payment form. No real charges will be made. In production, this would use Stripe Elements with PCI-compliant tokenization.</Text>
                </View>

                <Pressable onPress={handlePay} style={{ backgroundColor: T.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="card" size={18} color={T.textOnAccent} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: T.textOnAccent }}>Pay {plan.price}{plan.period}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// == Settings Row ==

function SettingsRow({ icon, label, value, onPress, T, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; T: ThemePalette; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        backgroundColor: pressed ? T.surfaceHover : 'transparent',
        borderBottomWidth: 1, borderBottomColor: T.border,
      })}
    >
      <Ionicons name={icon as any} size={20} color={danger ? T.danger : T.textSecondary} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: danger ? T.danger : T.textPrimary }}>{label}</Text>
      {value && <Text style={{ fontSize: 13, color: T.textSecondary }}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={T.textMuted} />}
    </Pressable>
  );
}

// == Main Component ==

export default function AccountSettings({ persona = 'company' }: { persona?: Persona }) {
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const { tier, config } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  const plans = persona === 'company' ? COMPANY_PLANS : CANDIDATE_PLANS;

  const handleUpgrade = useCallback((plan: PlanInfo) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <SwipeFadeContainer>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>Settings</Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>Manage your account and subscription</Text>
          </View>

          {/* Current Plan Banner */}
          <View style={{ marginHorizontal: 20, backgroundColor: T.accentBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="crown-outline" size={18} color={T.accent} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.accent }}>{config.name} Plan</Text>
                </View>
                <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>
                  {tier === 'scale' ? 'You are on the highest tier' : 'Upgrade for more features'}
                </Text>
              </View>
              <View style={{ backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: T.textOnAccent }}>ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Subscription Plans */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 12 }}>
              {persona === 'company' ? 'Hiring Plans' : 'Career Plans'}
            </Text>
            <View style={{ gap: 12 }}>
              {plans.map((plan) => {
                const isCurrent = plan.key === tier || (persona === 'candidate' && plan.key === 'free' && tier === 'scout');
                return (
                  <View key={plan.key} style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: plan.popular ? 2 : 1, borderColor: plan.popular ? T.accent : T.border }}>
                    {plan.popular && (
                      <View style={{ position: 'absolute', top: -10, right: 16, backgroundColor: T.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: T.textOnAccent }}>POPULAR</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: T.textPrimary }}>{plan.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                          <Text style={{ fontSize: 24, fontWeight: '800', color: T.accent }}>{plan.price}</Text>
                          <Text style={{ fontSize: 13, color: T.textSecondary }}>{plan.period}</Text>
                        </View>
                      </View>
                      {isCurrent ? (
                        <View style={{ backgroundColor: T.emeraldBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: T.emerald }}>CURRENT</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleUpgrade(plan)} style={{ backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: T.textOnAccent }}>Upgrade</Text>
                        </Pressable>
                      )}
                    </View>
                    <View style={{ gap: 6 }}>
                      {plan.features.map((f) => (
                        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={14} color={T.emerald} />
                          <Text style={{ fontSize: 12, color: T.textSecondary }}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Account Settings */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Account</Text>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <SettingsRow icon="person-outline" label="Edit Profile" value={persona === 'company' ? 'Vertex Global' : 'Amara Osei'} onPress={() => {}} T={T} />
              <SettingsRow icon="mail-outline" label="Email" value="contact@example.com" onPress={() => {}} T={T} />
              <SettingsRow icon="lock-closed-outline" label="Password" value="Last changed 30d ago" onPress={() => {}} T={T} />
              <SettingsRow icon="globe-outline" label="Language" value="English" onPress={() => {}} T={T} />
            </View>
          </View>

          {/* Preferences */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Preferences</Text>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Dark Mode</Text>
                <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <Ionicons name="notifications-outline" size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Push Notifications</Text>
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Ionicons name="mail-outline" size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Email Updates</Text>
                <Switch value={emailUpdates} onValueChange={setEmailUpdates} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
            </View>
          </View>

          {/* Support */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Support</Text>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <SettingsRow icon="help-circle-outline" label="Help Center" onPress={() => {}} T={T} />
              <SettingsRow icon="chatbubble-outline" label="Contact Support" onPress={() => {}} T={T} />
              <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} T={T} />
              <SettingsRow icon="shield-outline" label="Privacy Policy" onPress={() => {}} T={T} />
            </View>
          </View>

          {/* Danger Zone */}
          <View>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <SettingsRow icon="log-out-outline" label="Sign Out" onPress={() => {}} T={T} danger />
            </View>
          </View>

          {/* Version */}
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ fontSize: 12, color: T.textMuted }}>hiyame v1.0.0</Text>
          </View>
        </SwipeFadeContainer>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal visible={showPayment} onClose={() => setShowPayment(false)} plan={selectedPlan} T={T} />
    </SafeAreaView>
  );
}
