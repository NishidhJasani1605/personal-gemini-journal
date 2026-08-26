import { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Tag,
  Trash2,
  Smile,
  ChevronRight,
  BookOpen,
  X,
  FileText,
} from 'lucide-react';
import type { JournalEntry } from '../types';

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

  // Filter entries
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
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-[#23262B] space-y-3 bg-[#0F1115]">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-semibold text-[#F3F4F6] text-sm tracking-tight flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#C8AA6E]" />
              Journal History
              <span className="text-xs font-mono font-normal text-[#6B7280]">
                ({entries.length})
              </span>
            </h2>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 text-[#8E9AAF] hover:text-[#F3F4F6] md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-entries-input"
              type="text"
              placeholder="Search entries, keywords, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-[#23262B] bg-[#161920] focus:bg-[#1A1D23] focus:outline-hidden focus:border-[#3E4552] text-[#F3F4F6] placeholder:text-[#6B7280] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F3F4F6] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills (Moods & Tags) */}
          {(allMoods.length > 0 || allTags.length > 0) && (
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

        {/* Entries List */}
        <div
          id="sidebar-entries-list"
          className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-[#23262B]/60"
        >
          {filteredEntries.length === 0 ? (
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
