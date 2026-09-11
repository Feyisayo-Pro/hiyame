import { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { requestMatching } from '@/lib/requestMatching';
import ScreenFrame from '@/components/ScreenFrame';
import AnimatedPressable from '@/components/AnimatedPressable';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';

// Only Corporate/Short-Term are postable here — Gig stays a Phase 3 stub
// (permanently waitlisted regardless of scoring, per the matching engine's
// own deferral), so it's not offered as an option at all, not even disabled.
const POSTABLE_TIERS: Tier[] = ['corporate', 'short_term'];
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const;
const LOCATION_TYPES = ['remote', 'hybrid', 'on_site'] as const;
const RATE_TYPES = ['monthly', 'hourly', 'fixed'] as const;

export default function CreateRoleScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { companyId } = useAuth();

  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<Tier>('corporate');
  const [roleFunction, setRoleFunction] = useState('');

  const [mustHaveInput, setMustHaveInput] = useState('');
  const [mustHave, setMustHave] = useState<string[]>([]);
  const [niceToHaveInput, setNiceToHaveInput] = useState('');
  const [niceToHave, setNiceToHave] = useState<string[]>([]);

  const [experienceLevel, setExperienceLevel] = useState<typeof EXPERIENCE_LEVELS[number] | null>(null);
  const [locationType, setLocationType] = useState<typeof LOCATION_TYPES[number]>('remote');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [contractLength, setContractLength] = useState('');
  const [rateMin, setRateMin] = useState('');
  const [rateMax, setRateMax] = useState('');
  const [rateType, setRateType] = useState<typeof RATE_TYPES[number]>('monthly');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTag = (value: string, list: string[], setList: (s: string[]) => void, clear: () => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clear();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Role title is required';
    if (!description.trim()) newErrors.description = 'A candidate-facing description is required';
    if (locationType !== 'remote' && !locationCity.trim()) newErrors.locationCity = 'City is required for on-site/hybrid roles';
    if (rateMin && isNaN(Number(rateMin))) newErrors.rateMin = 'Enter a valid number';
    if (rateMax && isNaN(Number(rateMax))) newErrors.rateMax = 'Enter a valid number';
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) newErrors.startDate = 'Use YYYY-MM-DD format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!companyId) {
      notify('Something went wrong', 'No company account found for this session.');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('roles')
      .insert({
        company_id: companyId,
        tier,
        title: title.trim(),
        function: roleFunction.trim() || null,
        required_skills: { must_have: mustHave, nice_to_have: niceToHave },
        experience_level: experienceLevel,
        location_type: locationType,
        location_city: locationType === 'remote' ? null : locationCity.trim() || null,
        location_country: locationType === 'remote' ? null : locationCountry.trim() || null,
        contract_length: contractLength.trim() || null,
        rate_min: rateMin ? Number(rateMin) : null,
        rate_max: rateMax ? Number(rateMax) : null,
        rate_type: rateType,
        start_date: startDate || null,
        visibility_description: description.trim(),
        status: 'matching',
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      notify('Could not post role', error.message);
      return;
    }

    // Kick off matching for the new role. Don't block navigation on it — the
    // shortlist screen shows its own "finding candidates" state and will
    // trigger the run itself if this didn't land (e.g. local dev has no
    // /api route).
    void requestMatching(data.id);
    router.replace({ pathname: '/(company)/shortlist', params: { roleId: data.id } });
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenFrame>
        <View style={st.header}>
          <Pressable style={st.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <Text style={st.headerTitle}>Post a Role</Text>
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.fieldWrap}>
            <Text style={st.label}>Role Title *</Text>
            <View style={[st.inputWrap, errors.title ? st.inputError : null]}>
              <TextInput
                style={st.input}
                placeholder="Senior Backend Engineer"
                placeholderTextColor={T.textMuted}
                value={title}
                onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
              />
            </View>
            {errors.title ? <Text style={st.errorText}>{errors.title}</Text> : null}
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Contract Tier *</Text>
            <View style={st.tierRow}>
              {POSTABLE_TIERS.map((t) => {
                const cfg = TIER_CONFIG[t];
                const selected = tier === t;
                return (
                  <Pressable
                    key={t}
                    style={[st.tierCard, selected && { borderColor: cfg.accent, backgroundColor: cfg.accent + '10' }]}
                    onPress={() => setTier(t)}
                  >
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={18} color={selected ? cfg.accent : T.textMuted} />
                    <Text style={[st.tierCardText, selected && { color: cfg.accent, fontWeight: '700' }]}>{cfg.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Function</Text>
            <View style={st.inputWrap}>
              <TextInput
                style={st.input}
                placeholder="Engineering, Sales, Design..."
                placeholderTextColor={T.textMuted}
                value={roleFunction}
                onChangeText={setRoleFunction}
              />
            </View>
          </View>

          <TagField
            T={T} st={st} label="Must-Have Skills"
            inputValue={mustHaveInput} onInputChange={setMustHaveInput}
            tags={mustHave} onAdd={() => addTag(mustHaveInput, mustHave, setMustHave, () => setMustHaveInput(''))}
            onRemove={(s) => setMustHave(mustHave.filter((x) => x !== s))}
          />

          <TagField
            T={T} st={st} label="Nice-to-Have Skills"
            inputValue={niceToHaveInput} onInputChange={setNiceToHaveInput}
            tags={niceToHave} onAdd={() => addTag(niceToHaveInput, niceToHave, setNiceToHave, () => setNiceToHaveInput(''))}
            onRemove={(s) => setNiceToHave(niceToHave.filter((x) => x !== s))}
          />

          <View style={st.fieldWrap}>
            <Text style={st.label}>Experience Level</Text>
            <View style={st.chipRow}>
              {EXPERIENCE_LEVELS.map((lvl) => (
                <Pressable key={lvl} style={[st.chip, experienceLevel === lvl && st.chipActive]} onPress={() => setExperienceLevel(experienceLevel === lvl ? null : lvl)}>
                  <Text style={[st.chipText, experienceLevel === lvl && st.chipTextActive]}>{lvl}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Location</Text>
            <View style={st.chipRow}>
              {LOCATION_TYPES.map((lt) => (
                <Pressable key={lt} style={[st.chip, locationType === lt && st.chipActive]} onPress={() => setLocationType(lt)}>
                  <Text style={[st.chipText, locationType === lt && st.chipTextActive]}>{lt === 'on_site' ? 'On-site' : lt === 'hybrid' ? 'Hybrid' : 'Remote'}</Text>
                </Pressable>
              ))}
            </View>
            {locationType !== 'remote' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={[st.inputWrap, { flex: 1 }, errors.locationCity ? st.inputError : null]}>
                  <TextInput style={st.input} placeholder="City" placeholderTextColor={T.textMuted} value={locationCity} onChangeText={(t) => { setLocationCity(t); setErrors((e) => ({ ...e, locationCity: '' })); }} />
                </View>
                <View style={[st.inputWrap, { flex: 1 }]}>
                  <TextInput style={st.input} placeholder="Country" placeholderTextColor={T.textMuted} value={locationCountry} onChangeText={setLocationCountry} />
                </View>
              </View>
            )}
            {errors.locationCity ? <Text style={st.errorText}>{errors.locationCity}</Text> : null}
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Contract Length</Text>
            <View style={st.inputWrap}>
              <TextInput style={st.input} placeholder="Permanent, 6 months, etc." placeholderTextColor={T.textMuted} value={contractLength} onChangeText={setContractLength} />
            </View>
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Rate</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={[st.inputWrap, { flex: 1 }, errors.rateMin ? st.inputError : null]}>
                <TextInput style={st.input} placeholder="Min" placeholderTextColor={T.textMuted} keyboardType="numeric" value={rateMin} onChangeText={(t) => { setRateMin(t); setErrors((e) => ({ ...e, rateMin: '' })); }} />
              </View>
              <View style={[st.inputWrap, { flex: 1 }, errors.rateMax ? st.inputError : null]}>
                <TextInput style={st.input} placeholder="Max" placeholderTextColor={T.textMuted} keyboardType="numeric" value={rateMax} onChangeText={(t) => { setRateMax(t); setErrors((e) => ({ ...e, rateMax: '' })); }} />
              </View>
            </View>
            {(errors.rateMin || errors.rateMax) ? <Text style={st.errorText}>{errors.rateMin || errors.rateMax}</Text> : null}
            <View style={st.chipRow}>
              {RATE_TYPES.map((rt) => (
                <Pressable key={rt} style={[st.chip, rateType === rt && st.chipActive]} onPress={() => setRateType(rt)}>
                  <Text style={[st.chipText, rateType === rt && st.chipTextActive]}>{rt}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Start Date</Text>
            <View style={[st.inputWrap, errors.startDate ? st.inputError : null]}>
              <TextInput style={st.input} placeholder="YYYY-MM-DD" placeholderTextColor={T.textMuted} value={startDate} onChangeText={(t) => { setStartDate(t); setErrors((e) => ({ ...e, startDate: '' })); }} />
            </View>
            {errors.startDate ? <Text style={st.errorText}>{errors.startDate}</Text> : null}
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Description *</Text>
            <View style={[st.textAreaWrap, errors.description ? st.inputError : null]}>
              <TextInput
                style={st.textArea}
                placeholder="What will this person actually do? What makes the role compelling?"
                placeholderTextColor={T.textMuted}
                value={description}
                onChangeText={(t) => { setDescription(t); setErrors((e) => ({ ...e, description: '' })); }}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            {errors.description ? <Text style={st.errorText}>{errors.description}</Text> : null}
          </View>

          <AnimatedPressable style={[st.submitButton, loading && st.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <Text style={st.submitText}>Posting...</Text>
            ) : (
              <>
                <Text style={st.submitText}>Post Role</Text>
                <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
        </ScreenFrame>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TagField({ T, st, label, inputValue, onInputChange, tags, onAdd, onRemove }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; label: string;
  inputValue: string; onInputChange: (v: string) => void;
  tags: string[]; onAdd: () => void; onRemove: (tag: string) => void;
}) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.label}>{label}</Text>
      <View style={st.inputWrap}>
        <TextInput
          style={st.input}
          placeholder="Type a skill and press add"
          placeholderTextColor={T.textMuted}
          value={inputValue}
          onChangeText={onInputChange}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        {inputValue.trim().length > 0 && (
          <Pressable style={st.addTagBtn} onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()} "${inputValue.trim()}"`}>
            <Ionicons name="add" size={18} color={T.textOnAccent} />
          </Pressable>
        )}
      </View>
      {tags.length > 0 && (
        <View style={st.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={st.tagChip}>
              <Text style={st.tagChipText}>{tag}</Text>
              <Pressable onPress={() => onRemove(tag)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Remove ${tag}`}>
                <Ionicons name="close" size={14} color={T.accent} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  fieldWrap: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 16, height: 52,
  },
  inputError: { borderColor: T.danger, backgroundColor: T.dangerBg },
  input: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: '500' },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 6, marginLeft: 4 },
  textAreaWrap: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 12 },
  textArea: { fontSize: 15, color: T.textPrimary, fontWeight: '500', minHeight: 110 },
  tierRow: { flexDirection: 'row', gap: 10 },
  tierCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: T.border, borderRadius: 14, paddingVertical: 14, backgroundColor: T.surface },
  tierCardText: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  chipActive: { borderColor: T.accent, backgroundColor: T.accentBg },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: T.accent, fontWeight: '700' },
  addTagBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagChipText: { fontSize: 13, fontWeight: '600', color: T.accent },
  submitButton: {
    backgroundColor: T.accent, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 8,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
