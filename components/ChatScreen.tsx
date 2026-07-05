/**
 * ChatScreen -- shared chat UI used by both candidate and company personas.
 * Shows conversation list (inbox) and individual chat views.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useChatStore, Conversation, Message, ConversationStatus } from '@/lib/chatStore';
import ScheduleModal from '@/components/ScheduleModal';
import OfferLetterModal from '@/components/OfferLetterModal';

const { width: SCREEN_W } = Dimensions.get('window');

// == Helpers ==

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd';
  return Math.floor(days / 7) + 'w';
}

function statusLabel(s: ConversationStatus): string {
  switch (s) {
    case 'matched': return 'Matched';
    case 'interviewing': return 'Interviewing';
    case 'offer_extended': return 'Offer Sent';
    case 'hired': return 'Hired';
    case 'declined': return 'Declined';
  }
}

function statusColor(s: ConversationStatus, T: ThemePalette): { color: string; bg: string } {
  switch (s) {
    case 'matched': return { color: T.accent, bg: T.accentBg };
    case 'interviewing': return { color: T.indigo, bg: T.indigoBg };
    case 'offer_extended': return { color: T.amber, bg: T.amberBg };
    case 'hired': return { color: T.emerald, bg: T.emeraldBg };
    case 'declined': return { color: T.danger, bg: T.dangerBg };
  }
}

// == Quick Reply Prompts ==

const QUICK_REPLIES_DEFAULT = [
  'Sounds great!',
  'When works for you?',
  'Can you share more details?',
];
const QUICK_REPLIES_INTERVIEW = [
  'I am available Thursday',
  'Can we reschedule?',
  'What should I prepare?',
];

// == Typing Indicator ==

function TypingIndicator({ T }: { T: ThemePalette }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: T.textMuted,
    marginHorizontal: 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 16, paddingVertical: 8 }}>
      <View style={{ backgroundColor: T.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

// == Pipeline Banner ==

function PipelineBanner({ status, T }: { status: ConversationStatus; T: ThemePalette }) {
  const steps: { key: ConversationStatus; label: string }[] = [
    { key: 'matched', label: 'Matched' },
    { key: 'interviewing', label: 'Interview' },
    { key: 'offer_extended', label: 'Offer' },
  ];
  const order: ConversationStatus[] = ['matched', 'interviewing', 'offer_extended', 'hired'];
  const currentIdx = order.indexOf(status);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border }}>
      {steps.map((step, i) => {
        const stepIdx = order.indexOf(step.key);
        const active = stepIdx <= currentIdx;
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: active ? T.accent : T.surface, alignItems: 'center', justifyContent: 'center' }}>
              {active ? (
                <Ionicons name="checkmark" size={14} color={T.textOnAccent} />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted }}>{i + 1}</Text>
              )}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? T.accent : T.textMuted, marginLeft: 4 }}>{step.label}</Text>
            {i < steps.length - 1 && (
              <View style={{ width: 24, height: 2, backgroundColor: stepIdx < currentIdx ? T.accent : T.border, marginHorizontal: 6 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// == System Message Card (Interview / Offer) ==

function SystemMessageCard({ message, T, onRespond }: { message: Message; T: ThemePalette; onRespond?: (msgId: string, accepted: boolean) => void }) {
  const isInterview = message.type === 'system_interview';
  const responded = message.meta?.responded;
  const accepted = message.meta?.accepted;

  return (
    <View style={{ marginHorizontal: 16, marginVertical: 8, backgroundColor: T.accentBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.accent + '30' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name={isInterview ? 'calendar' : 'document-text'} size={18} color={T.accent} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: T.accent }}>
          {isInterview ? 'Interview Invitation' : 'Offer Letter'}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: T.textPrimary, lineHeight: 20, marginBottom: 4 }}>{message.text}</Text>
      {message.meta?.interviewDate && (
        <Text style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
          Date: {message.meta.interviewDate} at {message.meta.interviewTime}
        </Text>
      )}
      {message.meta?.offerSalary && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 12, color: T.textSecondary }}>Role: {message.meta.offerTitle}</Text>
          <Text style={{ fontSize: 12, color: T.textSecondary }}>Compensation: {message.meta.offerSalary}</Text>
          <Text style={{ fontSize: 12, color: T.textSecondary }}>Start Date: {message.meta.offerStartDate}</Text>
        </View>
      )}
      {!responded && onRespond ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => onRespond(message.id, true)}
            style={{ flex: 1, backgroundColor: T.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.textOnAccent }}>
              {isInterview ? 'Accept' : 'Accept Offer'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onRespond(message.id, false)}
            style={{ flex: 1, backgroundColor: T.surface, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: T.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.textSecondary }}>
              {isInterview ? 'Reschedule' : 'Decline'}
            </Text>
          </Pressable>
        </View>
      ) : responded ? (
        <View style={{ marginTop: 12, backgroundColor: accepted ? T.emeraldBg : T.dangerBg, borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: accepted ? T.emerald : T.danger }}>
            {accepted ? (isInterview ? 'Accepted' : 'Offer Accepted') : (isInterview ? 'Reschedule Requested' : 'Declined')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// == Conversation Row ==

function ConversationRow({
  conversation,
  onPress,
  T,
}: {
  conversation: Conversation;
  onPress: () => void;
  T: ThemePalette;
}) {
  const sc = statusColor(conversation.status, T);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: pressed ? T.surfaceHover : 'transparent',
          borderBottomWidth: 1, borderBottomColor: T.border,
        },
      ]}
    >
      {/* Avatar */}
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: T.accent }}>{conversation.participantInitials}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: conversation.unreadCount > 0 ? '800' : '600', color: T.textPrimary }} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          {conversation.participantVerified && (
            <Ionicons name="checkmark-circle" size={14} color={T.emerald} />
          )}
        </View>
        <Text style={{ fontSize: 13, color: conversation.unreadCount > 0 ? T.textPrimary : T.textSecondary, fontWeight: conversation.unreadCount > 0 ? '600' : '400' }} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <View style={{ backgroundColor: sc.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: sc.color, letterSpacing: 0.3 }}>{statusLabel(conversation.status).toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 11, color: T.textMuted }}>{conversation.roleTitle}</Text>
        </View>
      </View>

      {/* Right side */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 11, color: T.textMuted }}>{timeAgo(conversation.lastMessageAt)}</Text>
        {conversation.unreadCount > 0 && (
          <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: T.textOnAccent }}>{conversation.unreadCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// == Chat View ==

function ChatView({
  conversation,
  onBack,
  T,
}: {
  conversation: Conversation;
  onBack: () => void;
  T: ThemePalette;
}) {
  const { getMessages, sendMessage, markRead, isTyping, respondToSystemMessage } = useChatStore();
  const [showSchedule, setShowSchedule] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const messages = getMessages(conversation.id);
  const typing = isTyping(conversation.id);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const quickReplies = conversation.status === 'interviewing' ? QUICK_REPLIES_INTERVIEW : QUICK_REPLIES_DEFAULT;

  useEffect(() => {
    markRead(conversation.id);
  }, [conversation.id, markRead, messages.length]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, typing]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    sendMessage(conversation.id, trimmed);
    setInputText('');
  }, [inputText, conversation.id, sendMessage]);

  const handleQuickReply = useCallback((text: string) => {
    sendMessage(conversation.id, text);
  }, [conversation.id, sendMessage]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border }}>
          <Pressable onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: T.accent }}>{conversation.participantInitials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.textPrimary }}>{conversation.participantName}</Text>
              {conversation.participantVerified && <Ionicons name="checkmark-circle" size={14} color={T.emerald} />}
            </View>
            <Text style={{ fontSize: 12, color: T.textSecondary }}>{conversation.roleTitle}</Text>
          </View>
          {/* Action buttons for company persona */}
          {conversation.participantType === 'candidate' && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={() => setShowSchedule(true)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={16} color={T.accent} />
              </Pressable>
              <Pressable onPress={() => setShowOffer(true)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-text-outline" size={16} color={T.emerald} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Modals */}
        <ScheduleModal
          visible={showSchedule}
          onClose={() => setShowSchedule(false)}
          conversationId={conversation.id}
          candidateName={conversation.participantName}
          companyName={conversation.companyName}
          roleTitle={conversation.roleTitle}
        />
        <OfferLetterModal
          visible={showOffer}
          onClose={() => setShowOffer(false)}
          conversationId={conversation.id}
          candidateName={conversation.participantName}
          companyName={conversation.companyName}
          roleTitle={conversation.roleTitle}
        />

        {/* Pipeline Banner */}
        <PipelineBanner status={conversation.status} T={T} />

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            if (msg.type !== 'text') {
              return <SystemMessageCard key={msg.id} message={msg} T={T} onRespond={respondToSystemMessage} />;
            }
            const isMe = msg.senderId === 'me';
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  marginHorizontal: 16,
                  marginVertical: 3,
                }}
              >
                <View
                  style={{
                    backgroundColor: isMe ? T.accent : T.surface,
                    borderRadius: 18,
                    borderBottomRightRadius: isMe ? 4 : 18,
                    borderBottomLeftRadius: isMe ? 18 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, color: isMe ? T.textOnAccent : T.textPrimary, lineHeight: 20 }}>{msg.text}</Text>
                </View>
                <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 2, alignSelf: isMe ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
                  {timeAgo(msg.timestamp)}
                </Text>
              </View>
            );
          })}

          {typing && <TypingIndicator T={T} />}
        </ScrollView>

        {/* Quick Replies */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 40, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.card }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, gap: 8 }}
        >
          {quickReplies.map((qr) => (
            <Pressable
              key={qr}
              onPress={() => handleQuickReply(qr)}
              style={{ backgroundColor: T.accentBg, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.accent + '30' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: T.accent }}>{qr}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border }}>
          <Pressable style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="attach" size={20} color={T.textMuted} />
          </Pressable>
          <TextInput
            style={{
              flex: 1,
              minHeight: 36,
              maxHeight: 100,
              backgroundColor: T.inputBg,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 8,
              fontSize: 14,
              color: T.inputText,
            }}
            placeholder="Type a message..."
            placeholderTextColor={T.inputPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: inputText.trim() ? T.accent : T.surface,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="send" size={16} color={inputText.trim() ? T.textOnAccent : T.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// == Main ChatScreen ==

export default function ChatScreen() {
  const T = useTheme();
  const { conversations } = useChatStore();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations]
  );

  const activeConversation = activeConvId ? conversations.find(c => c.id === activeConvId) : null;

  if (activeConversation) {
    return <ChatView conversation={activeConversation} onBack={() => setActiveConvId(null)} T={T} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      {/* Inbox Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>Messages</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chatbubbles" size={18} color={T.accent} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.accent }}>{conversations.length}</Text>
        </View>
      </View>

      {/* Conversation List */}
      <FlatList
        data={sortedConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => setActiveConvId(item.id)} T={T} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={T.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary, marginTop: 12 }}>No conversations yet</Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
              Start swiping to match with talent or companies and begin chatting.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
