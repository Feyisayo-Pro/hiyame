import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { notify } from '@/lib/notify';
import { uploadCandidateVideo } from '@/lib/uploadCandidateVideo';

const MAX_SECONDS = 60;

// Live preview + playback need a real <video> element, which React Native
// has no component for — same reasoning lib/uploadCandidatePhoto.ts already
// established for canvas/Image on this exact screen's sibling feature: build
// the DOM node imperatively rather than fight RN's JSX types for an
// intrinsic it doesn't declare. A React Native Web `View`'s ref forwards to
// its underlying <div>, which is all `appendChild` needs.
type Status = 'idle' | 'starting' | 'ready' | 'recording' | 'preview' | 'uploading' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted: (url: string) => void;
}

export default function VideoIntroRecorderModal({ visible, onClose, onSubmitted }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(MAX_SECONDS);

  const previewRef = useRef<View>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const teardownVideoEl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
      videoElRef.current.remove();
      videoElRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    teardownVideoEl();
    recorderRef.current = null;
    chunksRef.current = [];
    blobRef.current = null;
    setSecondsLeft(MAX_SECONDS);
    setErrorMessage('');
    setStatus('idle');
  }, []);

  const close = () => {
    if (status === 'uploading') return;
    reset();
    onClose();
  };

  const mountVideoEl = (): HTMLVideoElement | null => {
    // React Native Web forwards a View's ref to its host <div> — not
    // reflected in RN's own types, hence the cast. Container div is fully
    // owned by this component (styled empty, nothing else ever renders
    // into it), so directly managing its one child imperatively is safe.
    const container = previewRef.current as unknown as HTMLDivElement | null;
    if (!container) return null;
    const el = document.createElement('video');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'cover';
    el.style.borderRadius = '14px';
    el.playsInline = true;
    container.innerHTML = '';
    container.appendChild(el);
    videoElRef.current = el;
    return el;
  };

  const startCamera = useCallback(async () => {
    setStatus('starting');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const el = mountVideoEl();
      if (el) {
        el.srcObject = stream;
        el.muted = true;
        el.autoplay = true;
      }
      setStatus('ready');
    } catch {
      setErrorMessage('Camera and microphone access is required to record an introduction. Check your browser permissions and try again.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (visible && status === 'idle') startCamera();
    if (!visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      blobRef.current = blob;
      stopStream();
      const el = videoElRef.current;
      if (el) {
        el.srcObject = null;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        el.src = url;
        el.muted = false;
        el.controls = true;
        el.autoplay = false;
      }
      setStatus('preview');
    };
    recorderRef.current = recorder;
    recorder.start();
    setSecondsLeft(MAX_SECONDS);
    setStatus('recording');
    timerRef.current = setInterval(() => {
      setSecondsLeft((n) => {
        if (n <= 1) {
          recorder.stop();
          clearTimer();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    clearTimer();
    recorderRef.current?.stop();
  };

  const reRecord = () => {
    clearTimer();
    teardownVideoEl();
    blobRef.current = null;
    setSecondsLeft(MAX_SECONDS);
    setStatus('idle');
    startCamera();
  };

  const submit = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setStatus('uploading');
    try {
      const url = await uploadCandidateVideo(blob);
      notify('Video submitted', 'Your introduction is saved.');
      onSubmitted(url);
      reset();
      onClose();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Could not save your video. Please try again.');
      setStatus('preview');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Video Introduction</Text>
            <Pressable onPress={close} hitSlop={8} disabled={status === 'uploading'}>
              <AppIcon name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          {status === 'error' ? (
            <View style={s.centerWrap}>
              <AppIcon name="warning-outline" size={32} color={T.amber} />
              <Text style={s.body}>{errorMessage}</Text>
              <Pressable style={s.actionBtn} onPress={startCamera}>
                <Text style={s.actionBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View ref={previewRef} style={s.previewBox}>
                {status === 'starting' && (
                  <View style={s.previewOverlay}>
                    <ActivityIndicator color={T.accent} />
                  </View>
                )}
              </View>

              {status === 'recording' && (
                <View style={s.recordingRow}>
                  <View style={s.recDot} />
                  <Text style={s.recordingText}>{secondsLeft}s remaining</Text>
                </View>
              )}

              {errorMessage && status === 'preview' ? <Text style={s.inlineError}>{errorMessage}</Text> : null}

              <Text style={s.hint}>
                {status === 'ready'
                  ? `Up to ${MAX_SECONDS} seconds — introduce yourself, your expertise, and what you bring to the table.`
                  : status === 'preview'
                  ? 'Review your clip below, then submit or re-record.'
                  : ''}
              </Text>

              <View style={s.controlsRow}>
                {status === 'ready' && (
                  <Pressable style={s.actionBtn} onPress={startRecording}>
                    <AppIcon name="videocam-outline" size={18} color={T.textOnAccent} />
                    <Text style={s.actionBtnText}>Start Recording</Text>
                  </Pressable>
                )}
                {status === 'recording' && (
                  <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={stopRecording}>
                    <AppIcon name="stop-circle-outline" size={18} color={T.textOnAccent} />
                    <Text style={s.actionBtnText}>Stop</Text>
                  </Pressable>
                )}
                {status === 'preview' && (
                  <>
                    <Pressable style={s.secondaryBtn} onPress={reRecord}>
                      <Text style={s.secondaryBtnText}>Re-record</Text>
                    </Pressable>
                    <Pressable style={s.actionBtn} onPress={submit}>
                      <Text style={s.actionBtnText}>Submit</Text>
                    </Pressable>
                  </>
                )}
                {status === 'uploading' && (
                  <View style={s.actionBtn}>
                    <ActivityIndicator color={T.textOnAccent} />
                    <Text style={s.actionBtnText}>Saving…</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: T.card, borderRadius: 20, padding: 20, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  centerWrap: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  body: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  previewBox: { width: '100%', aspectRatio: 4 / 3, backgroundColor: T.surface, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.danger },
  recordingText: { fontSize: 13, fontWeight: '700', color: T.danger },
  inlineError: { fontSize: 12, color: T.danger, textAlign: 'center' },
  hint: { fontSize: 12, color: T.textMuted, textAlign: 'center', lineHeight: 17, minHeight: 17 },
  controlsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accentSolid, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  actionBtnDanger: { backgroundColor: T.danger },
  actionBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 14 },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  secondaryBtnText: { color: T.textSecondary, fontWeight: '700', fontSize: 14 },
});
