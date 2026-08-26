import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  logOut,
  saveJournalEntry,
  deleteJournalEntry,
  subscribeToUserEntries,
} from './lib/firebase';
import type { JournalEntry, UserProfile } from './types';
import { AuthLanding } from './components/AuthLanding';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { JournalEditor } from './components/JournalEditor';
import { SynthesisModal } from './components/SynthesisModal';
import { MoodDashboardModal } from './components/MoodDashboardModal';
import { ToastContainer, type ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSynthesisOpen, setIsSynthesisOpen] = useState(false);
  const [isMoodDashboardOpen, setIsMoodDashboardOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper
  const addToast = useCallback(
    (
      type: 'success' | 'error' | 'info',
      title: string,
      message?: string,
      onRetry?: () => void
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, type, title, message, onRetry }]);

      // Auto dismiss after 3.5 seconds if no retry callback
      if (!onRetry) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      } else {
        setCurrentUser(null);
        setEntries([]);
        setActiveEntry(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to create a new blank entry
  const createNewEntryObject = (userId: string): JournalEntry => {
    return {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: userId,
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      moodCategory: 'neutral',
      smartGoals: [],
      messages: [],
    };
  };

  // Subscribe to user Firestore entries
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToUserEntries(
      currentUser.uid,
      (userEntries) => {
        setEntries(userEntries);
        // If active entry is not set or was just deleted, pick the newest or create a fresh draft
        setActiveEntry((prev) => {
          if (!prev) {
            return userEntries.length > 0
              ? userEntries[0]
              : createNewEntryObject(currentUser.uid);
          }
          // Find updated version in new list if exists
          const matching = userEntries.find((e) => e.id === prev.id);
          return matching || prev;
        });
      },
      (error) => {
        addToast(
          'error',
          'Database Sync Issue',
          error.message || 'Unable to sync with Firestore.'
        );
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, addToast]);

  // Handle Save
  const handleSaveEntry = async (entryToSave: JournalEntry) => {
    if (!currentUser?.uid) return;
    setIsSaving(true);
    try {
      await saveJournalEntry(currentUser.uid, entryToSave);
      setActiveEntry((prev) => (prev?.id === entryToSave.id ? entryToSave : prev));
    } catch (err: any) {
      console.error('Save entry failed:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      addToast('info', 'Entry Deleted', 'Removed from your Firestore collection.');
      if (activeEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setActiveEntry(
          remaining.length > 0
            ? remaining[0]
            : createNewEntryObject(currentUser.uid)
        );
      }
    } catch (err: any) {
      addToast(
        'error',
        'Delete Failed',
        err?.message || 'Could not delete entry from database.'
      );
    }
  };

  // Handle Create New Entry
  const handleNewEntry = () => {
    if (!currentUser?.uid) return;
    const newEntry = createNewEntryObject(currentUser.uid);
    setActiveEntry(newEntry);
    setIsSidebarOpen(false);
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A0B0D] flex flex-col items-center justify-center text-[#D1D1D1]">
        <div className="w-10 h-10 rounded-xl bg-[#161920] border border-[#23262B] text-[#C8AA6E] flex items-center justify-center font-serif text-xl font-bold mb-4 shadow-sm">
          R
        </div>
        <div className="w-6 h-6 border-2 border-[#23262B] border-t-[#C8AA6E] rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono text-[#8E9AAF] tracking-wider uppercase">
          Initializing Secure Session...
        </p>
      </div>
    );
  }

  // Not signed in -> Landing Page
  if (!currentUser) {
    return (
      <>
        <AuthLanding
          onSignInSuccess={() => {
            addToast('success', 'Welcome!', 'Signed in successfully with Google.');
          }}
          onError={(msg) => addToast('error', 'Authentication Error', msg)}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0D] text-[#D1D1D1] selection:bg-[#23262B] selection:text-[#F3F4F6]">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        totalEntries={entries.length}
        onNewEntry={handleNewEntry}
        onOpenSynthesis={() => setIsSynthesisOpen(true)}
        onOpenMoodAnalytics={() => setIsMoodDashboardOpen(true)}
        onSignOut={async () => {
          await logOut();
          addToast('info', 'Signed Out', 'You have been safely signed out.');
        }}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar with Journal History & Semantic Search */}
        <Sidebar
          entries={entries}
          activeEntryId={activeEntry?.id || null}
          onSelectEntry={(entry) => setActiveEntry(entry)}
          onDeleteEntry={handleDeleteEntry}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Editor & Multi-turn Reflection Studio */}
        {activeEntry ? (
          <JournalEditor
            key={activeEntry.id}
            entry={activeEntry}
            onSave={handleSaveEntry}
            isSaving={isSaving}
            onShowToast={addToast}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-[#6B7280] text-sm">
            Select an entry or click "New Entry" to start writing.
          </div>
        )}
      </div>

      {/* Cross-entry Synthesis Modal */}
      {isSynthesisOpen && (
        <SynthesisModal
          entries={entries}
          onClose={() => setIsSynthesisOpen(false)}
          onShowToast={addToast}
        />
      )}

      {/* Mood Dashboard & Emotional Trajectory Modal */}
      {isMoodDashboardOpen && (
        <MoodDashboardModal
          entries={entries}
          onClose={() => setIsMoodDashboardOpen(false)}
        />
      )}

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
