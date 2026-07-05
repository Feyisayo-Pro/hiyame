/**
 * hiyame Chat Store
 * Manages conversations, messages, typing states, and mock auto-replies.
 * Dual-persona: works for both candidate and company views.
 */
import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import React from 'react';

//  Types 

export type ConversationStatus = 'matched' | 'interviewing' | 'offer_extended' | 'hired' | 'declined';

export interface Conversation {
  id: string;
  /** The OTHER participant (from the viewer's perspective) */
  participantName: string;
  participantAvatar: string | null;
  participantInitials: string;
  participantTitle: string;
  participantVerified: boolean;
  /** 'candidate' if the other party is a candidate, 'company' if it's a company */
  participantType: 'candidate' | 'company';
  lastMessage: string;
  lastMessageAt: string;       // ISO timestamp
  unreadCount: number;
  status: ConversationStatus;
  /** The company name (shown on both sides) */
  companyName: string;
  /** Role being discussed */
  roleTitle: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: 'me' | 'them';
  text: string;
  timestamp: string;           // ISO timestamp
  isRead: boolean;
  /** System messages like interview invites or offer letters */
  type: 'text' | 'system_interview' | 'system_offer';
  /** Extra structured data for system messages */
  meta?: {
    interviewDate?: string;
    interviewTime?: string;
    offerSalary?: string;
    offerTitle?: string;
    offerStartDate?: string;
    responded?: boolean;
    accepted?: boolean;
  };
}

export interface ChatStoreValue {
  conversations: Conversation[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, text: string) => void;
  markRead: (conversationId: string) => void;
  isTyping: (conversationId: string) => boolean;
  updateConversationStatus: (conversationId: string, status: ConversationStatus) => void;
  addSystemMessage: (conversationId: string, msg: Omit<Message, 'id' | 'conversationId' | 'isRead'>) => void;
  respondToSystemMessage: (messageId: string, accepted: boolean) => void;
  totalUnread: number;
}

//  Auto-reply pools 

const COMPANY_REPLIES = [
  "Thank you for your interest! We've reviewed your profile and are impressed.",
  "Could you share your availability for a quick intro call this week?",
  "We would love to learn more about your experience with our tech stack.",
  "Great to connect! Let me loop in our hiring manager.",
  "Your portfolio looks excellent. Are you open to a hybrid arrangement?",
  "We're moving fast on this role -- can we schedule something for tomorrow?",
];

const CANDIDATE_REPLIES = [
  "Thanks for reaching out! I am very interested in this opportunity.",
  "I am available for a call anytime this week. What works best?",
  "That sounds great! I would love to learn more about the team.",
  "Absolutely -- I have been looking for exactly this kind of role.",
  "I can start as early as next month. Looking forward to discussing details.",
  "Thanks! Could you share more about the day-to-day responsibilities?",
];

//  Helper: relative time ago 
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}
function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}

