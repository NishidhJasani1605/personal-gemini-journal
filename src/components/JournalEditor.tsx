import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  Check,
  RefreshCw,
  Tag,
  Smile,
  Lightbulb,
  Compass,
  FileText,
  HelpCircle,
  ShieldAlert,
  HeartHandshake,
  CheckSquare,
  Bot,
  User,
  Copy,
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Hourglass,
} from 'lucide-react';
import type { JournalEntry, ReflectionMode, ChatMessage, SmartGoal, MoodCategory } from '../types';
import { VoiceInputModal } from './VoiceInputModal';

interface JournalEditorProps {
  entry: JournalEntry;
  onSave: (entry: JournalEntry) => Promise<void>;
  isSaving: boolean;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string, onRetry?: () => void) => void;
}

const MODES: Array<{ id: ReflectionMode; label: string; icon: any; desc: string }> = [
  { id: 'future_self', label: 'Future Self (5Y)', icon: Hourglass, desc: 'Wise, compassionate 5-year future self' },
  { id: 'reflection', label: 'Reflection', icon: Compass, desc: 'Empathetic & insightful perspective' },
  { id: 'summary', label: 'Summary', icon: FileText, desc: 'Executive summary & key takeaways' },
  { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, desc: 'Creative angles & lateral thinking' },
  { id: 'socratic', label: 'Socratic', icon: HelpCircle, desc: 'Exploratory challenge questions' },
  { id: 'stoic', label: 'Stoic', icon: ShieldAlert, desc: 'Resilience, virtue, & what you control' },
  { id: 'gratitude', label: 'Gratitude', icon: HeartHandshake, desc: 'Mindfulness & grounding positives' },
  { id: 'action_planner', label: 'Action Plan', icon: CheckSquare, desc: 'Concrete step-by-step roadmaps' },
];

