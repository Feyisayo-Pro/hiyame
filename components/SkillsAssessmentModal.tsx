import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

const TIME_LIMIT_SECONDS = 15 * 60;

interface Question {
  id: string;
  text: string;
  options: string[];
}

type Phase = 'loading' | 'intro' | 'quiz' | 'submitting' | 'result' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPassed: (score: number, total: number) => void;
}

export default function SkillsAssessmentModal({ visible, onClose, onPassed }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const authHeader = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('You need to be signed in.');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadQuestions = useCallback(async () => {
    setPhase('loading');
    setErrorMessage('');
    try {
      const headers = await authHeader();
      const res = await fetch('/api/skills-assessment', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'questions' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not load the assessment.');
      setQuestions(body.questions ?? []);
      setPhase('intro');
    } catch (e: any) {
      setErrorMessage(e?.message || 'Could not load the assessment.');
      setPhase('error');
    }
  }, [authHeader]);

  useEffect(() => {
    if (visible) {
      loadQuestions();
    } else {
      clearTimer();
      setIndex(0);
      setAnswers({});
      setSecondsLeft(TIME_LIMIT_SECONDS);
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearTimer();
    setPhase('submitting');
    try {
      const headers = await authHeader();
      const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
      const res = await fetch('/api/skills-assessment', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', answers: payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not submit the assessment.');
      setResult({ score: body.score, total: body.total, passed: body.passed });
      setPhase('result');
      if (body.passed) {
        notify('Assessment passed', `You scored ${body.score}/${body.total}.`);
        onPassed(body.score, body.total);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Could not submit the assessment.');
      setPhase('error');
    } finally {
      submittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, authHeader, onPassed]);

  const startQuiz = () => {
    setSecondsLeft(TIME_LIMIT_SECONDS);
    setIndex(0);
    setAnswers({});
    setPhase('quiz');
    timerRef.current = setInterval(() => {
      setSecondsLeft((n) => {
        if (n <= 1) {
          clearTimer();
          submit();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const retake = () => {
    setResult(null);
    startQuiz();
  };

  const close = () => {
    if (phase === 'submitting') return;
    clearTimer();
    onClose();
  };

  const current = questions[index];
  const answered = current ? answers[current.id] !== undefined : false;
  const isLast = index === questions.length - 1;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeLow = secondsLeft <= 60;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Skills Assessment</Text>
            <Pressable onPress={close} hitSlop={8} disabled={phase === 'submitting'}>
              <AppIcon name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          {phase === 'loading' && (
            <View style={s.centerWrap}>
              <ActivityIndicator color={T.accent} />
            </View>
          )}

          {phase === 'error' && (
            <View style={s.centerWrap}>
              <AppIcon name="warning-outline" size={32} color={T.amber} />
              <Text style={s.body}>{errorMessage}</Text>
              <Pressable style={s.actionBtn} onPress={loadQuestions}>
                <Text style={s.actionBtnText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {phase === 'intro' && (
            <View style={s.centerWrap}>
              <View style={s.introIconWrap}>
                <AppIcon name="shield-checkmark-outline" size={28} color={T.accent} />
              </View>
              <Text style={s.body}>
                {questions.length} questions on real workplace scenarios — prioritization, communication,
                problem-solving, professionalism. {Math.round(TIME_LIMIT_SECONDS / 60)} minutes, 70% to pass.
              </Text>
              <Pressable style={s.actionBtn} onPress={startQuiz}>
                <Text style={s.actionBtnText}>Start</Text>
              </Pressable>
            </View>
          )}

          {phase === 'quiz' && current && (
            <>
              <View style={s.progressRow}>
                <Text style={s.progressText}>Question {index + 1} of {questions.length}</Text>
                <Text style={[s.timerText, timeLow && s.timerTextLow]}>{minutes}:{secs.toString().padStart(2, '0')}</Text>
              </View>

              <ScrollView style={s.quizScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.questionText}>{current.text}</Text>
                {current.options.map((opt, i) => {
                  const selected = answers[current.id] === i;
                  return (
                    <Pressable
                      key={i}
                      style={[s.optionRow, selected && s.optionRowSelected]}
                      onPress={() => setAnswers((prev) => ({ ...prev, [current.id]: i }))}
                    >
                      <View style={[s.optionDot, selected && s.optionDotSelected]}>
                        {selected && <AppIcon name="checkmark" size={12} color={T.textOnAccent} />}
                      </View>
                      <Text style={[s.optionText, selected && s.optionTextSelected]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={s.controlsRow}>
                <Pressable
                  style={[s.secondaryBtn, index === 0 && s.disabledBtn]}
                  onPress={() => setIndex((n) => Math.max(0, n - 1))}
                  disabled={index === 0}
                >
                  <Text style={s.secondaryBtnText}>Back</Text>
                </Pressable>
                {isLast ? (
                  <Pressable style={[s.actionBtn, !answered && s.disabledBtn]} onPress={submit} disabled={!answered}>
                    <Text style={s.actionBtnText}>Submit</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[s.actionBtn, !answered && s.disabledBtn]} onPress={() => setIndex((n) => n + 1)} disabled={!answered}>
                    <Text style={s.actionBtnText}>Next</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {phase === 'submitting' && (
            <View style={s.centerWrap}>
              <ActivityIndicator color={T.accent} />
              <Text style={s.body}>Scoring your answers…</Text>
            </View>
          )}

          {phase === 'result' && result && (
            <View style={s.centerWrap}>
              <View style={[s.introIconWrap, result.passed ? s.introIconWrapPass : s.introIconWrapFail]}>
                <AppIcon
                  name={result.passed ? 'checkmark-circle' : 'close-circle-outline'}
                  size={28}
                  color={result.passed ? T.emerald : T.danger}
                />
              </View>
              <Text style={s.resultScore}>{result.score}/{result.total}</Text>
              <Text style={s.body}>
                {result.passed
                  ? "You've passed the skills assessment."
                  : `You need ${Math.ceil(result.total * 0.7)}/${result.total} to pass. You can retake it now.`}
              </Text>
              <Pressable style={s.actionBtn} onPress={result.passed ? close : retake}>
                <Text style={s.actionBtnText}>{result.passed ? 'Done' : 'Retake'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: T.card, borderRadius: 20, padding: 20, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  centerWrap: { alignItems: 'center', gap: 14, paddingVertical: 16 },
  body: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  introIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  introIconWrapPass: { backgroundColor: T.emeraldBg },
  introIconWrapFail: { backgroundColor: T.dangerBg },
  resultScore: { fontSize: 30, fontWeight: '800', color: T.textPrimary },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 12, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  timerText: { fontSize: 14, fontWeight: '800', color: T.textPrimary, fontVariant: ['tabular-nums'] },
  timerTextLow: { color: T.danger },

  quizScroll: { maxHeight: 340 },
  questionText: { fontSize: 15, fontWeight: '700', color: T.textPrimary, lineHeight: 21, marginBottom: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, marginBottom: 8 },
  optionRowSelected: { borderColor: T.accent, backgroundColor: T.accentBg },
  optionDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  optionDotSelected: { backgroundColor: T.accent, borderColor: T.accent },
  optionText: { flex: 1, fontSize: 13.5, color: T.textSecondary, lineHeight: 19 },
  optionTextSelected: { color: T.textPrimary, fontWeight: '600' },

  controlsRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accentSolid, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
  actionBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 14 },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  secondaryBtnText: { color: T.textSecondary, fontWeight: '700', fontSize: 14 },
  disabledBtn: { opacity: 0.45 },
});