//  Mock Data 

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participantName: 'Vertex Global',
    participantAvatar: null,
    participantInitials: 'VG',
    participantTitle: 'Fintech - Series B',
    participantVerified: true,
    participantType: 'company',
    lastMessage: 'We would love to schedule an interview this week.',
    lastMessageAt: hoursAgo(1),
    unreadCount: 2,
    status: 'interviewing',
    companyName: 'Vertex Global',
    roleTitle: 'Senior Backend Engineer',
  },
  {
    id: 'conv-2',
    participantName: 'Moussa Keita',
    participantAvatar: 'https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=100&h=100&fit=crop&crop=face',
    participantInitials: 'MK',
    participantTitle: 'Full-Stack Developer',
    participantVerified: true,
    participantType: 'candidate',
    lastMessage: 'Thanks! I can start as early as next month.',
    lastMessageAt: hoursAgo(3),
    unreadCount: 0,
    status: 'offer_extended',
    companyName: 'Vertex Global',
    roleTitle: 'Full-Stack Developer',
  },
  {
    id: 'conv-3',
    participantName: 'NovaTech Solutions',
    participantAvatar: null,
    participantInitials: 'NS',
    participantTitle: 'AI/ML - Startup',
    participantVerified: true,
    participantType: 'company',
    lastMessage: 'Hi Amara! We matched on your profile and would love to chat.',
    lastMessageAt: hoursAgo(8),
    unreadCount: 1,
    status: 'matched',
    companyName: 'NovaTech Solutions',
    roleTitle: 'Data Scientist',
  },
  {
    id: 'conv-4',
    participantName: 'Amara Osei',
    participantAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face',
    participantInitials: 'AO',
    participantTitle: 'Senior Backend Engineer',
    participantVerified: true,
    participantType: 'candidate',
    lastMessage: 'Looking forward to the interview!',
    lastMessageAt: hoursAgo(5),
    unreadCount: 1,
    status: 'interviewing',
    companyName: 'Vertex Global',
    roleTitle: 'Senior Backend Engineer',
  },
  {
    id: 'conv-5',
    participantName: 'Sarah Jenkins',
    participantAvatar: 'https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?w=100&h=100&fit=crop&crop=face',
    participantInitials: 'SJ',
    participantTitle: 'UX Researcher',
    participantVerified: false,
    participantType: 'candidate',
    lastMessage: 'Could you share more about the design team?',
    lastMessageAt: hoursAgo(12),
    unreadCount: 0,
    status: 'matched',
    companyName: 'Vertex Global',
    roleTitle: 'UX Researcher',
  },
  {
    id: 'conv-6',
    participantName: 'Kumasi Digital',
    participantAvatar: null,
    participantInitials: 'KD',
    participantTitle: 'E-commerce - Growth',
    participantVerified: true,
    participantType: 'company',
    lastMessage: 'Great profile! We have an exciting opportunity.',
    lastMessageAt: hoursAgo(24),
    unreadCount: 0,
    status: 'matched',
    companyName: 'Kumasi Digital',
    roleTitle: 'Product Manager',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: 'm1-1', conversationId: 'conv-1', senderId: 'them', text: 'Hi! We matched on your Senior Backend Engineer profile. Your experience with Node.js and AWS is exactly what we need.', timestamp: hoursAgo(48), isRead: true, type: 'text' },
    { id: 'm1-2', conversationId: 'conv-1', senderId: 'me', text: 'Thanks for reaching out! Vertex Global sounds like a great fit. I have been following your fintech products.', timestamp: hoursAgo(47), isRead: true, type: 'text' },
    { id: 'm1-3', conversationId: 'conv-1', senderId: 'them', text: 'That is great to hear! Our engineering team is scaling fast. Would you be open to a technical discussion?', timestamp: hoursAgo(24), isRead: true, type: 'text' },
    { id: 'm1-4', conversationId: 'conv-1', senderId: 'me', text: 'Absolutely! I am free most afternoons this week.', timestamp: hoursAgo(23), isRead: true, type: 'text' },
    { id: 'm1-5', conversationId: 'conv-1', senderId: 'them', text: 'We would love to schedule an interview this week. How does Thursday at 2pm WAT work for you?', timestamp: hoursAgo(1), isRead: false, type: 'text' },
    { id: 'm1-6', conversationId: 'conv-1', senderId: 'them', text: 'We can do it over Google Meet -- our team lead will join as well.', timestamp: minsAgo(55), isRead: false, type: 'text' },
  ],
  'conv-2': [
    { id: 'm2-1', conversationId: 'conv-2', senderId: 'me', text: 'Hi Moussa! We loved your portfolio and technical assessment results.', timestamp: hoursAgo(72), isRead: true, type: 'text' },
    { id: 'm2-2', conversationId: 'conv-2', senderId: 'them', text: 'Thank you! I really enjoyed the challenge. The architecture questions were interesting.', timestamp: hoursAgo(71), isRead: true, type: 'text' },
    { id: 'm2-3', conversationId: 'conv-2', senderId: 'me', text: 'We would like to extend a formal offer for the Full-Stack Developer role.', timestamp: hoursAgo(24), isRead: true, type: 'text' },
    { id: 'm2-4', conversationId: 'conv-2', senderId: 'them', text: 'That is amazing news! I am very excited about this opportunity.', timestamp: hoursAgo(12), isRead: true, type: 'text' },
    { id: 'm2-5', conversationId: 'conv-2', senderId: 'them', text: 'Thanks! I can start as early as next month. Looking forward to joining the team.', timestamp: hoursAgo(3), isRead: true, type: 'text' },
  ],
  'conv-3': [
    { id: 'm3-1', conversationId: 'conv-3', senderId: 'them', text: 'Hi Amara! We matched on your profile and would love to chat about our Data Scientist opening.', timestamp: hoursAgo(8), isRead: false, type: 'text' },
  ],
  'conv-4': [
    { id: 'm4-1', conversationId: 'conv-4', senderId: 'me', text: 'Hi Amara! We matched on your profile -- your backend expertise is impressive.', timestamp: hoursAgo(48), isRead: true, type: 'text' },
    { id: 'm4-2', conversationId: 'conv-4', senderId: 'them', text: 'Thank you! I am really interested in the Senior Backend Engineer role at Vertex Global.', timestamp: hoursAgo(46), isRead: true, type: 'text' },
    { id: 'm4-3', conversationId: 'conv-4', senderId: 'me', text: 'Great! Let us set up a technical interview. Are you available Thursday?', timestamp: hoursAgo(24), isRead: true, type: 'text' },
    { id: 'm4-4', conversationId: 'conv-4', senderId: 'them', text: 'Looking forward to the interview! Thursday works perfectly.', timestamp: hoursAgo(5), isRead: false, type: 'text' },
  ],
  'conv-5': [
    { id: 'm5-1', conversationId: 'conv-5', senderId: 'me', text: 'Welcome, Sarah! We matched on the UX Researcher role.', timestamp: hoursAgo(24), isRead: true, type: 'text' },
    { id: 'm5-2', conversationId: 'conv-5', senderId: 'them', text: 'Thanks! Could you share more about the design team and research methodologies you use?', timestamp: hoursAgo(12), isRead: true, type: 'text' },
  ],
  'conv-6': [
    { id: 'm6-1', conversationId: 'conv-6', senderId: 'them', text: 'Great profile! We have an exciting Product Manager opportunity in Accra. Interested?', timestamp: hoursAgo(24), isRead: true, type: 'text' },
  ],
};