export function JournalEditor({
  entry,
  onSave,
  isSaving,
  onShowToast,
}: JournalEditorProps) {
  const [title, setTitle] = useState(entry.title || '');
  const [content, setContent] = useState(entry.content || '');
  const [mood, setMood] = useState(entry.mood || '');
  const [moodCategory, setMoodCategory] = useState<MoodCategory>(entry.moodCategory || 'neutral');
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('future_self');
  
  // SMART Goals State
  const [smartGoals, setSmartGoals] = useState<SmartGoal[]>(entry.smartGoals || []);
  const [isExtractingGoals, setIsExtractingGoals] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Mindset');
  const [newGoalDeadline, setNewGoalDeadline] = useState('This week');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Voice Input Modal State & Diagnostics
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceModalMode, setVoiceModalMode] = useState<'canvas' | 'chat'>('canvas');
  const speechTimeoutRef = useRef<any>(null);
  const chatSpeechTimeoutRef = useRef<any>(null);

  // Speech Dictation State (Editor Canvas)
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Speech Dictation State (Follow-up Chat)
  const [isListeningChat, setIsListeningChat] = useState(false);
  const [chatInterimTranscript, setChatInterimTranscript] = useState('');
  const chatRecognitionRef = useRef<any>(null);

  // Audio Speech Synthesis (TTS) State
  const [speakingTextId, setSpeakingTextId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Follow-up conversation input
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Up-to-date refs to prevent stale closures in async handlers
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const moodRef = useRef(mood);
  const moodCategoryRef = useRef(moodCategory);
  const tagsRef = useRef(tags);
  const smartGoalsRef = useRef(smartGoals);
  const chatInputRef = useRef(chatInput);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    moodCategoryRef.current = moodCategory;
  }, [moodCategory]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    smartGoalsRef.current = smartGoals;
  }, [smartGoals]);

  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

  // Sync state if active entry switches
  useEffect(() => {
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setMood(entry.mood || '');
    setMoodCategory(entry.moodCategory || 'neutral');
    setTags(entry.tags || []);
    setSmartGoals(entry.smartGoals || []);
    setTagInput('');
    setChatInput('');
    stopTTS();
    stopListening(false);
    stopListeningChat(false);
  }, [entry.id]);

  // Clean up speech recognition & synthesis on unmount
  useEffect(() => {
    return () => {
      stopListening(false);
      stopListeningChat(false);
      stopTTS();
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (chatSpeechTimeoutRef.current) clearTimeout(chatSpeechTimeoutRef.current);
    };
  }, []);

  // Pending optimistic user message while chat is reflecting
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);

  // Helper to scroll only when actively sending/receiving chat responses
  const scrollToChatBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  // ---------------- Voice Dictation: Editor Canvas (Web Speech API + Fallback) ----------------
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceModalMode('canvas');
      setIsVoiceModalOpen(true);
      onShowToast(
        'info',
        'Voice Assistant Opened',
        'Native Web Speech API is not supported in this browser engine. Use the voice assistant to speak or dictate.'
      );
      return;
    }

    // If chat listening is active, stop it first
    if (chatRecognitionRef.current) {
      stopListeningChat();
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    let hasReceivedResult = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // 3.0-second Iframe / Audio Block Detection
      speechTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedResult && recognitionRef.current === recognition) {
          console.info('Speech recognition silent for 3.0s; opening voice input assistant.');
          stopListening();
          setVoiceModalMode('canvas');
          setIsVoiceModalOpen(true);
        }
      }, 3000);

      recognition.onstart = () => {
        setIsListening(true);
        onShowToast('info', 'Dictation Active', 'Listening to your voice. Speak freely...');
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

        setInterimTranscript(currentInterim);

        if (finalTranscripts) {
          setContent((prev) => {
            const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            const updated = prev + separator + finalTranscripts;
            contentRef.current = updated;
            return updated;
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListening(false);
          setInterimTranscript('');
          return;
        }

        console.warn('Speech recognition notice:', event.error || event);
        setIsListening(false);
        setInterimTranscript('');

        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          setVoiceModalMode('canvas');
          setIsVoiceModalOpen(true);
          onShowToast(
            'info',
            'Voice Assistant Ready',
            'Browser or iframe blocked microphone access. Opened voice assistant fallback.'
          );
        } else {
          onShowToast('info', 'Dictation Notice', `Speech notice (${event.error})`);
        }
      };

      recognition.onend = () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Failed to initialize speech recognition:', err);
      setIsListening(false);
      setVoiceModalMode('canvas');
      setIsVoiceModalOpen(true);
    }
  };

  const stopListening = (saveTranscript = false) => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.abort === 'function') {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore stop error
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');

    // Auto-save voice-dictated entry to Firestore ONLY when explicitly requested by user stopping dictation
    if (saveTranscript && contentRef.current.trim()) {
      handleManualSave({ content: contentRef.current.trim() }).catch(() => {});
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  // ---------------- Voice Dictation: Follow-up Chat (Web Speech API + Fallback & Auto-Send) ----------------
  const startListeningChat = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceModalMode('chat');
      setIsVoiceModalOpen(true);
      return;
    }

    // If editor listening is active, stop it first without saving
    if (recognitionRef.current) {
      stopListening(false);
    }

    if (chatSpeechTimeoutRef.current) {
      clearTimeout(chatSpeechTimeoutRef.current);
    }

    let hasReceivedChatResult = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Chat queries are conversational single turns
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // 3.0-second Iframe / Silence Detection for Chat
      chatSpeechTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedChatResult && chatRecognitionRef.current === recognition) {
          console.info('Chat speech recognition silent for 3.0s; opening voice input assistant.');
          stopListeningChat(false);
          setVoiceModalMode('chat');
          setIsVoiceModalOpen(true);
        }
      }, 3000);

      recognition.onstart = () => {
        setIsListeningChat(true);
        onShowToast('info', 'Listening for Follow-up...', 'Speak your question for Gemini...');
      };

      recognition.onresult = (event: any) => {
        hasReceivedChatResult = true;
        if (chatSpeechTimeoutRef.current) {
          clearTimeout(chatSpeechTimeoutRef.current);
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

        setChatInterimTranscript(currentInterim);

        if (finalTranscripts) {
          setChatInput((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            const updated = prev + separator + finalTranscripts;
            chatInputRef.current = updated;
            return updated;
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (chatSpeechTimeoutRef.current) {
          clearTimeout(chatSpeechTimeoutRef.current);
        }

        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListeningChat(false);
          setChatInterimTranscript('');
          return;
        }

        console.warn('Chat speech recognition notice:', event.error || event);
        setIsListeningChat(false);
        setChatInterimTranscript('');

        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          setVoiceModalMode('chat');
          setIsVoiceModalOpen(true);
        } else {
          onShowToast('info', 'Chat Voice Notice', `Microphone ended (${event.error})`);
        }
      };

      recognition.onend = () => {
        if (chatSpeechTimeoutRef.current) {
          clearTimeout(chatSpeechTimeoutRef.current);
          chatSpeechTimeoutRef.current = null;
        }
        setIsListeningChat(false);
        setChatInterimTranscript('');
        chatRecognitionRef.current = null;
      };

      recognition.start();
      chatRecognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Failed to initialize chat speech recognition:', err);
      setIsListeningChat(false);
      setVoiceModalMode('chat');
      setIsVoiceModalOpen(true);
    }
  };

  const stopListeningChat = (triggerSend = false) => {
    if (chatSpeechTimeoutRef.current) {
      clearTimeout(chatSpeechTimeoutRef.current);
      chatSpeechTimeoutRef.current = null;
    }
    if (chatRecognitionRef.current) {
      try {
        if (typeof chatRecognitionRef.current.abort === 'function') {
          chatRecognitionRef.current.abort();
        } else {
          chatRecognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore stop error
      }
      chatRecognitionRef.current = null;
    }
    setIsListeningChat(false);
    setChatInterimTranscript('');

    // If user clicked stop and text is present, auto-send to Gemini
    if (triggerSend) {
      const spokenText = chatInputRef.current.trim();
      if (spokenText && !isGenerating) {
        handleSendReflection(spokenText);
      }
    }
  };

  const toggleListeningChat = () => {
    if (isListeningChat) {
      stopListeningChat(true);
    } else {
      setVoiceModalMode('chat');
      setIsVoiceModalOpen(true);
    }
  };

  // Handle text applied from VoiceInputModal
  const handleApplyVoiceText = (text: string, autoSubmit = false) => {
    if (voiceModalMode === 'canvas') {
      const prev = contentRef.current;
      const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? '\n\n' : '';
      const updated = prev + separator + text;
      setContent(updated);
      contentRef.current = updated;
      handleManualSave({ content: updated }).catch(() => {});
      onShowToast('success', 'Voice Dictation Applied', 'Text added to your journal canvas and saved.');
    } else {
      setChatInput(text);
      chatInputRef.current = text;
      if (autoSubmit) {
        onShowToast('info', 'Querying Gemini', 'Sending voice prompt to Gemini reflection engine...');
        handleSendReflection(text);
      }
    }
  };

  // ---------------- Text-to-Speech (Web Speech Synthesis) ----------------
  const playTTS = (textId: string, textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('error', 'Audio Unsupported', 'Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingTextId === textId) {
      stopTTS();
      return;
    }

    stopTTS();

    // Strip markdown formatting and tags for cleaner audio
    const cleanText = textToSpeak
      .replace(/[*_#`~>\[\]\(\)]/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      onShowToast('info', 'No Content', 'There is no text to speak.');
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Pick a natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Daniel'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        setSpeakingTextId(textId);
      };

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeakingTextId(null);
        }
      };

      utterance.onerror = (e: any) => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeakingTextId(null);
        }

        // 'canceled' and 'interrupted' are standard browser events when stopping or re-triggering speech
        if (e?.error === 'canceled' || e?.error === 'interrupted') {
          return;
        }

        console.warn('Speech synthesis notice:', e?.error || e);
        if (e?.error && e.error !== 'not-allowed') {
          onShowToast('info', 'Audio Notice', 'Audio playback stopped.');
        }
      };

      // Slight timeout allows cancel() to settle cleanly in Chromium without clipping
      setTimeout(() => {
        try {
          if (utteranceRef.current === utterance) {
            window.speechSynthesis.speak(utterance);
          }
        } catch (speakErr) {
          console.warn('SpeechSynthesis speak failed:', speakErr);
          setSpeakingTextId(null);
          utteranceRef.current = null;
        }
      }, 50);
    } catch (err: any) {
      console.warn('TTS initialization error:', err);
      setSpeakingTextId(null);
      utteranceRef.current = null;
    }
  };

  const stopTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore cancel error
      }
    }
    utteranceRef.current = null;
    setSpeakingTextId(null);
  };

  // ---------------- Manual Save ----------------
  const handleManualSave = async (customOverrides?: Partial<JournalEntry>) => {
    const updatedEntry: JournalEntry = {
      ...entry,
      title: title.trim() || 'Untitled Entry',
      content: content.trim(),
      mood: mood || undefined,
      moodCategory: moodCategory,
      tags: tags,
      smartGoals: smartGoals,
      updatedAt: Date.now(),
      ...customOverrides,
    };
    try {
      await onSave(updatedEntry);
      onShowToast('success', 'Entry Saved', 'Changes persisted to isolated Firestore.');
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err?.message || 'Could not save entry.', () => handleManualSave(customOverrides));
    }
  };

  // ---------------- SMART Goals Actions ----------------
  const handleExtractSmartGoals = async () => {
    if (!content.trim() && (!entry.messages || entry.messages.length === 0)) {
      onShowToast('info', 'Empty Context', 'Write your entry or reflection before extracting SMART goals.');
      return;
    }

    try {
      setIsExtractingGoals(true);
      const res = await fetch('/api/extract-smart-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          messages: entry.messages || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to extract SMART goals');
      }

      const data = await res.json();
      const extracted: SmartGoal[] = data.goals || [];

      if (extracted.length === 0) {
        onShowToast('info', 'No Specific Goals Found', 'Try articulating concrete commitments in your reflection.');
        return;
      }

      // Merge with existing goals ensuring unique IDs
      const uniqueExtracted = extracted.map((g, idx) => ({
        ...g,
        id: g.id || `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
      }));
      const existingIds = new Set(smartGoals.map((g) => g.id));
      const filteredExtracted = uniqueExtracted.map((g, idx) => {
        if (existingIds.has(g.id)) {
          return { ...g, id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}` };
        }
        return g;
      });
      const merged = [...smartGoals, ...filteredExtracted];
      setSmartGoals(merged);

      // Persist to Firestore
      await handleManualSave({ smartGoals: merged });
      const completedCount = filteredExtracted.filter((g) => g.completed).length;
      onShowToast(
        'success',
        'SMART Goals Extracted',
        `Extracted ${filteredExtracted.length} action items with Gemini${completedCount > 0 ? ` (${completedCount} recognized as completed)` : ''}.`
      );
    } catch (err: any) {
      console.error('Error extracting goals:', err);
      onShowToast('error', 'Goal Extraction Failed', err.message || 'Could not parse SMART goals.');
    } finally {
      setIsExtractingGoals(false);
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    const nextGoals = smartGoals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    setSmartGoals(nextGoals);
    await handleManualSave({ smartGoals: nextGoals });
  };

  const handleDeleteGoal = async (goalId: string) => {
    const nextGoals = smartGoals.filter((g) => g.id !== goalId);
    setSmartGoals(nextGoals);
    await handleManualSave({ smartGoals: nextGoals });
  };

  const handleAddCustomGoal = async () => {
    if (!newGoalTitle.trim()) return;

    const newGoal: SmartGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      deadline: newGoalDeadline.trim() || 'This week',
      completed: false,
    };

    const nextGoals = [...smartGoals, newGoal];
    setSmartGoals(nextGoals);
    setNewGoalTitle('');
    setIsAddingGoal(false);
    await handleManualSave({ smartGoals: nextGoals });
    onShowToast('success', 'Goal Added', 'New SMART goal added to your checklist.');
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#+/, '');
      if (clean && !tags.includes(`#${clean}`)) {
        const nextTags = [...tags, `#${clean}`];
        setTags(nextTags);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Trigger Gemini Reflection / Multi-turn Dialogue
  const handleSendReflection = async (promptOverride?: string) => {
    const promptToSend = promptOverride || chatInput.trim();
    if (!content.trim() && !promptToSend) {
      onShowToast('info', 'Empty Entry', 'Please write some thoughts before generating a reflection.');
      return;
    }

    setIsGenerating(true);

    // Prepare updated message list
    const currentMessages = entry.messages || [];
    const userMessageId = `msg-u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: promptToSend || (currentMessages.length === 0 ? 'Please reflect on this entry.' : 'Continue reflection.'),
      timestamp: Date.now(),
    };

    setPendingUserMessage(userMessage);
    setChatInput('');
    scrollToChatBottom();

    const nextMessages = [...currentMessages, userMessage];

    try {
      const response = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryContent: content,
          title: title,
          userPrompt: promptToSend,
          history: nextMessages,
          mode: selectedMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Server failed to generate reflection.');
      }

      const data = await response.json();

      const modelMessage: ChatMessage = {
        id: `msg-m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'model',
        text: data.reply || 'Reflection generated.',
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, modelMessage];
      const mergedTags = Array.from(new Set([...tags, ...(data.suggestedTags || [])]));
      const detectedMood = data.detectedMood || mood;
      const detectedMoodCategory: MoodCategory = data.moodCategory || moodCategory || 'reflective';

      const updatedEntry: JournalEntry = {
        ...entry,
        title: title.trim() || 'Untitled Reflection',
        content: content.trim(),
        summary: data.summary || entry.summary,
        mood: detectedMood,
        moodCategory: detectedMoodCategory,
        tags: mergedTags,
        actionableInsights: data.actionableInsights || entry.actionableInsights,
        smartGoals: smartGoals,
        messages: finalMessages,
        lastModelUsed: data.modelUsed,
        updatedAt: Date.now(),
      };

      // Update local state
      setMood(detectedMood);
      setMoodCategory(detectedMoodCategory);
      setTags(mergedTags);
      setPendingUserMessage(null);

      // Persist to Firestore
      await onSave(updatedEntry);
      scrollToChatBottom();
      onShowToast('success', 'Reflection Generated & Saved', `Powered by ${data.modelUsed || 'Gemini'}`);
    } catch (err: any) {
      console.error('Reflection error:', err);
      setPendingUserMessage(null);
      onShowToast(
        'error',
        'Reflection Failed',
        err?.message || 'Gemini could not respond. Click retry to try again.',
        () => handleSendReflection(promptToSend)
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy reply to clipboard
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Export entry to markdown file
  const handleExportMarkdown = () => {
    const text = `# ${title || 'Untitled Reflection'}
Date: ${new Date(entry.createdAt).toLocaleString()}
Mood: ${mood || 'Not specified'} (${moodCategory})
Tags: ${tags.join(', ')}

## Content
${content}

${entry.summary ? `## Executive Summary\n${entry.summary}\n` : ''}
${
  smartGoals && smartGoals.length > 0
    ? `## SMART Goals Checklist\n${smartGoals
        .map((g) => `- [${g.completed ? 'x' : ' '}] **[${g.category}]** ${g.title} (${g.deadline || 'No deadline'})`)
        .join('\n')}\n`
    : ''
}
${
  entry.actionableInsights && entry.actionableInsights.length > 0
    ? `## Actionable Insights\n${entry.actionableInsights.map((i) => `- ${i}`).join('\n')}\n`
    : ''
}
## Multi-Turn Dialogue
${(entry.messages || [])
  .map((m) => `### ${m.role === 'user' ? 'You' : 'Gemini AI'}\n${m.text}`)
  .join('\n\n')}
`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'journal-entry').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const completedGoalsCount = smartGoals.filter((g) => g.completed).length;
  const goalProgressPercentage = smartGoals.length > 0 ? Math.round((completedGoalsCount / smartGoals.length) * 100) : 0;

  // Dynamic ambient mood border glow
  const moodGlowColors: Record<MoodCategory, string> = {
    calm: 'border-emerald-500/30 shadow-emerald-950/20',
    optimistic: 'border-amber-500/30 shadow-amber-950/20',
    reflective: 'border-indigo-500/30 shadow-indigo-950/20',
    determined: 'border-rose-500/30 shadow-rose-950/20',
    neutral: 'border-[#23262B] shadow-none',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0B0D] overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Top Control Bar with Mood Glow */}
        <div
          className={`bg-[#0F1115] rounded-2xl border transition-all duration-300 p-4 sm:p-6 shadow-lg space-y-4 ${
            moodGlowColors[moodCategory]
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <input
              id="entry-title-input"
              type="text"
              placeholder="Title of this reflection..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-serif text-2xl sm:text-3xl font-semibold text-[#F3F4F6] placeholder:text-[#3A3F4D] focus:outline-hidden w-full bg-transparent"
            />

            <div className="flex items-center gap-2 shrink-0">
              {/* Dictation Microphone Button */}
              <button
                type="button"
                id="voice-dictate-btn"
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-950/70 border-rose-600 text-rose-300 animate-pulse ring-2 ring-rose-500/40'
                    : 'bg-[#161920] border-[#23262B] text-[#D1D1D1] hover:bg-[#1A1D23] hover:text-[#F3F4F6]'
                }`}
                title={isListening ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-[#C8AA6E]" />
                    <span>Dictate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="export-markdown-btn"
                onClick={handleExportMarkdown}
                className="p-2 rounded-lg border border-[#23262B] bg-[#161920] hover:bg-[#1A1D23] text-[#8E9AAF] hover:text-[#F3F4F6] text-xs transition cursor-pointer"
                title="Export as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="manual-save-btn"
                onClick={() => handleManualSave()}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#23262B] bg-[#161920] hover:bg-[#1A1D23] text-[#D1D1D1] text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8E9AAF]" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#C8AA6E]" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Mood & Tag Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#23262B] text-xs">
            {/* Mood selector */}
            <div className="flex items-center gap-1.5 bg-[#161920] px-2.5 py-1 rounded-lg border border-[#23262B]">
              <Smile className="w-3.5 h-3.5 text-[#C8AA6E]" />
              <input
                id="mood-input"
                type="text"
                placeholder="Mood (e.g. Hopeful, Calm)"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="bg-transparent text-[#F3F4F6] focus:outline-hidden text-xs w-28 sm:w-36 placeholder:text-[#6B7280]"
              />
            </div>

            {/* Mood Category Indicator */}
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                moodCategory === 'calm'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : moodCategory === 'optimistic'
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  : moodCategory === 'reflective'
                  ? 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60'
                  : moodCategory === 'determined'
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                  : 'bg-[#161920] text-[#9CA3AF] border-[#23262B]'
              }`}
            >
              Theme: {moodCategory.toUpperCase()}
            </span>

            {/* Tags display and adder */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161920] text-[#D1D1D1] font-medium text-xs border border-[#23262B]"
                >
                  <Tag className="w-2.5 h-2.5 text-[#8E9AAF]" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 text-[#6B7280] ml-0.5 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1 bg-[#161920] px-2 py-1 rounded-lg border border-[#23262B]">
                <span className="text-[#6B7280] font-mono">#</span>
                <input
                  id="add-tag-input"
                  type="text"
                  placeholder="Add tag (Press Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="bg-transparent text-[#F3F4F6] focus:outline-hidden text-xs w-24 sm:w-32 placeholder:text-[#6B7280]"
                />
              </div>
            </div>

            <div className="ml-auto text-[11px] text-[#6B7280] font-mono">
              {wordCount} words &bull; {charCount} chars
            </div>
          </div>
        </div>

        {/* Live Speech Recognition Waveform / Feedback */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold text-rose-300">Live Voice Transcription Active:</span>
              <span className="italic text-rose-100/90 font-serif">
                {interimTranscript ? `"${interimTranscript}"` : 'Listening for your voice...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopListening(false);
                  setVoiceModalMode('canvas');
                  setIsVoiceModalOpen(true);
                }}
                className="text-[11px] px-2.5 py-1 bg-[#1F232B] hover:bg-[#2A303C] border border-[#3A404F] rounded font-medium text-[#C8AA6E] cursor-pointer"
              >
                Voice Assistant Options
              </button>
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="text-xs px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 border border-rose-700/60 rounded font-medium text-white cursor-pointer"
              >
                Done Dictating
              </button>
            </div>
          </motion.div>
        )}

        {/* Journal Writing Canvas */}
        <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="journal-content-textarea" className="block text-xs font-semibold text-[#8E9AAF] tracking-wider uppercase">
              Journal Entry Canvas
            </label>
            <span className="text-[11px] text-[#6B7280]">
              Speak or write your raw thoughts
            </span>
          </div>

          <textarea
            id="journal-content-textarea"
            placeholder="Write or dictate your raw thoughts, ambitions, doubts, goals, daily encounters, or questions..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            className="w-full text-[#F3F4F6] text-base leading-relaxed placeholder:text-[#3A3F4D] focus:outline-hidden resize-y font-sans bg-transparent"
          />

          {/* AI Mode Selector Toolbar */}
          <div className="pt-4 border-t border-[#23262B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#D1D1D1] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" />
                Select Reflection Perspective / Persona:
              </span>
              <span className="text-[11px] text-[#8E9AAF] font-mono hidden sm:inline">
                {MODES.find((m) => m.id === selectedMode)?.desc}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MODES.map((modeItem) => {
                const Icon = modeItem.icon;
                const isSelected = selectedMode === modeItem.id;
                const isFutureSelf = modeItem.id === 'future_self';

                return (
                  <button
                    key={modeItem.id}
                    type="button"
                    id={`mode-btn-${modeItem.id}`}
                    onClick={() => setSelectedMode(modeItem.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? isFutureSelf
                          ? 'bg-[#C8AA6E] text-stone-950 font-bold shadow-md ring-2 ring-[#C8AA6E]/40'
                          : 'bg-[#F3F4F6] text-[#0A0B0D] shadow-xs font-semibold ring-1 ring-white/20'
                        : isFutureSelf
                        ? 'bg-[#1C1812] text-[#C8AA6E] border border-[#C8AA6E]/40 hover:bg-[#251F17]'
                        : 'bg-[#161920] text-[#8E9AAF] border border-[#23262B] hover:bg-[#1A1D23] hover:text-[#F3F4F6]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{modeItem.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Primary Trigger Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[11px] text-[#6B7280]">
                Private Firestore database &bull; Gemini Multi-turn Engine
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="reflect-with-gemini-btn"
                  onClick={() => handleSendReflection()}
                  disabled={isGenerating || !content.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F3F4F6] hover:bg-white text-[#0A0B0D] text-sm font-semibold transition cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
                      <span>Reflecting with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-stone-900" />
                      <span>
                        {selectedMode === 'future_self' ? 'Consult Future Self (5Y)' : 'Reflect with Gemini'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SMART Goal Checklist Extractor Panel */}
        <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23262B] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#161920] border border-[#23262B] text-[#C8AA6E] flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-[#F3F4F6] text-sm sm:text-base">
                  SMART Goal & Commitment Checklist
                </h3>
                <p className="text-[11px] text-[#8E9AAF]">
                  Specific, Measurable, Achievable, Relevant, Time-bound action items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="extract-smart-goals-btn"
                onClick={handleExtractSmartGoals}
                disabled={isExtractingGoals || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161920] hover:bg-[#1A1D23] border border-[#2D3139] text-xs font-medium text-[#C8AA6E] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {isExtractingGoals ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C8AA6E]" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" />
                    <span>Auto-Extract Goals with AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="add-goal-toggle-btn"
                onClick={() => setIsAddingGoal(!isAddingGoal)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161920] hover:bg-[#1A1D23] border border-[#23262B] text-xs font-medium text-[#D1D1D1] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Goal</span>
              </button>
            </div>
          </div>

          {/* Goal Progress Bar */}
          {smartGoals.length > 0 && (
            <div className="space-y-1.5 bg-[#14171E] p-3 rounded-xl border border-[#23262B]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8E9AAF]">
                  Goal Completion: {completedGoalsCount} of {smartGoals.length}
                </span>
                <span className="font-mono font-semibold text-[#C8AA6E]">
                  {goalProgressPercentage}% Completed
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1A1D23] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C8AA6E] to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* New Goal Creator Input Form */}
          {isAddingGoal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#161920] p-4 rounded-xl border border-[#2D3139] space-y-3"
            >
              <span className="text-xs font-bold text-[#F3F4F6] block">
                Define a New SMART Goal
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="e.g. Schedule 30m 1-on-1 with mentor by Thursday"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#0F1115] border border-[#23262B] text-[#F3F4F6] focus:outline-hidden"
                />
                <select
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0F1115] border border-[#23262B] text-[#F3F4F6] focus:outline-hidden"
                >
                  <option value="Mindset">Mindset</option>
                  <option value="Career">Career</option>
                  <option value="Health">Health</option>
                  <option value="Habits">Habits</option>
                  <option value="Relationships">Relationships</option>
                </select>
                <input
                  type="text"
                  placeholder="Deadline (e.g. Friday)"
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0F1115] border border-[#23262B] text-[#F3F4F6] focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#8E9AAF] hover:text-[#F3F4F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomGoal}
                  disabled={!newGoalTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#F3F4F6] text-[#0A0B0D] hover:bg-white font-medium text-xs cursor-pointer disabled:opacity-40"
                >
                  Save Goal
                </button>
              </div>
            </motion.div>
          )}

          {/* Goals List */}
          {smartGoals.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#6B7280]">
              No active SMART goals extracted yet. Write an entry and click{' '}
              <strong className="text-[#C8AA6E]">"Auto-Extract Goals with AI"</strong> or add one manually.
            </div>
          ) : (
            <div className="space-y-2">
              {smartGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition ${
                    goal.completed
                      ? 'bg-[#12151B]/60 border-[#23262B]/50 opacity-70'
                      : 'bg-[#14171E] border-[#23262B] text-[#D1D1D1]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition cursor-pointer ${
                        goal.completed
                          ? 'bg-emerald-500 border-emerald-400 text-stone-950'
                          : 'border-[#3E4552] hover:border-[#C8AA6E]'
                      }`}
                    >
                      {goal.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="space-y-1">
                      <p
                        className={`font-medium leading-relaxed ${
                          goal.completed ? 'line-through text-[#6B7280]' : 'text-[#F3F4F6]'
                        }`}
                      >
                        {goal.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#8E9AAF]">
                        <span className="px-1.5 py-0.2 rounded bg-[#1A1D23] border border-[#2D3139] font-medium text-[#C8AA6E]">
                          {goal.category}
                        </span>
                        {goal.deadline && (
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {goal.deadline}
                          </span>
                        )}
                        {goal.notes && <span>&bull; {goal.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-[#6B7280] hover:text-rose-400 transition p-1 cursor-pointer"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Executive Summary & Insights Card (if generated) */}
        {(entry.summary || (entry.actionableInsights && entry.actionableInsights.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#14171E] border border-[#C8AA6E]/40 rounded-2xl p-5 shadow-lg space-y-3 relative group"
          >
            {entry.summary && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#C8AA6E] tracking-wider uppercase block">
                    Executive Summary
                  </span>
                  {/* TTS Button for Summary */}
                  <button
                    type="button"
                    onClick={() => playTTS('summary', entry.summary || '')}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      speakingTextId === 'summary'
                        ? 'bg-[#C8AA6E] text-stone-950 font-bold border-[#C8AA6E]'
                        : 'bg-[#1A1D23] text-[#D1D1D1] border-[#2D3139] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {speakingTextId === 'summary' ? (
                      <>
                        <VolumeX className="w-3 h-3" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-[#C8AA6E]" />
                        <span>Listen Aloud</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[#F3F4F6] text-sm leading-relaxed font-serif italic">
                  "{entry.summary}"
                </p>
              </div>
            )}

            {entry.actionableInsights && entry.actionableInsights.length > 0 && (
              <div className="pt-3 border-t border-[#23262B]">
                <span className="text-[11px] font-bold text-[#C8AA6E] tracking-wider uppercase block mb-1.5">
                  Actionable Insights & Prompts
                </span>
                <ul className="space-y-1 text-xs text-[#D1D1D1]">
                  {entry.actionableInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#C8AA6E] shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Multi-Turn Reflection Dialogue Thread */}
        {((entry.messages && entry.messages.length > 0) || pendingUserMessage || isGenerating) && (
          <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#23262B] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#C8AA6E]" />
                <h3 className="font-serif font-semibold text-[#F3F4F6] text-base">
                  Multi-Turn Reflection Dialogue
                </h3>
                <span className="text-xs text-[#6B7280] font-mono">
                  ({(entry.messages?.length || 0) + (pendingUserMessage ? 1 : 0)} messages)
                </span>
              </div>

              {entry.lastModelUsed && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161920] text-[#A1A1AA] border border-[#23262B]">
                  {entry.lastModelUsed}
                </span>
              )}
            </div>

            {/* Conversation Messages */}
            <div className="space-y-4">
              {entry.messages?.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isSpeakingThis = speakingTextId === msg.id;

                return (
                  <motion.div
                    key={msg.id || `msg-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 text-sm ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                        isUser
                          ? 'bg-[#1A1D23] border-[#2D3139] text-[#F3F4F6]'
                          : 'bg-[#161920] border-[#23262B] text-[#C8AA6E] font-serif'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4 text-[#F3F4F6]" /> : <Bot className="w-4 h-4 text-[#C8AA6E]" />}
                    </div>

                    <div
                      className={`max-w-2xl rounded-2xl p-4 space-y-2 relative group ${
                        isUser
                          ? 'bg-[#1E232B] border border-[#2D3139] text-[#F3F4F6] rounded-tr-xs'
                          : isSpeakingThis
                          ? 'bg-[#181A22] border-amber-500/50 text-[#D1D1D1] rounded-tl-xs ring-1 ring-amber-500/30'
                          : 'bg-[#14171E] border border-[#23262B] text-[#D1D1D1] rounded-tl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] text-[#8E9AAF] mb-1">
                        <span className="font-medium">
                          {isUser ? 'You' : 'Gemini AI Assistant'}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className={`prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed ${isUser ? 'text-[#F3F4F6]' : 'text-[#D1D1D1]'}`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                      </div>

                      {!isUser && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-[#23262B]/60">
                          {/* TTS Play/Stop Button */}
                          <button
                            type="button"
                            onClick={() => playTTS(msg.id, msg.text)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                              isSpeakingThis
                                ? 'bg-[#C8AA6E] text-stone-950 font-bold border-[#C8AA6E]'
                                : 'bg-[#1A1D23] text-[#8E9AAF] hover:text-[#F3F4F6] border-[#2D3139]'
                            }`}
                            title="Listen to reflection"
                          >
                            {isSpeakingThis ? (
                              <>
                                <VolumeX className="w-3 h-3" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, index)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#1A1D23] text-[#8E9AAF] hover:text-[#F3F4F6] border border-[#2D3139] transition cursor-pointer"
                            title="Copy reflection"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Optimistic Pending User Message */}
              {pendingUserMessage && !entry.messages?.some((m) => m.id === pendingUserMessage.id) && (
                <motion.div
                  key={pendingUserMessage.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 text-sm flex-row-reverse"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border bg-[#1A1D23] border-[#2D3139] text-[#F3F4F6]">
                    <User className="w-4 h-4 text-[#F3F4F6]" />
                  </div>
                  <div className="max-w-2xl rounded-2xl p-4 space-y-2 bg-[#1E232B] border border-[#2D3139] text-[#F3F4F6] rounded-tr-xs shadow-xs">
                    <div className="flex items-center justify-between gap-4 text-[10px] text-[#8E9AAF] mb-1">
                      <span className="font-medium">You</span>
                      <span>{new Date(pendingUserMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{pendingUserMessage.text}</p>
                  </div>
                </motion.div>
              )}

              {/* Active Answering / Reflecting Process Indicator */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 text-sm flex-row"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#161920] border border-[#C8AA6E]/40 text-[#C8AA6E] font-serif shadow-xs">
                    <Bot className="w-4 h-4 text-[#C8AA6E] animate-pulse" />
                  </div>
                  <div className="max-w-2xl rounded-2xl p-4 bg-[#14171E] border border-[#C8AA6E]/30 text-[#D1D1D1] rounded-tl-xs space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-[11px] text-[#C8AA6E] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#C8AA6E] animate-ping" />
                      <span>Gemini AI is analyzing your reflection...</span>
                    </div>
                    <div className="flex items-center gap-1.5 py-1 text-xs text-[#8E9AAF]">
                      <span>Synthesizing response</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8AA6E] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8AA6E] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8AA6E] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Continue Conversation Input */}
            <div className="pt-4 border-t border-[#23262B] space-y-2">
              {isListeningChat && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs shadow-xs animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-semibold text-amber-200">Listening for Follow-up:</span>
                    <span className="italic text-amber-100/90 font-serif">
                      {chatInterimTranscript ? `"${chatInterimTranscript}"` : 'Listening for your voice...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        stopListeningChat(false);
                        setVoiceModalMode('chat');
                        setIsVoiceModalOpen(true);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-[#1F232B] hover:bg-[#2A303C] border border-[#3A404F] text-[#C8AA6E] font-medium cursor-pointer"
                    >
                      Voice Options
                    </button>
                    <button
                      type="button"
                      onClick={() => stopListeningChat(true)}
                      className="text-[11px] px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-900 border border-amber-700/60 text-white font-medium cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isListeningChat) {
                    stopListeningChat(false);
                  }
                  handleSendReflection();
                }}
                className="flex items-center gap-2"
              >
                {/* Chat Voice Dictation Mic Button */}
                <button
                  type="button"
                  id="chat-mic-dictate-btn"
                  onClick={toggleListeningChat}
                  disabled={isGenerating}
                  className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isListeningChat
                      ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse ring-2 ring-rose-500/50'
                      : 'bg-[#161920] border-[#23262B] text-[#8E9AAF] hover:text-[#C8AA6E] hover:border-[#C8AA6E]/40 active:scale-95'
                  }`}
                  title={isListeningChat ? 'Stop Voice Input' : 'Dictate Follow-up with Microphone'}
                >
                  {isListeningChat ? (
                    <MicOff className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <input
                  id="chat-followup-input"
                  type="text"
                  placeholder={
                    isListeningChat
                      ? 'Listening to speech...'
                      : 'Ask a follow-up question, or click mic to dictate...'
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[#23262B] bg-[#161920] focus:bg-[#1A1D23] focus:outline-hidden focus:border-[#3E4552] text-[#F3F4F6] placeholder:text-[#6B7280] transition"
                />

                <button
                  type="submit"
                  id="chat-send-btn"
                  disabled={isGenerating || !chatInput.trim()}
                  className="p-2.5 rounded-xl bg-[#F3F4F6] hover:bg-white text-[#0A0B0D] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 active:scale-98"
                  title="Send message to Gemini"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Voice Input / Dictation Assistant Modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetMode={voiceModalMode}
        onApplyText={handleApplyVoiceText}
        onShowToast={onShowToast}
      />
    </div>
  );
}
