import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  BarChart3,
  X,
  RefreshCw,
  Target,
  Compass,
  CheckCircle,
  Lightbulb,
  Heart,
} from 'lucide-react';
import type { JournalEntry, SynthesisResult } from '../types';

interface SynthesisModalProps {
  entries: JournalEntry[];
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export function SynthesisModal({ entries, onClose, onShowToast }: SynthesisModalProps) {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);

  const handleRunSynthesis = async () => {
    if (entries.length === 0) {
      onShowToast('info', 'No Entries', 'Please write at least one journal entry first.');
      return;
    }

    setIsSynthesizing(true);
    try {
      const response = await fetch('/api/synthesize-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to synthesize journal reflections.');
      }

      const data: SynthesisResult = await response.json();
      setSynthesis(data);
      onShowToast('success', 'Synthesis Complete', `Analyzed ${entries.length} journal entries.`);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      onShowToast('error', 'Synthesis Failed', err?.message || 'Could not complete synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div
      id="synthesis-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        id="synthesis-modal-dialog"
        className="bg-[#0F1115] rounded-2xl border border-[#23262B] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#D1D1D1]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#23262B] flex items-center justify-between bg-[#0F1115]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D23] border border-[#2D3139] text-[#F3F4F6] flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-[#C8AA6E]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F3F4F6]">
                Multi-Entry Journal Synthesis
              </h3>
              <p className="text-xs text-[#8E9AAF]">
                Analyzing trends and emotional evolution across {entries.length} reflections
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-synthesis-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9AAF] hover:text-[#F3F4F6] hover:bg-[#1A1D23] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {!synthesis && (
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#161920] border border-[#23262B] text-[#C8AA6E] mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-serif font-semibold text-[#F3F4F6] text-base">
                  Discover Patterns in Your Thoughts
                </h4>
                <p className="text-xs text-[#8E9AAF] mt-1 leading-relaxed">
                  Gemini 3.6 Flash synthesizes your recent entries to illuminate emotional trajectories, recurring dilemmas, and high-leverage growth areas.
                </p>
              </div>

              <button
                type="button"
                id="generate-synthesis-btn"
                onClick={handleRunSynthesis}
                disabled={isSynthesizing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F3F4F6] hover:bg-white text-[#0A0B0D] font-semibold text-sm transition cursor-pointer shadow-lg disabled:opacity-50 active:scale-98"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
                    <span>Synthesizing Entries...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-stone-900" />
                    <span>Run Synthesis Now</span>
                  </>
                )}
              </button>
            </div>
          )}

          {synthesis && (
            <div className="space-y-5">
              {/* Overall Theme */}
              <div className="rounded-xl bg-[#161920] border border-[#23262B] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-[#C8AA6E]" />
                  <span>Dominant Life Narrative & Focus</span>
                </div>
                <p className="text-[#D1D1D1] leading-relaxed text-xs sm:text-sm">
                  {synthesis.overallTheme}
                </p>
              </div>

              {/* Emotional Trends */}
              <div className="rounded-xl bg-[#14171E] border border-[#C8AA6E]/40 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C8AA6E] uppercase tracking-wider">
                  <Heart className="w-4 h-4 text-[#C8AA6E]" />
                  <span>Emotional Trajectory & Resilience</span>
                </div>
                <p className="text-[#D1D1D1] leading-relaxed text-xs sm:text-sm">
                  {synthesis.emotionalTrends}
                </p>
              </div>

              {/* Key Takeaways */}
              <div className="rounded-xl bg-[#161920] border border-[#23262B] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-[#C8AA6E]" />
                  <span>Core Takeaways & Recurring Insights</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#D1D1D1]">
                  {synthesis.keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#C8AA6E] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Focus */}
              <div className="rounded-xl bg-[#1A1D23] border border-[#2D3139] text-[#F3F4F6] p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C8AA6E] uppercase tracking-wider">
                  <Target className="w-4 h-4 text-[#C8AA6E]" />
                  <span>Suggested Focus for Coming Days</span>
                </div>
                <p className="text-[#D1D1D1] leading-relaxed text-xs sm:text-sm">
                  {synthesis.recommendedFocus}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-2 border-t border-[#23262B]">
                <span>Synthesized with {synthesis.modelUsed || 'Gemini 3.6 Flash'}</span>
                <button
                  type="button"
                  id="re-synthesize-btn"
                  onClick={handleRunSynthesis}
                  disabled={isSynthesizing}
                  className="flex items-center gap-1 text-[#8E9AAF] hover:text-[#F3F4F6] font-medium cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSynthesizing ? 'animate-spin' : ''}`} />
                  Re-synthesize
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#23262B] bg-[#0F1115] flex items-center justify-end">
          <button
            type="button"
            id="close-synthesis-bottom-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#161920] hover:bg-[#1A1D23] border border-[#23262B] text-[#D1D1D1] hover:text-[#F3F4F6] text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
