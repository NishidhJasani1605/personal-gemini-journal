import { useState } from 'react';
import {
  Sparkles,
  Plus,
  LogOut,
  BarChart3,
  Menu,
  X,
  BookMarked,
  Shield,
  TrendingUp,
} from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  totalEntries: number;
  onNewEntry: () => void;
  onOpenSynthesis: () => void;
  onOpenMoodAnalytics: () => void;
  onSignOut: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Navbar({
  user,
  totalEntries,
  onNewEntry,
  onOpenSynthesis,
  onOpenMoodAnalytics,
  onSignOut,
  isSidebarOpen,
  onToggleSidebar,
}: NavbarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#0F1115]/95 backdrop-blur-md border-b border-[#23262B] shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-[#8E9AAF] hover:text-[#F3F4F6] hover:bg-[#1A1D23] transition md:hidden cursor-pointer"
            aria-label="Toggle journal sidebar"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#2D3139] text-[#F3F4F6] flex items-center justify-center font-serif font-bold text-base shadow-xs">
              R
            </div>
            <div className="hidden sm:block">
              <span className="font-serif font-semibold text-[#F3F4F6] text-base tracking-tight block leading-tight">
                ReflectAI
              </span>
              <span className="text-[11px] text-[#8E9AAF] font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#C8AA6E]" />
                Private Firestore
              </span>
            </div>
          </div>
        </div>

        {/* Center/Actions: Mood Trends, Synthesis & New Entry */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            id="open-mood-analytics-btn"
            onClick={onOpenMoodAnalytics}
            disabled={totalEntries === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#23262B] bg-[#161920] hover:bg-[#1A1D23] hover:border-[#2D3139] text-[#D1D1D1] text-xs sm:text-sm font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="View Mood Trends & Analytics Dashboard"
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Mood</span>
            <span>Analytics</span>
          </button>

          <button
            type="button"
            id="open-synthesis-btn"
            onClick={onOpenSynthesis}
            disabled={totalEntries === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#23262B] bg-[#161920] hover:bg-[#1A1D23] hover:border-[#2D3139] text-[#D1D1D1] text-xs sm:text-sm font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={totalEntries === 0 ? 'Create at least one entry to synthesize' : 'Synthesize insights across all entries'}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#C8AA6E]" />
            <span className="hidden sm:inline">Multi-Entry</span>
            <span>Synthesis</span>
          </button>

          <button
            type="button"
            id="new-entry-btn"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-white text-[#0A0B0D] text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>

        {/* Right Side: Profile & Sign Out */}
        <div className="relative">
          <button
            type="button"
            id="profile-dropdown-btn"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#1A1D23] border border-transparent hover:border-[#23262B] transition cursor-pointer text-left"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-[#2D3139] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1A1D23] border border-[#2D3139] text-[#F3F4F6] flex items-center justify-center font-medium text-xs">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-xs text-[#D1D1D1] max-w-[120px] truncate">
              <span className="font-semibold block truncate">
                {user.displayName || 'Journaler'}
              </span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div
                id="profile-menu-dropdown"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0F1115] border border-[#23262B] shadow-2xl py-2 z-50 text-xs text-[#D1D1D1]"
              >
                <div className="px-4 py-2 border-b border-[#23262B]">
                  <p className="font-semibold text-[#F3F4F6] truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-[#8E9AAF] font-mono text-[11px] truncate">
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[#8E9AAF] bg-[#161920] border border-[#23262B]/70 p-2 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <BookMarked className="w-3.5 h-3.5 text-[#C8AA6E]" />
                      Total Entries
                    </span>
                    <span className="font-semibold text-[#F3F4F6]">{totalEntries}</span>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    id="sign-out-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-lg font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
