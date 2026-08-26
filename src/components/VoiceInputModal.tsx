import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Send, Volume2, AlertCircle, X, Check, Zap, Plus } from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMode: 'canvas' | 'chat';
  onApplyText: (text: string, autoSubmit?: boolean) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const SAMPLE_VOICE_PROMPTS = {
  canvas: [
    'I am testing the voice mode and reflecting on my hackathon progress.',
    'Today was intense, but I made solid progress on system architecture and key priorities.',
    'Feeling grateful for our team collaboration and looking forward to solving the next technical challenges.',
    'I realized that slowing down to design clearly saved us hours of debugging later on.',
  ],
  chat: [
    'What is the most high-impact next step I should focus on?',
    'How can I better manage my time and avoid burnout during high-stress sprints?',
    'What underlying emotional pattern or lesson do you see in this reflection?',
    'Can you help me break this into smaller 15-minute actionable milestones?',
  ],
};

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  targetMode,
  onApplyText,
  onShowToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setInterimText('');
      setPermissionError(null);
      // Auto-start recording when opening modal
      startSpeech();
    } else {
      stopSpeech();
    }

    return () => {
      stopSpeech();
    };
  }, [isOpen, targetMode]);

  const startAudioAnalyzer = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const updateVolume = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      }
    } catch (err: any) {
      console.warn('Audio stream error (likely iframe restriction):', err);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setPermissionError(null);

    if (!SpeechRecognition) {
      setPermissionError('Speech Recognition is not supported natively in this browser. You can select quick speech starters or type below.');
      return;
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    let hasReceivedResult = false;

    // 3.0s Timeout guard for iframe / audio block
    speechTimeoutRef.current = setTimeout(() => {
      if (!hasReceivedResult) {
        setPermissionError(
          'Microphone listening timed out (3s) or is restricted by iframe sandbox policy. You can choose any Quick Speech Starter below or type your prompt.'
        );
      }
    }, 3000);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        startAudioAnalyzer();
      };

      recognition.onresult = (event: any) => {
        hasReceivedResult = true;
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        let currentInterim = '';
        let finalTranscripts = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscripts += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimText(currentInterim);

        if (finalTranscripts) {
          setInputText((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalTranscripts;
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.warn('Modal speech error:', event.error);
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          setPermissionError(
            'Microphone access was blocked by browser / iframe security policy. Please select any Quick Speech Starter below or type freely.'
          );
        } else {
          setPermissionError(`Notice: ${event.error}. You can use quick starters or type.`);
        }
        setIsRecording(false);
        stopAudioAnalyzer();
      };

      recognition.onend = () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        setIsRecording(false);
        setInterimText('');
        stopAudioAnalyzer();
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Recognition start failed:', err);
      setPermissionError('Could not initialize microphone stream. You can select quick starters or type.');
      setIsRecording(false);
    }
  };

  const stopSpeech = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
    stopAudioAnalyzer();
  };

  const handleApply = (autoSubmit = false) => {
    const textToSubmit = inputText.trim() || interimText.trim();
    if (!textToSubmit) {
      onShowToast('info', 'No Content', 'Please speak, select a starter, or enter text before applying.');
      return;
    }

    stopSpeech();
    onApplyText(textToSubmit, autoSubmit);
    onClose();
  };

  const handleDirectSubmitSample = (sample: string) => {
    stopSpeech();
    onApplyText(sample, targetMode === 'chat');
    onClose();
  };

  const handleSelectSample = (sample: string) => {
    setInputText(sample);
  };

  if (!isOpen) return null;

  const sampleList = targetMode === 'canvas' ? SAMPLE_VOICE_PROMPTS.canvas : SAMPLE_VOICE_PROMPTS.chat;

  return (
    <div
      id="voice-input-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#12141A] border border-[#2A2E39] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23262B] bg-[#161920]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C8AA6E]/15 border border-[#C8AA6E]/30 text-[#E5D5B5]">
              <Mic className="w-5 h-5 animate-pulse text-[#C8AA6E]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F3F4F6]">
                {targetMode === 'canvas' ? 'Voice Dictation Assistant' : 'Voice Chat with Gemini'}
              </h2>
              <p className="text-xs text-[#8E9AAF]">
                {targetMode === 'canvas'
                  ? 'Transcribe spoken reflections directly to your journal'
                  : 'Speak or select your question to receive Gemini insights immediately'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#8E9AAF] hover:text-white hover:bg-[#23262B] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Audio / Mic Status Box */}
          <div className="p-4 rounded-xl bg-[#181B22] border border-[#282C37] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A0AEC0]">
                  {isRecording ? 'Microphone Active & Listening' : 'Microphone Inactive'}
                </span>
              </div>
              <button
                type="button"
                onClick={isRecording ? stopSpeech : startSpeech}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  isRecording
                    ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200'
                    : 'bg-[#23262B] hover:bg-[#2F343F] border border-[#3A404F] text-[#F3F4F6]'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" /> Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-[#C8AA6E]" /> Start Listening
                  </>
                )}
              </button>
            </div>

            {/* Audio Waveform Meter */}
            {isRecording && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#8E9AAF]">
                  <span>Voice Signal Level</span>
                  <span>{audioLevel > 5 ? `${audioLevel}%` : 'Listening for voice...'}</span>
                </div>
                <div className="w-full h-2 bg-[#12141A] rounded-full overflow-hidden border border-[#23262B]">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${Math.max(8, audioLevel)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Permission / Iframe Error Warning */}
            {permissionError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-300">Sandbox Preview Notice</p>
                  <p className="text-amber-100/80">{permissionError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Voice Starters / Sample Prompts with 1-Click Action */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" /> Quick Speech Starters (1-Click Action)
              </span>
              <span className="text-[11px] text-[#8E9AAF]">Instant execute</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {sampleList.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#181B22] hover:bg-[#1E222B] border border-[#262A34] hover:border-[#C8AA6E]/40 text-xs text-[#D1D5DB] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="text-left flex-1 text-xs text-[#E5E7EB] hover:text-[#C8AA6E] transition cursor-pointer"
                    title="Click to edit in text canvas"
                  >
                    "{sample}"
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="px-2 py-1 rounded bg-[#23262B] hover:bg-[#2F343F] text-[11px] text-[#A0AEC0] hover:text-white transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectSubmitSample(sample)}
                      className="px-2.5 py-1 rounded bg-linear-to-r from-[#C8AA6E] to-[#DFCA98] hover:opacity-90 text-[11px] font-bold text-[#0A0B0D] transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                    >
                      {targetMode === 'chat' ? (
                        <>
                          <Zap className="w-3 h-3 text-[#0A0B0D] fill-[#0A0B0D]" /> Send to Gemini
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add & Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcribed / Editable Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0]">
                {targetMode === 'chat' ? 'Spoken Prompt / Question' : 'Transcribed Reflection Canvas'}
              </label>
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="text-[11px] text-[#8E9AAF] hover:text-rose-400 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isRecording
                    ? 'Start speaking... words will appear here in real time.'
                    : 'Spoken, selected, or typed text will appear here. Edit as you like before submitting...'
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#14171E] border border-[#262A34] text-[#F3F4F6] text-sm focus:outline-hidden focus:border-[#C8AA6E] transition font-sans leading-relaxed resize-none"
              />
              {interimText && (
                <div className="p-2 mt-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs italic">
                  Live interim: "{interimText}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#23262B] bg-[#161920]">
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#8E9AAF] hover:text-white hover:bg-[#23262B] transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {targetMode === 'chat' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApply(false)}
                  disabled={!inputText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#23262B] hover:bg-[#2F343F] border border-[#3A404F] text-xs font-medium text-[#F3F4F6] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Insert into Box
                </button>
                <button
                  type="button"
                  id="voice-modal-submit-chat-btn"
                  onClick={() => handleApply(true)}
                  disabled={!inputText.trim()}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-[#C8AA6E] to-[#DFCA98] hover:opacity-95 text-[#0A0B0D] text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-1.5 active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" /> Send Voice Query to Gemini
                </button>
              </>
            ) : (
              <button
                type="button"
                id="voice-modal-apply-canvas-btn"
                onClick={() => handleApply(false)}
                disabled={!inputText.trim()}
                className="px-4 py-2 rounded-xl bg-linear-to-r from-[#C8AA6E] to-[#DFCA98] hover:opacity-95 text-[#0A0B0D] text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-1.5 active:scale-98"
              >
                <Check className="w-4 h-4" /> Apply Voice Transcripts to Journal & Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

