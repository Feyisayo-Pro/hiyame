/**
 * ScheduleModal -- calendar date/time picker for interview scheduling.
 * When confirmed, injects a system_interview message into the chat.
 */
import { useState, useMemo, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useChatStore } from '@/lib/chatStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  candidateName: string;
  companyName: string;
  roleTitle: string;
}

// Generate next 14 days
function getDateBlocks(): { label: string; short: string; dateStr: string; isWeekend: boolean }[] {
  const days: { label: string; short: string; dateStr: string; isWeekend: boolean }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    days.push({
      label: monthNames[d.getMonth()] + ' ' + d.getDate(),
      short: dayNames[dow],
      dateStr: d.toISOString().split('T')[0],
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '1:00 PM',
  '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM',
  '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

export default function ScheduleModal({ visible, onClose, conversationId, candidateName, companyName, roleTitle }: Props) {
  const T = useTheme();
  const { addSystemMessage, updateConversationStatus } = useChatStore();
  const dates = useMemo(() => getDateBlocks(), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const selectedDateLabel = dates.find(d => d.dateStr === selectedDate)?.label ?? '';

  const handleConfirm = useCallback(() => {
    if (!selectedDate || !selectedTime) return;

    addSystemMessage(conversationId, {
      senderId: 'me',
      text: companyName + ' has invited ' + candidateName + ' for an interview for the ' + roleTitle + ' position.',
      timestamp: new Date().toISOString(),
      type: 'system_interview',
      meta: {
        interviewDate: selectedDateLabel,
        interviewTime: selectedTime,
        responded: false,
      },
    });

    updateConversationStatus(conversationId, 'interviewing');
    setSelectedDate(null);
    setSelectedTime(null);
    onClose();
  }, [selectedDate, selectedTime, conversationId, candidateName, companyName, roleTitle, selectedDateLabel, addSystemMessage, updateConversationStatus, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: T.textPrimary }}>Schedule Interview</Text>
              <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>{roleTitle} - {candidateName}</Text>
            </View>
            <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            {/* Date Selection */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 10, marginTop: 8 }}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {dates.filter(d => !d.isWeekend).map((d) => (
                  <Pressable
                    key={d.dateStr}
                    onPress={() => setSelectedDate(d.dateStr)}
                    style={{
                      width: 72, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                      backgroundColor: selectedDate === d.dateStr ? T.accent : T.surface,
                      borderWidth: 1.5,
                      borderColor: selectedDate === d.dateStr ? T.accent : T.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: selectedDate === d.dateStr ? T.textOnAccent : T.textMuted }}>{d.short}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: selectedDate === d.dateStr ? T.textOnAccent : T.textPrimary, marginTop: 2 }}>{d.label.split(' ')[1]}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: selectedDate === d.dateStr ? T.textOnAccent : T.textSecondary, marginTop: 1 }}>{d.label.split(' ')[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Time Selection */}
            {selectedDate && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 10 }}>Select Time</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {TIME_SLOTS.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setSelectedTime(t)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                        backgroundColor: selectedTime === t ? T.accent : T.surface,
                        borderWidth: 1.5,
                        borderColor: selectedTime === t ? T.accent : T.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: selectedTime === t ? T.textOnAccent : T.textPrimary }}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Meeting Details */}
            {selectedDate && selectedTime && (
              <View style={{ backgroundColor: T.accentBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="videocam" size={18} color={T.accent} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.accent }}>Interview Details</Text>
                </View>
                <Text style={{ fontSize: 13, color: T.textPrimary }}>Date: {selectedDateLabel}</Text>
                <Text style={{ fontSize: 13, color: T.textPrimary }}>Time: {selectedTime} WAT</Text>
                <Text style={{ fontSize: 13, color: T.textPrimary }}>Format: Video Call (Google Meet)</Text>
                <Text style={{ fontSize: 13, color: T.textPrimary }}>Duration: 45 minutes</Text>
              </View>
            )}

            {/* Confirm Button */}
            <Pressable
              onPress={handleConfirm}
              style={{
                backgroundColor: selectedDate && selectedTime ? T.accent : T.surface,
                borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                opacity: selectedDate && selectedTime ? 1 : 0.5,
              }}
              disabled={!selectedDate || !selectedTime}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: selectedDate && selectedTime ? T.textOnAccent : T.textMuted }}>
                Send Interview Invitation
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
