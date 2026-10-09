import { useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '@/lib/goBack';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, RADIUS, ELEVATION } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import ScreenFrame from '@/components/ScreenFrame';
import AnimatedPressable from '@/components/AnimatedPressable';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import PageHead from '@/components/PageHead';
import { useAccountStatus } from '@/lib/useAccountStatus';
import PendingAccountBlock from '@/components/PendingAccountBlock';
import { DateField } from '@/components/DateTimeFields';
import { draftJobDescription } from '@/lib/aiAssist';

// Only Corporate/Short-Term are postable here — Gig stays a Phase 3 stub
// (permanently waitlisted regardless of scoring, per the matching engine's
// own deferral), so it's not offered as an option at all, not even disabled.
const POSTABLE_TIERS: Tier[] = ['corporate', 'short_term'];
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const;
const LOCATION_TYPES = ['remote', 'hybrid', 'on_site'] as const;
const RATE_TYPES = ['monthly', 'hourly', 'fixed'] as const;
const EMPLOYMENT_TYPES = ['permanent', 'contract'] as const;
const URGENCY_LEVELS = ['standard', 'urgent', 'immediate'] as const;
// TIER_CONFIG.corporate.accent ('#059669') on its own selected-chip tint
// background measures 3.27:1 — fails WCAG AA's 4.5:1 (found via axe-core).
// Scoped to this one selected-chip text/icon use, not TIER_CONFIG itself,
// since short_term's accent already passes here and other TIER_CONFIG call
// sites (badges on solid, more saturated backgrounds) weren't flagged.
const TIER_TEXT_COLOR: Partial<Record<Tier, string>> = { corporate: '#047857' };

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
  const [employmentType, setEmploymentType] = useState<typeof EMPLOYMENT_TYPES[number] | null>(null);
  const [urgency, setUrgency] = useState<typeof URGENCY_LEVELS[number]>('standard');
  const [locationType, setLocationType] = useState<typeof LOCATION_TYPES[number]>('remote');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [contractLength, setContractLength] = useState('');
  const [rateMin, setRateMin] = useState('');
  const [rateMax, setRateMax] = useState('');
  const [rateType, setRateType] = useState<typeof RATE_TYPES[number]>('monthly');
  const [startDate, setStartDate] = useState('');
  // Stored as one formatted visibility_description (no schema change, no
  // update needed anywhere that already reads that column) but *entered* as
  // three separate fields — structure the company can't skip, rather than
  // one blob most postings left as an unstructured paragraph.
  const [overview, setOverview] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);
  const companyStatus = useAccountStatus('companies', companyId);

  const handleWriteWithAi = async () => {
    if (!companyId) return;
    setAiLoading(true);
    try {
      const draft = await draftJobDescription({
        companyId, title, tier, roleFunction, mustHave, niceToHave,
        experienceLevel, employmentType, locationType, locationCity, locationCountry,
        rateMin, rateMax, rateType, contractLength,
      });
      setOverview(draft.overview);
      setResponsibilities(draft.responsibilities);
      setRequirements(draft.requirements);
      setErrors((e) => ({ ...e, overview: '', responsibilities: '', requirements: '' }));
    } catch (err) {
      notify('Could not generate a draft', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

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
    if (!employmentType) newErrors.employmentType = 'Pick permanent or contract';
    // Required, not just encouraged: a role with no must-have skills used to
    // match every candidate at full credit regardless of actual fit
    // (lib/matchingEngine.ts's skillOverlapScore) — confirmed live, this was
    // the actual cause of candidates seeing completely unrelated roles.
    if (mustHave.length === 0) newErrors.mustHave = 'Add at least one must-have skill so matching can tell who actually fits';
    if (!overview.trim()) newErrors.overview = 'An overview is required';
    if (!responsibilities.trim()) newErrors.responsibilities = 'List at least the core responsibilities';
    if (!requirements.trim()) newErrors.requirements = 'List at least the core requirements';
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
    if (companyStatus === 'pending' || companyStatus === 'rejected') {
      notify('Account pending approval', "You can't post a role until your account is approved.");
      return;
    }
    setLoading(true);

    const visibilityDescription = [
      `Overview\n${overview.trim()}`,
      `Responsibilities\n${responsibilities.trim()}`,
      `Requirements\n${requirements.trim()}`,
    ].join('\n\n');

    const { data, error } = await supabase
      .from('roles')
      .insert({
        company_id: companyId,
        tier,
        title: title.trim(),
        function: roleFunction.trim() || null,
        required_skills: { must_have: mustHave, nice_to_have: niceToHave },
        experience_level: experienceLevel,
        employment_type: employmentType,
        urgency,
        location_type: locationType,
        location_city: locationType === 'remote' ? null : locationCity.trim() || null,
        location_country: locationType === 'remote' ? null : locationCountry.trim() || null,
        contract_length: employmentType === 'contract' ? (contractLength.trim() || null) : null,
        rate_min: rateMin ? Number(rateMin) : null,
        rate_max: rateMax ? Number(rateMax) : null,
        rate_type: rateType,
        start_date: startDate || null,
        visibility_description: visibilityDescription,
        status: 'matching',
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      notify('Could not post role', error.message);
      return;
    }

    // Matching is NOT triggered here — shortlist.tsx's own auto-trigger
    // (on first open of a never-matched role) already does it and, unlike
    // this call, reloads the screen's cards afterward. Confirmed live
    // (2026-10-01): calling requestMatching() from both places fires two
    // concurrent /api/run-matching requests for the same role, which race
    // on match_scores' upsert-then-delete-stale-rows sequence — the
    // shortlist screen's own load() can land mid-race and read an empty
    // result even though matching genuinely succeeded, showing a blank
    // "No candidates matched" where real matches exist.
    router.replace({ pathname: '/(company)/shortlist', params: { roleId: data.id } });
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Post a Role" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenFrame>
        <View style={st.header}>
          <AnimatedPressable style={st.backButton} onPress={() => goBack(router, '/(company)')} hitSlop={2} accessibilityRole="button" accessibilityLabel="Go back">
            <AppIcon name="arrow-back" size={20} color={T.textPrimary} />
          </AnimatedPressable>
          <Text style={st.headerTitle}>Post a Role</Text>
        </View>

        {companyStatus === 'pending' || companyStatus === 'rejected' ? (
          <PendingAccountBlock status={companyStatus} action="post roles" />
        ) : (
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
                const textColor = TIER_TEXT_COLOR[t] ?? cfg.accent;
                return (
                  <AnimatedPressable
                    key={t}
                    style={[st.tierCard, selected && { borderColor: cfg.accent, backgroundColor: cfg.accent + '10' }]}
                    onPress={() => setTier(t)}
                  >
                    <AppIcon name={cfg.icon as AppIconName} size={18} color={selected ? textColor : T.textMuted} />
                    <Text style={[st.tierCardText, selected && { color: textColor, fontWeight: '700' }]}>{cfg.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>Function</Text>
              <View style={st.inputWrap}>
                <TextInput
                  style={st.input}
                  placeholder="Engineering, Sales…"
                  placeholderTextColor={T.textMuted}
                  value={roleFunction}
                  onChangeText={setRoleFunction}
                />
              </View>
            </View>

            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>Experience</Text>
              <View style={st.chipRow}>
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <AnimatedPressable key={lvl} style={[st.chip, experienceLevel === lvl && st.chipActive]} onPress={() => setExperienceLevel(experienceLevel === lvl ? null : lvl)}>
                    <Text style={[st.chipText, experienceLevel === lvl && st.chipTextActive]}>{lvl}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>Employment Type *</Text>
              <View style={st.chipRow}>
                {EMPLOYMENT_TYPES.map((et) => (
                  <AnimatedPressable key={et} style={[st.chip, employmentType === et && st.chipActive]} onPress={() => { setEmploymentType(et); setErrors((e) => ({ ...e, employmentType: '' })); }}>
                    <Text style={[st.chipText, employmentType === et && st.chipTextActive]}>{et === 'permanent' ? 'Permanent' : 'Contract'}</Text>
                  </AnimatedPressable>
                ))}
              </View>
              {errors.employmentType ? <Text style={st.errorText}>{errors.employmentType}</Text> : null}
            </View>

            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>Urgency</Text>
              <View style={st.chipRow}>
                {URGENCY_LEVELS.map((u) => (
                  <AnimatedPressable key={u} style={[st.chip, urgency === u && st.chipActive]} onPress={() => setUrgency(u)}>
                    <Text style={[st.chipText, urgency === u && st.chipTextActive]}>{u === 'standard' ? 'Standard' : u === 'urgent' ? 'Urgent' : 'Immediate'}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </View>

          {employmentType === 'contract' && (
            <View style={st.fieldWrap}>
              <Text style={st.label}>Contract Length</Text>
              <View style={st.inputWrap}>
                <TextInput style={st.input} placeholder="6 months" placeholderTextColor={T.textMuted} value={contractLength} onChangeText={setContractLength} />
              </View>
            </View>
          )}

          <TagField
            T={T} st={st} label="Must-Have Skills *"
            inputValue={mustHaveInput} onInputChange={setMustHaveInput}
            tags={mustHave}
            onAdd={() => { addTag(mustHaveInput, mustHave, setMustHave, () => setMustHaveInput('')); setErrors((e) => ({ ...e, mustHave: '' })); }}
            onRemove={(s) => setMustHave(mustHave.filter((x) => x !== s))}
            error={errors.mustHave}
          />

          <TagField
            T={T} st={st} label="Nice-to-Have Skills"
            inputValue={niceToHaveInput} onInputChange={setNiceToHaveInput}
            tags={niceToHave} onAdd={() => addTag(niceToHaveInput, niceToHave, setNiceToHave, () => setNiceToHaveInput(''))}
            onRemove={(s) => setNiceToHave(niceToHave.filter((x) => x !== s))}
          />

          <View style={st.fieldWrap}>
            <Text style={st.label}>Location</Text>
            <View style={st.chipRow}>
              {LOCATION_TYPES.map((lt) => (
                <AnimatedPressable key={lt} style={[st.chip, locationType === lt && st.chipActive]} onPress={() => setLocationType(lt)}>
                  <Text style={[st.chipText, locationType === lt && st.chipTextActive]}>{lt === 'on_site' ? 'On-site' : lt === 'hybrid' ? 'Hybrid' : 'Remote'}</Text>
                </AnimatedPressable>
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
            <Text style={st.label}>Rate (₦)</Text>
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
                <AnimatedPressable key={rt} style={[st.chip, rateType === rt && st.chipActive]} onPress={() => setRateType(rt)}>
                  <Text style={[st.chipText, rateType === rt && st.chipTextActive]}>{rt}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <AnimatedPressable style={st.moreDetailsToggle} onPress={() => setShowMore((v) => !v)} accessibilityRole="button" accessibilityLabel="Toggle more details">
            <Text style={st.moreDetailsText}>More details</Text>
            <Text style={st.moreDetailsHint}>Start date</Text>
            <AppIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={T.textSecondary} />
          </AnimatedPressable>

          {showMore && (
            <View style={st.fieldWrap}>
              <Text style={st.label}>Start Date</Text>
              <DateField value={startDate} onChange={(t) => { setStartDate(t); setErrors((e) => ({ ...e, startDate: '' })); }} T={T} />
              {errors.startDate ? <Text style={st.errorText}>{errors.startDate}</Text> : null}
            </View>
          )}

          <AnimatedPressable
            style={[st.aiButton, (aiLoading || !title.trim() || mustHave.length === 0) && st.aiButtonDisabled]}
            onPress={handleWriteWithAi}
            disabled={aiLoading || !title.trim() || mustHave.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Write overview, responsibilities and requirements with AI"
          >
            {aiLoading ? (
              <ActivityIndicator color={T.accent} size="small" />
            ) : (
              <AppIcon name="sparkles-outline" size={16} color={T.accent} />
            )}
            <Text style={st.aiButtonText}>{aiLoading ? 'Writing…' : 'Write with AI'}</Text>
          </AnimatedPressable>
          {(!title.trim() || mustHave.length === 0) && (
            <Text style={st.aiButtonHint}>Add a title and at least one must-have skill to use AI drafting.</Text>
          )}

          <View style={st.fieldWrap}>
            <Text style={st.label}>Overview *</Text>
            <View style={[st.textAreaWrap, errors.overview ? st.inputError : null]}>
              <TextInput
                style={st.textArea}
                placeholder="What will this person actually do? What makes the role compelling?"
                placeholderTextColor={T.textMuted}
                value={overview}
                onChangeText={(t) => { setOverview(t); setErrors((e) => ({ ...e, overview: '' })); }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.overview ? <Text style={st.errorText}>{errors.overview}</Text> : null}
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Responsibilities *</Text>
            <View style={[st.textAreaWrap, errors.responsibilities ? st.inputError : null]}>
              <TextInput
                style={st.textArea}
                placeholder="Day-to-day duties — one per line reads best"
                placeholderTextColor={T.textMuted}
                value={responsibilities}
                onChangeText={(t) => { setResponsibilities(t); setErrors((e) => ({ ...e, responsibilities: '' })); }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.responsibilities ? <Text style={st.errorText}>{errors.responsibilities}</Text> : null}
          </View>

          <View style={st.fieldWrap}>
            <Text style={st.label}>Requirements *</Text>
            <View style={[st.textAreaWrap, errors.requirements ? st.inputError : null]}>
              <TextInput
                style={st.textArea}
                placeholder="What a candidate needs to already have — experience, qualifications, must-haves"
                placeholderTextColor={T.textMuted}
                value={requirements}
                onChangeText={(t) => { setRequirements(t); setErrors((e) => ({ ...e, requirements: '' })); }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.requirements ? <Text style={st.errorText}>{errors.requirements}</Text> : null}
          </View>

          <AnimatedPressable style={[st.submitButton, loading && st.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <Text style={st.submitText}>Posting…</Text>
            ) : (
              <>
                <Text style={st.submitText}>Post Role</Text>
                <AppIcon name="arrow-forward" size={18} color={T.textOnAccent} />
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
        )}
        </ScreenFrame>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TagField({ T, st, label, inputValue, onInputChange, tags, onAdd, onRemove, error }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; label: string;
  inputValue: string; onInputChange: (v: string) => void;
  tags: string[]; onAdd: () => void; onRemove: (tag: string) => void; error?: string;
}) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.label}>{label}</Text>
      <View style={[st.inputWrap, error ? st.inputError : null]}>
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
          <AnimatedPressable style={st.addTagBtn} onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()} "${inputValue.trim()}"`}>
            <AppIcon name="add" size={18} color={T.textOnAccent} />
          </AnimatedPressable>
        )}
      </View>
      {tags.length > 0 && (
        <View style={st.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={st.tagChip}>
              <Text style={st.tagChipText}>{tag}</Text>
              <AnimatedPressable onPress={() => onRemove(tag)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Remove ${tag}`}>
                <AppIcon name="close" size={14} color={T.accent} />
              </AnimatedPressable>
            </View>
          ))}
        </View>
      )}
      {error ? <Text style={st.errorText}>{error}</Text> : null}
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
    backgroundColor: T.surface, borderRadius: RADIUS.control,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 16, height: 52,
  },
  inputError: { borderColor: T.danger, backgroundColor: T.dangerBg },
  input: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: '500' },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 6, marginLeft: 4 },
  textAreaWrap: { backgroundColor: T.surface, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 12 },
  textArea: { fontSize: 15, color: T.textPrimary, fontWeight: '500', minHeight: 110 },
  tierRow: { flexDirection: 'row', gap: 10 },
  tierCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: T.border, borderRadius: RADIUS.control, paddingVertical: 14, backgroundColor: T.surface },
  tierCardText: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.chip, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  chipActive: { borderColor: T.accent, backgroundColor: T.accentBg },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: T.accentDim, fontWeight: '700' },
  addTagBtn: { width: 30, height: 30, borderRadius: RADIUS.chip, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.chip },
  tagChipText: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  submitButton: {
    backgroundColor: T.accentSolid, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 8,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.accentBg, borderWidth: 1.5, borderColor: T.accent + '40',
    borderRadius: RADIUS.card, paddingVertical: 13, marginBottom: 8,
  },
  aiButtonDisabled: { opacity: 0.5 },
  aiButtonText: { fontSize: 14, fontWeight: '700', color: T.accentDim },
  aiButtonHint: { fontSize: 12, color: T.textMuted, textAlign: 'center', marginBottom: 18, marginTop: -2 },
  moreDetailsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  moreDetailsText: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  moreDetailsHint: { flex: 1, fontSize: 12, color: T.textMuted },
  submitText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
