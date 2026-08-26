import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Smile,
  Heart,
  TrendingUp,
  Calendar,
  Sparkles,
  Flame,
  Award,
  BarChart2,
  Compass,
} from 'lucide-react';
import type { JournalEntry, MoodCategory, MoodDistribution } from '../types';

interface MoodDashboardModalProps {
  entries: JournalEntry[];
  onClose: () => void;
}

export function MoodDashboardModal({ entries, onClose }: MoodDashboardModalProps) {
  // Compute analytics
  const analytics = useMemo(() => {
    const total = entries.length;
    if (total === 0) {
      return {
        total: 0,
        distribution: [],
        dominantMood: 'No data',
        streakDays: 0,
        averageWordsPerEntry: 0,
        topTags: [],
        timeline: [],
      };
    }

    // Category tallies
    const categoryCounts: Record<MoodCategory, number> = {
      calm: 0,
      optimistic: 0,
      reflective: 0,
      determined: 0,
      neutral: 0,
    };

    let totalWords = 0;
    const tagFrequencies: Record<string, number> = {};

    entries.forEach((e) => {
      // Determine category
      let cat: MoodCategory = e.moodCategory || 'neutral';
      if (!e.moodCategory && e.mood) {
        const m = e.mood.toLowerCase();
        if (m.includes('calm') || m.includes('peace') || m.includes('serene') || m.includes('grat')) {
          cat = 'calm';
        } else if (m.includes('opti') || m.includes('hope') || m.includes('joy') || m.includes('excit')) {
          cat = 'optimistic';
        } else if (m.includes('reflect') || m.includes('thought') || m.includes('deep') || m.includes('melan')) {
          cat = 'reflective';
        } else if (m.includes('determ') || m.includes('focus') || m.includes('drive') || m.includes('anx')) {
          cat = 'determined';
        }
      }
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Words
      const words = e.content ? e.content.trim().split(/\s+/).length : 0;
      totalWords += words;

      // Tags
      (e.tags || []).forEach((t) => {
        tagFrequencies[t] = (tagFrequencies[t] || 0) + 1;
      });
    });

    const categoryMeta: Record<MoodCategory, { label: string; color: string }> = {
      calm: { label: 'Calm & Grounded', color: '#10B981' }, // Emerald
      optimistic: { label: 'Optimistic & Inspired', color: '#F59E0B' }, // Amber
      reflective: { label: 'Reflective & Analytical', color: '#818CF8' }, // Indigo
      determined: { label: 'Determined & Action-Driven', color: '#F43F5E' }, // Rose
      neutral: { label: 'Contemplative & Observant', color: '#9CA3AF' }, // Gray
    };

    const distribution: MoodDistribution[] = (Object.keys(categoryCounts) as MoodCategory[]).map(
      (cat) => ({
        category: cat,
        label: categoryMeta[cat].label,
        count: categoryCounts[cat],
        percentage: Math.round((categoryCounts[cat] / total) * 100) || 0,
        color: categoryMeta[cat].color,
      })
    ).sort((a, b) => b.count - a.count);

    // Calculate streak
    const entryDates = Array.from(
      new Set(
        entries.map((e) => new Date(e.createdAt).toISOString().slice(0, 10))
      )
    ).sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (entryDates.includes(today) || entryDates.includes(yesterday)) {
      streak = 1;
      let checkDate = new Date(entryDates[0]);
      for (let i = 1; i < entryDates.length; i++) {
        const prevExpected = new Date(checkDate.getTime() - 86400000)
          .toISOString()
          .slice(0, 10);
        if (entryDates[i] === prevExpected) {
          streak++;
          checkDate = new Date(entryDates[i]);
        } else {
          break;
        }
      }
    }

    const sortedTags = Object.entries(tagFrequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const dominant = distribution[0]?.label || 'Reflective';

    return {
      total,
      distribution,
      dominantMood: dominant,
      streakDays: streak,
      averageWordsPerEntry: Math.round(totalWords / total),
      topTags: sortedTags,
      timeline: entries.slice(0, 7).reverse(),
    };
  }, [entries]);

  return (
    <div
      id="mood-dashboard-backdrop"
      className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        id="mood-dashboard-dialog"
        className="bg-[#0F1115] rounded-2xl border border-[#23262B] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#D1D1D1]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#23262B] flex items-center justify-between bg-[#0F1115]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D23] border border-[#2D3139] text-[#C8AA6E] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F3F4F6]">
                Emotional Trajectory & Mood Analytics
              </h3>
              <p className="text-xs text-[#8E9AAF]">
                Longitudinal emotional patterns across your {entries.length} reflections
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-mood-dashboard-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9AAF] hover:text-[#F3F4F6] hover:bg-[#1A1D23] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {entries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Smile className="w-10 h-10 text-[#6B7280] mx-auto mb-2" />
              <p className="text-xs text-[#8E9AAF]">
                Write a few journal entries to visualize your mood patterns and emotional trajectory.
              </p>
            </div>
          ) : (
            <>
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#161920] border border-[#23262B] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8E9AAF]">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reflection Streak</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F3F4F6]">
                    {analytics.streakDays} {analytics.streakDays === 1 ? 'Day' : 'Days'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161920] border border-[#23262B] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8E9AAF]">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Dominant State</span>
                  </div>
                  <div className="text-sm font-semibold text-[#F3F4F6] truncate">
                    {analytics.dominantMood.split('&')[0]}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161920] border border-[#23262B] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8E9AAF]">
                    <BarChart2 className="w-3.5 h-3.5 text-[#C8AA6E]" />
                    <span>Total Reflections</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F3F4F6]">
                    {analytics.total}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161920] border border-[#23262B] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8E9AAF]">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Avg Words</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F3F4F6]">
                    {analytics.averageWordsPerEntry}
                  </div>
                </div>
              </div>

              {/* Mood Distribution */}
              <div className="p-5 rounded-2xl bg-[#14171E] border border-[#23262B] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#C8AA6E]" />
                    Mood State Distribution
                  </span>
                  <span className="text-[11px] text-[#8E9AAF] font-mono">
                    {entries.length} reflections evaluated
                  </span>
                </div>

                <div className="space-y-3">
                  {analytics.distribution.map((item) => (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#F3F4F6] flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </span>
                        <span className="font-mono text-[#8E9AAF]">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#1A1D23] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recurring Tags & Topics */}
              {analytics.topTags.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#161920] border border-[#23262B] space-y-3">
                  <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C8AA6E]" />
                    Top Recurring Mindset Themes
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analytics.topTags.map(([tag, count]) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A1D23] border border-[#2D3139] text-xs font-medium text-[#D1D1D1]"
                      >
                        <span>{tag}</span>
                        <span className="text-[10px] font-mono text-[#C8AA6E] bg-[#23262B] px-1.5 py-0.2 rounded">
                          {count}x
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#23262B] bg-[#0F1115] flex items-center justify-between text-xs text-[#6B7280]">
          <span>Reflections secured in private Firestore database</span>
          <button
            type="button"
            id="close-mood-modal-footer-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#161920] hover:bg-[#1A1D23] border border-[#23262B] text-[#D1D1D1] hover:text-[#F3F4F6] font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
