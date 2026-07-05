/**
 * OfferLetterModal -- companies fill out and send formal offer letters.
 * Renders as a system_offer message in the chat timeline.
 */
import { useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { useChatStore } from '@/lib/chatStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  candidateName: string;
  companyName: string;
  roleTitle: string;
}

export default function OfferLetterModal({ visible, onClose, conversationId, candidateName, companyName, roleTitle }: Props) {
  const T = useTheme();
  const { addSystemMessage, updateConversationStatus } = useChatStore();

  const [salary, setSalary] = useState('$95,000/year');
  const [title, setTitle] = useState(roleTitle);
  const [startDate, setStartDate] = useState('August 1, 2026');
  const [notes, setNotes] = useState('Full remote with quarterly on-site meetups in Lagos. Health insurance and equity package included.');

  const handleSend = useCallback(() => {
    addSystemMessage(conversationId, {
      senderId: 'me',
      text: companyName + ' has extended a formal offer to ' + candidateName + ' for the ' + title + ' position.',
      timestamp: new Date().toISOString(),
      type: 'system_offer',
      meta: {
        offerSalary: salary,
        offerTitle: title,
        offerStartDate: startDate,
        responded: false,
      },
    });

    updateConversationStatus(conversationId, 'offer_extended');
    onClose();
  }, [conversationId, candidateName, companyName, title, salary, startDate, addSystemMessage, updateConversationStatus, onClose]);

  const inputStyle = {
    backgroundColor: T.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: T.inputText,
    borderWidth: 1,
    borderColor: T.border,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: T.textPrimary }}>Send Offer Letter</Text>
              <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>To: {candidateName}</Text>
            </View>
            <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            {/* Offer Preview Card */}
            <View style={{ backgroundColor: T.accentBg, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="document-text" size={20} color={T.accent} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: T.accent }}>Formal Offer</Text>
              </View>
              <View style={{ backgroundColor: T.card, borderRadius: 12, padding: 16 }}>
                <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>FROM</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 12 }}>{companyName}</Text>
                <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>TO</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.textPrimary }}>{candidateName}</Text>
              </View>
            </View>

            {/* Form Fields */}
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 6 }}>Position Title</Text>
                <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholderTextColor={T.inputPlaceholder} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 6 }}>Compensation</Text>
                <TextInput style={inputStyle} value={salary} onChangeText={setSalary} placeholderTextColor={T.inputPlaceholder} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 6 }}>Start Date</Text>
                <TextInput style={inputStyle} value={startDate} onChangeText={setStartDate} placeholderTextColor={T.inputPlaceholder} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.textPrimary, marginBottom: 6 }}>Additional Notes</Text>
                <TextInput
                  style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholderTextColor={T.inputPlaceholder}
                />
              </View>
            </View>

            {/* Summary */}
            <View style={{ backgroundColor: T.surface, borderRadius: 14, padding: 16, marginTop: 20, marginBottom: 20, gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.textPrimary }}>Offer Summary</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Role: {title}</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Package: {salary}</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Start: {startDate}</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>{notes}</Text>
            </View>

            {/* Send */}
            <Pressable onPress={handleSend} style={{ backgroundColor: T.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="paper-plane" size={18} color={T.textOnAccent} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.textOnAccent }}>Send Offer Letter</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
