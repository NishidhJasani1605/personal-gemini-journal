import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import type { JournalEntry, ReflectionMode, ChatMessage } from '../types';

interface JournalEditorProps {
  entry: JournalEntry;
  onSave: (entry: JournalEntry) => Promise<void>;
  isSaving: boolean;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string, onRetry?: () => void) => void;
}

const MODES: Array<{ id: ReflectionMode; label: string; icon: any; desc: string }> = [
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
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflection');
  
  // Follow-up conversation input
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state if active entry switches
  useEffect(() => {
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setMood(entry.mood || '');
    setTags(entry.tags || []);
    setTagInput('');
    setChatInput('');
  }, [entry.id]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (entry.messages && entry.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entry.messages, isGenerating]);

  // Handle Manual Save
  const handleManualSave = async () => {
    const updatedEntry: JournalEntry = {
      ...entry,
      title: title.trim() || 'Untitled Entry',
      content: content.trim(),
      mood: mood || undefined,
      tags: tags,
      updatedAt: Date.now(),
    };
    try {
      await onSave(updatedEntry);
      onShowToast('success', 'Entry Saved', 'Changes persisted to isolated Firestore.');
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err?.message || 'Could not save entry.', () => handleManualSave());
    }
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
    const userMessageId = `msg-u-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: promptToSend || (currentMessages.length === 0 ? 'Please reflect on this entry.' : 'Continue reflection.'),
      timestamp: Date.now(),
    };

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
        id: `msg-m-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Reflection generated.',
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, modelMessage];
      const mergedTags = Array.from(new Set([...tags, ...(data.suggestedTags || [])]));
      const detectedMood = data.detectedMood || mood;

      const updatedEntry: JournalEntry = {
        ...entry,
        title: title.trim() || 'Untitled Reflection',
        content: content.trim(),
        summary: data.summary || entry.summary,
        mood: detectedMood,
        tags: mergedTags,
        actionableInsights: data.actionableInsights || entry.actionableInsights,
        messages: finalMessages,
        lastModelUsed: data.modelUsed,
        updatedAt: Date.now(),
      };

      // Update local state
      setMood(detectedMood);
      setTags(mergedTags);
      setChatInput('');

      // Persist to Firestore
      await onSave(updatedEntry);
      onShowToast('success', 'Reflection Generated & Saved', `Powered by ${data.modelUsed || 'Gemini 3.6 Flash'}`);
    } catch (err: any) {
      console.error('Reflection error:', err);
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
Mood: ${mood || 'Not specified'}
Tags: ${tags.join(', ')}

## Content
${content}

${entry.summary ? `## Executive Summary\n${entry.summary}\n` : ''}
${
  entry.actionableInsights && entry.actionableInsights.length > 0
    ? `## Actionable Insights\n${entry.actionableInsights.map((i) => `- ${i}`).join('\n')}\n`
    : ''
}
## Multi-Turn Dialogue
${(entry.messages || [])
  .map((m) => `### ${m.role === 'user' ? 'You' : 'Gemini 3.6 Flash'}\n${m.text}`)
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0B0D] overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-4 sm:p-6 shadow-xs space-y-4">
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
                onClick={handleManualSave}
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
                placeholder="Mood (e.g. Hopeful, Anxious, Serene)"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="bg-transparent text-[#F3F4F6] focus:outline-hidden text-xs w-28 sm:w-36 placeholder:text-[#6B7280]"
              />
            </div>

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

        {/* Journal Writing Canvas */}
        <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-6 shadow-xs space-y-4">
          <label htmlFor="journal-content-textarea" className="block text-xs font-semibold text-[#8E9AAF] tracking-wider uppercase">
            Journal Entry
          </label>

          <textarea
            id="journal-content-textarea"
            placeholder="Write your raw thoughts, doubts, goals, daily experiences, or creative reflections here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full text-[#F3F4F6] text-base leading-relaxed placeholder:text-[#3A3F4D] focus:outline-hidden resize-y font-sans bg-transparent"
          />

          {/* AI Mode Selector Toolbar */}
          <div className="pt-4 border-t border-[#23262B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#D1D1D1] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" />
                Select Reflection Perspective:
              </span>
              <span className="text-[11px] text-[#8E9AAF] font-mono hidden sm:inline">
                {MODES.find((m) => m.id === selectedMode)?.desc}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MODES.map((modeItem) => {
                const Icon = modeItem.icon;
                const isSelected = selectedMode === modeItem.id;
                return (
                  <button
                    key={modeItem.id}
                    type="button"
                    id={`mode-btn-${modeItem.id}`}
                    onClick={() => setSelectedMode(modeItem.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3F4F6] text-[#0A0B0D] shadow-xs font-semibold ring-1 ring-white/20'
                        : 'bg-[#161920] text-[#8E9AAF] border border-[#23262B] hover:bg-[#1A1D23] hover:text-[#F3F4F6]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{modeItem.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Primary Trigger Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[11px] text-[#6B7280]">
                Interactions and reflections are isolated in your private Firestore database.
              </div>

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
                    <span>Reflect with Gemini 3.6 Flash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Executive Summary & Insights Card (if generated) */}
        {(entry.summary || (entry.actionableInsights && entry.actionableInsights.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#14171E] border border-[#C8AA6E]/40 rounded-2xl p-5 shadow-lg space-y-3"
          >
            {entry.summary && (
              <div>
                <span className="text-[11px] font-bold text-[#C8AA6E] tracking-wider uppercase block mb-1">
                  Executive Summary
                </span>
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
        {entry.messages && entry.messages.length > 0 && (
          <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#23262B] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#C8AA6E]" />
                <h3 className="font-serif font-semibold text-[#F3F4F6] text-base">
                  Multi-Turn Reflection Dialogue
                </h3>
                <span className="text-xs text-[#6B7280] font-mono">
                  ({entry.messages.length} messages)
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
              {entry.messages.map((msg, index) => {
                const isUser = msg.role === 'user';

                return (
                  <motion.div
                    key={msg.id || index}
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
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.text, index)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-[#8E9AAF] hover:text-[#F3F4F6] bg-[#1A1D23] rounded-md border border-[#2D3139] transition cursor-pointer"
                          title="Copy reflection"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Continue Conversation Input */}
            <div className="pt-4 border-t border-[#23262B]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReflection();
                }}
                className="flex items-center gap-2"
              >
                <input
                  id="chat-followup-input"
                  type="text"
                  placeholder="Ask a follow-up question or explore deeper with Gemini..."
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
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