//  Context 

const ChatCtx = createContext<ChatStoreValue>({
  conversations: [],
  getMessages: () => [],
  sendMessage: () => {},
  markRead: () => {},
  isTyping: () => false,
  updateConversationStatus: () => {},
  addSystemMessage: () => {},
  respondToSystemMessage: () => {},
  totalUnread: 0,
});

let _msgCounter = 100;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  const getMessages = useCallback((conversationId: string): Message[] => {
    return messages[conversationId] ?? [];
  }, [messages]);

  const markRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    setMessages(prev => {
      const msgs = prev[conversationId];
      if (!msgs) return prev;
      return {
        ...prev,
        [conversationId]: msgs.map(m => ({ ...m, isRead: true })),
      };
    });
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const msgId = `msg-${++_msgCounter}`;
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: msgId,
      conversationId,
      senderId: 'me',
      text,
      timestamp: now,
      isRead: true,
      type: 'text',
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), newMsg],
    }));
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, lastMessage: text, lastMessageAt: now } : c
    ));

    // Simulate typing indicator + auto-reply after 3 seconds
    setTypingMap(prev => ({ ...prev, [conversationId]: true }));
    setTimeout(() => {
      setTypingMap(prev => ({ ...prev, [conversationId]: false }));

      // Find conversation to determine reply pool
      const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
      const pool = conv?.participantType === 'candidate' ? CANDIDATE_REPLIES : COMPANY_REPLIES;
      const replyText = pool[Math.floor(Math.random() * pool.length)];
      const replyId = `msg-${++_msgCounter}`;
      const replyMsg: Message = {
        id: replyId,
        conversationId,
        senderId: 'them',
        text: replyText,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'text',
      };

      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), replyMsg],
      }));
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: replyText, lastMessageAt: replyMsg.timestamp, unreadCount: c.unreadCount + 1 }
          : c
      ));
    }, 3000);
  }, []);

  const isTypingFn = useCallback((conversationId: string): boolean => {
    return typingMap[conversationId] ?? false;
  }, [typingMap]);

  const updateConversationStatus = useCallback((conversationId: string, status: ConversationStatus) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, status } : c
    ));
  }, []);

  const addSystemMessage = useCallback((conversationId: string, msg: Omit<Message, 'id' | 'conversationId' | 'isRead'>) => {
    const sysMsg: Message = {
      ...msg,
      id: `msg-${++_msgCounter}`,
      conversationId,
      isRead: false,
    };
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), sysMsg],
    }));
    const snippet = msg.type === 'system_interview' ? '[Calendar] Interview invitation sent' : '[Doc] Offer letter sent';
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, lastMessage: snippet, lastMessageAt: sysMsg.timestamp } : c
    ));
  }, []);

  const respondToSystemMessage = useCallback((messageId: string, accepted: boolean) => {
    setMessages(prev => {
      const updated = { ...prev };
      for (const convId in updated) {
        updated[convId] = updated[convId].map(m =>
          m.id === messageId ? { ...m, meta: { ...m.meta, responded: true, accepted } } : m
        );
      }
      return updated;
    });
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const value: ChatStoreValue = {
    conversations,
    getMessages,
    sendMessage,
    markRead,
    isTyping: isTypingFn,
    updateConversationStatus,
    addSystemMessage,
    respondToSystemMessage,
    totalUnread,
  };

  return React.createElement(ChatCtx.Provider, { value }, children);
}

export function useChatStore(): ChatStoreValue {
  return useContext(ChatCtx);
}
