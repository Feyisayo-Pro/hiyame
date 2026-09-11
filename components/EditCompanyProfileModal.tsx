import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'Education',
  'Manufacturing', 'Retail & E-Commerce', 'Energy', 'Agriculture',
  'Media & Entertainment', 'Logistics & Supply Chain', 'Consulting', 'Other',
];

const COMPANY_SIZES = [
  '1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees',
];

export interface CompanyEditable {
  legalName: string;
  tradingName: string | null;
  industry: string | null;
  sizeRange: string | null;
  hqLocation: string | null;
  websiteUrl: string | null;
  description: string | null;
}

interface Props {
  visible: boolean;
  companyId: string | null;
  initial: CompanyEditable;
  onClose: () => void;
  onSaved: (updated: CompanyEditable) => void;
}

export default function EditCompanyProfileModal({ visible, companyId, initial, onClose, onSaved }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [legalName, setLegalName] = useState(initial.legalName);
  const [tradingName, setTradingName] = useState(initial.tradingName ?? '');
  const [industry, setIndustry] = useState(initial.industry ?? '');
  const [sizeRange, setSizeRange] = useState(initial.sizeRange ?? '');
  const [hqLocation, setHqLocation] = useState(initial.hqLocation ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setLegalName(initial.legalName);
      setTradingName(initial.tradingName ?? '');
      setIndustry(initial.industry ?? '');
      setSizeRange(initial.sizeRange ?? '');
      setHqLocation(initial.hqLocation ?? '');
      setWebsiteUrl(initial.websiteUrl ?? '');
      setDescription(initial.description ?? '');
    }
  }, [visible, initial]);

  const close = () => { if (!saving) onClose(); };

  const save = async () => {
    if (!companyId) return;
    const name = legalName.trim();
    if (!name) {
      notify('Company name required', 'Enter your company name.');
      return;
    }
    const payload = {
      legal_name: name,
      trading_name: tradingName.trim() || name,
      industry: industry.trim() || null,
      size_range: sizeRange.trim() || null,
      hq_location: hqLocation.trim() || null,
      website_url: websiteUrl.trim() || null,
      description: description.trim().slice(0, 300) || null,
    };

    setSaving(true);
    const { error } = await supabase.from('companies').update(payload).eq('id', companyId);
    setSaving(false);

    if (error) {
      notify('Could not save', error.message);
      return;
    }
    onSaved({
      legalName: payload.legal_name,
      tradingName: payload.trading_name,
      industry: payload.industry,
      sizeRange: payload.size_range,
      hqLocation: payload.hq_location,
      websiteUrl: payload.website_url,
      description: payload.description,
    });
    notify('Company profile updated', 'Your changes are live.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Edit Company Profile</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Legal name</Text>
            <TextInput style={s.input} value={legalName} onChangeText={setLegalName} placeholder="Registered company name" placeholderTextColor={T.textMuted} />

            <Text style={s.label}>Trading name (optional)</Text>
            <TextInput style={s.input} value={tradingName} onChangeText={setTradingName} placeholder="What candidates see, if different" placeholderTextColor={T.textMuted} />

            <Text style={s.label}>Industry</Text>
            <View style={s.chipsWrap}>
              {INDUSTRIES.map((ind) => (
                <Pressable key={ind} style={[s.chip, industry === ind && s.chipActive]} onPress={() => setIndustry(ind)}>
                  <Text style={[s.chipText, industry === ind && s.chipTextActive]}>{ind}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>Company size</Text>
            <View style={s.chipsWrap}>
              {COMPANY_SIZES.map((size) => (
                <Pressable key={size} style={[s.chip, sizeRange === size && s.chipActive]} onPress={() => setSizeRange(size)}>
                  <Text style={[s.chipText, sizeRange === size && s.chipTextActive]}>{size}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>HQ location</Text>
            <TextInput style={s.input} value={hqLocation} onChangeText={setHqLocation} placeholder="City, Country" placeholderTextColor={T.textMuted} />

            <Text style={s.label}>Website</Text>
            <TextInput style={s.input} value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://" placeholderTextColor={T.textMuted} autoCapitalize="none" />

            <Text style={s.label}>Description ({description.length}/300)</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 300))}
              placeholder="A short line candidates see about your company"
              placeholderTextColor={T.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <Pressable style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 480, maxHeight: '88%', backgroundColor: T.card, borderRadius: 20, padding: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: T.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.inputBg, paddingHorizontal: 14, fontSize: 14, color: T.textPrimary,
  },
  multiline: { height: 76, paddingTop: 12, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  chipActive: { backgroundColor: T.accentBg, borderColor: T.accent },
  chipText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
  chipTextActive: { color: T.accent },
  saveBtn: { height: 48, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },
});
