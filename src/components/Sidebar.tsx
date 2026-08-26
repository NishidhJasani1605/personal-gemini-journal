import { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Tag,
  Trash2,
  Smile,
  X,
  FileText,
  Sparkles,
  RefreshCw,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import type { JournalEntry, SemanticSearchResult } from '../types';

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Semantic Search State
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null);
  const [semanticError, setSemanticError] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [entries]);

  // Extract all unique moods
  const allMoods = useMemo(() => {
    const moodSet = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) moodSet.add(e.mood);
    });
    return Array.from(moodSet);
  }, [entries]);

  // Filter entries for Standard keyword search
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTag || e.tags?.includes(selectedTag);
      const matchesMood = !selectedMood || e.mood?.toLowerCase() === selectedMood.toLowerCase();

      return matchesSearch && matchesTag && matchesMood;
    });
  }, [entries, searchQuery, selectedTag, selectedMood]);

  // Execute Semantic Search via Backend AI
  const handleRunSemanticSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || searchQuery.trim();
    if (!q) return;

    try {
      setIsSearchingSemantic(true);
      setSemanticError(null);

      const res = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          entries: entries,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Semantic search failed.');
      }

      const data = await res.json();
      setSemanticResults(data.results || []);
    } catch (err: any) {
      console.error('Semantic search error:', err);
      setSemanticError(err?.message || 'Could not perform AI semantic search.');
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const clearSemanticSearch = () => {
    setSemanticResults(null);
    setSemanticError(null);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#0A0B0D]/80 z-30 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="journal-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-30 w-80 lg:w-96 bg-[#0F1115] border-r border-[#23262B] flex flex-col h-full transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header & Search Controls */}
        <div className="p-4 border-b border-[#23262B] space-y-3 bg-[#0F1115]">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-semibold text-[#F3F4F6] text-sm tracking-tight flex items-center gap-1.5">
              <span>Journal History</span>
              <span className="text-xs font-mono font-normal text-[#6B7280]">
                ({entries.length})
              </span>
            </h2>

            {/* Mode Switch: Standard vs AI Semantic Search */}
            <div className="flex items-center gap-1 bg-[#161920] p-0.5 rounded-lg border border-[#23262B]">
              <button
                type="button"
                id="search-mode-standard-btn"
                onClick={() => {
                  setIsSemanticMode(false);
                  clearSemanticSearch();
                }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                  !isSemanticMode
                    ? 'bg-[#23262B] text-[#F3F4F6]'
                    : 'text-[#8E9AAF] hover:text-[#D1D1D1]'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                id="search-mode-semantic-btn"
                onClick={() => setIsSemanticMode(true)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  isSemanticMode
                    ? 'bg-[#C8AA6E] text-stone-950 font-bold'
                    : 'text-[#C8AA6E] hover:text-amber-300'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI Search</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 text-[#8E9AAF] hover:text-[#F3F4F6] md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isSemanticMode) {
                handleRunSemanticSearch();
              }
            }}
            className="relative"
          >
            {isSemanticMode ? (
              <Sparkles className="w-4 h-4 text-[#C8AA6E] absolute left-3 top-1/2 -translate-y-1/2" />
            ) : (
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            )}

            <input
              id="search-entries-input"
              type="text"
              placeholder={
                isSemanticMode
                  ? 'Ask natural questions (e.g. "When did I feel stressed?")'
                  : 'Search keywords, title, content, or tags...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim() && isSemanticMode) {
                  clearSemanticSearch();
                }
              }}
              className="w-full pl-9 pr-14 py-1.5 text-xs rounded-lg border border-[#23262B] bg-[#161920] focus:bg-[#1A1D23] focus:outline-hidden focus:border-[#3E4552] text-[#F3F4F6] placeholder:text-[#6B7280] transition"
            />

            {isSemanticMode ? (
              <button
                type="submit"
                id="run-semantic-search-btn"
                disabled={isSearchingSemantic || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#C8AA6E] hover:bg-[#D4B87C] text-stone-950 font-bold text-[10px] cursor-pointer disabled:opacity-40 transition"
              >
                {isSearchingSemantic ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            ) : (
              searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F3F4F6] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </form>

          {/* Semantic Search Suggestions */}
          {isSemanticMode && !semanticResults && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-[#8E9AAF] block font-mono">
                Try conversational queries:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  'When did I feel overwhelmed?',
                  'Career growth & aspirations',
                  'Moments of deep gratitude',
                  'Lessons from setbacks',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setSearchQuery(prompt);
                      handleRunSemanticSearch(prompt);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#161920] border border-[#23262B] text-[#8E9AAF] hover:text-[#C8AA6E] hover:border-[#C8AA6E]/40 transition text-left cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Standard Filter Pills (Moods & Tags) */}
          {!isSemanticMode && (allMoods.length > 0 || allTags.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
              {(selectedTag || selectedMood) && (
                <button
                  type="button"
                  id="clear-filters-btn"
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedMood(null);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-[#23262B] text-[#D1D1D1] font-medium hover:bg-[#2D3139] transition cursor-pointer flex items-center gap-1"
                >
                  Clear filters <X className="w-3 h-3" />
                </button>
              )}

              {allMoods.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  id={`filter-mood-${mood}`}
                  onClick={() =>
                    setSelectedMood(selectedMood === mood ? null : mood)
                  }
                  className={`text-[11px] px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    selectedMood === mood
                      ? 'bg-[#F3F4F6] text-[#0A0B0D] font-semibold'
                      : 'bg-[#161920] text-[#8E9AAF] border border-[#23262B] hover:bg-[#1A1D23] hover:text-[#F3F4F6]'
                  }`}
                >
                  <Smile className="w-3 h-3" />
                  {mood}
                </button>
              ))}

              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  id={`filter-tag-${tag.replace('#', '')}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-[#F3F4F6] text-[#0A0B0D] font-semibold'
                      : 'bg-[#161920] text-[#8E9AAF] border border-[#23262B] hover:bg-[#1A1D23] hover:text-[#F3F4F6]'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entries List Area */}
        <div
          id="sidebar-entries-list"
          className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-[#23262B]/60"
        >
          {/* SEMANTIC SEARCH RESULTS VIEW */}
          {isSemanticMode && semanticResults !== null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs">
                <span className="font-semibold text-[#C8AA6E] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {semanticResults.length} Relevant Reflections
                </span>
                <button
                  type="button"
                  onClick={clearSemanticSearch}
                  className="text-[10px] text-[#8E9AAF] hover:text-white underline cursor-pointer"
                >
                  Reset Results
                </button>
              </div>

              {semanticResults.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-[#6B7280]">
                  No matching reflections found for this semantic query.
                </div>
              ) : (
                semanticResults.map((result) => {
                  const matchingEntry = entries.find((e) => e.id === result.entryId);
                  if (!matchingEntry) return null;
                  const isActive = activeEntryId === result.entryId;

                  return (
                    <div
                      key={result.entryId}
                      onClick={() => {
                        onSelectEntry(matchingEntry);
                        onCloseMobile();
                      }}
                      className={`p-3 rounded-xl transition cursor-pointer text-left border ${
                        isActive
                          ? 'bg-[#181A22] border-[#C8AA6E]/60 shadow-md'
                          : 'bg-[#14171E] border-[#23262B] hover:border-[#3E4552]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-serif text-sm font-semibold text-[#F3F4F6] line-clamp-1">
                          {result.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-bold shrink-0">
                          {result.relevanceScore}% Match
                        </span>
                      </div>

                      {/* AI Match Explanation */}
                      <p className="text-xs text-[#C8AA6E] leading-relaxed mb-1 font-medium">
                        &rarr; {result.explanation}
                      </p>

                      {/* Quote Snippet */}
                      {result.matchingQuote && (
                        <p className="text-[11px] text-[#8E9AAF] italic line-clamp-2 bg-[#0F1115] p-2 rounded-lg border border-[#23262B]">
                          "{result.matchingQuote}"
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
                        <span>{formatDate(result.date)}</span>
                        {result.mood && <span>Mood: {result.mood}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* STANDARD ENTRIES LIST VIEW */
            filteredEntries.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <FileText className="w-8 h-8 text-[#23262B] mx-auto mb-2" />
                <p className="text-xs text-[#6B7280] font-medium">
                  {entries.length === 0
                    ? 'No journal entries yet. Click "New Entry" above to start writing!'
                    : 'No entries match your search query.'}
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isActive = activeEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    id={`sidebar-entry-${entry.id}`}
                    onClick={() => {
                      onSelectEntry(entry);
                      onCloseMobile();
                    }}
                    className={`group relative p-3 rounded-xl transition cursor-pointer select-none text-left ${
                      isActive
                        ? 'bg-[#161920] shadow-xs border border-[#2D3139]'
                        : 'hover:bg-[#161920]/60 border border-transparent hover:border-[#23262B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`font-serif text-sm font-semibold leading-snug line-clamp-1 ${
                          isActive ? 'text-[#F3F4F6]' : 'text-[#D1D1D1] group-hover:text-[#F3F4F6]'
                        }`}
                      >
                        {entry.title || 'Untitled Reflection'}
                      </h3>

                      <button
                        type="button"
                        id={`delete-entry-trigger-${entry.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete(entry.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-rose-400 transition rounded-md hover:bg-[#23262B] cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Summary Snippet or Content */}
                    <p className="mt-1 text-xs text-[#8E9AAF] line-clamp-2 leading-relaxed">
                      {entry.summary || entry.content || 'No content written yet.'}
                    </p>

                    {/* Metadata Row */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6B7280]">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.createdAt)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {entry.smartGoals && entry.smartGoals.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#161920] border border-[#23262B] text-emerald-400 font-mono text-[10px]">
                            {entry.smartGoals.filter((g) => g.completed).length}/{entry.smartGoals.length} goals
                          </span>
                        )}
                        {entry.mood && (
                          <span className="px-1.5 py-0.5 rounded bg-[#1A1D23] border border-[#2D3139] text-[#C8AA6E] font-medium">
                            {entry.mood}
                          </span>
                        )}
                        {entry.messages?.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#161920] border border-[#23262B] text-[#8E9AAF] font-mono text-[10px]">
                            {entry.messages.length} msg
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] text-[#8E9AAF] font-medium bg-[#161920] border border-[#23262B] px-1.5 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {entryToDelete && (
          <div
            id="delete-confirmation-backdrop"
            className="fixed inset-0 z-50 bg-[#0A0B0D]/80 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              id="delete-confirmation-dialog"
              className="bg-[#0F1115] rounded-2xl border border-[#23262B] shadow-2xl p-6 max-w-sm w-full space-y-4 text-[#D1D1D1]"
            >
              <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-800/40 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-[#F3F4F6]">
                  Delete Journal Entry?
                </h4>
                <p className="text-xs text-[#8E9AAF] mt-1 leading-relaxed">
                  This reflection and all associated AI conversation turns will be permanently removed from your isolated Firestore storage.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="cancel-delete-btn"
                  onClick={() => setEntryToDelete(null)}
                  className="px-3.5 py-2 rounded-lg border border-[#23262B] bg-[#161920] hover:bg-[#1A1D23] text-xs font-medium text-[#D1D1D1] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-btn"
                  onClick={() => {
                    onDeleteEntry(entryToDelete);
                    setEntryToDelete(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
