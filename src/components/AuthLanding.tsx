import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Brain,
  Layers,
  ArrowRight,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthLandingProps {
  onSignInSuccess: () => void;
  onError: (msg: string) => void;
}

export function AuthLanding({ onSignInSuccess, onError }: AuthLandingProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      onSignInSuccess();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // If user closed popup, don't show loud error
      if (err?.code !== 'auth/popup-closed-by-user') {
        onError(err?.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#D1D1D1] flex flex-col justify-between selection:bg-[#2A303C] selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-[#23262B] bg-[#0F1115]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1A1D23] border border-[#2D3139] text-[#F3F4F6] flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              R
            </div>
            <div>
              <span className="font-serif font-semibold text-[#F3F4F6] text-lg tracking-tight">
                ReflectAI
              </span>
              <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-[#1A1D23] text-[#A1A1AA] border border-[#2D3139]">
                Gemini 3.6 Flash
              </span>
            </div>
          </div>

          <button
            id="header-sign-in-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#0A0B0D] hover:bg-white text-sm font-medium transition cursor-pointer disabled:opacity-50 shadow-xs active:scale-98"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            Sign In with Google
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1D23] border border-[#2D3139] text-[#C8AA6E] text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" />
              Private AI-Powered Journaling
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#F3F4F6] tracking-tight leading-[1.15]">
              Clarify your thoughts through reflective dialogue.
            </h1>

            <p className="mt-6 text-[#9CA3AF] text-lg sm:text-xl font-light leading-relaxed max-w-2xl">
              Write your uncensored reflections in a private sanctuary.
              Converse with Gemini 3.6 Flash to uncover blind spots, receive Stoic or Socratic perspectives, and discover recurring emotional themes.
            </p>

            {/* Primary Action Button */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button
                id="hero-sign-in-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-[#F3F4F6] text-[#0A0B0D] hover:bg-white text-base font-semibold transition cursor-pointer disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-98"
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Start Journaling</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs text-[#6B7280] justify-center">
                <Lock className="w-3.5 h-3.5 text-[#8E9AAF]" />
                Isolated User Firestore &bull; No Passwords Stored
              </div>
            </div>

            {/* Value checklist */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-8 border-t border-[#23262B] w-full text-sm text-[#9CA3AF]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C8AA6E]" />
                <span>Multi-turn conversational reflections</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C8AA6E]" />
                <span>Executive summaries & action items</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C8AA6E]" />
                <span>Owner-bound Firestore security rules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#C8AA6E]" />
                <span>Deep multi-entry trend synthesis</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Live Mockup Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="bg-[#0F1115] rounded-2xl border border-[#23262B] shadow-2xl overflow-hidden p-6 relative">
              <div className="flex items-center justify-between border-b border-[#23262B] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#23262B]" />
                  <div className="w-3 h-3 rounded-full bg-[#23262B]" />
                  <div className="w-3 h-3 rounded-full bg-[#23262B]" />
                  <span className="ml-2 text-xs font-medium text-[#6B7280]">Sample Reflection</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-medium">
                  Optimistic
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-serif font-semibold text-[#F3F4F6] text-base">
                    Navigating Career Transitions
                  </h3>
                  <p className="mt-1 text-[#9CA3AF] text-xs leading-relaxed italic">
                    "I felt hesitant taking on the new leadership role today, worried about imposter feelings, but I realized each challenge is a rehearsal..."
                  </p>
                </div>

                <div className="rounded-xl bg-[#161920] border border-[#23262B] p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F4F6]">
                    <Sparkles className="w-3.5 h-3.5 text-[#C8AA6E]" />
                    <span>Gemini Reflection</span>
                    <span className="text-[10px] text-[#6B7280] ml-auto font-mono">gemini-3.6-flash</span>
                  </div>
                  <p className="text-[#D1D1D1] text-xs leading-relaxed">
                    Notice how you reframe apprehension into rehearsal. This shift from outcome anxiety to skill acquisition is the core tenet of stoic resilience.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-1.5 border-t border-[#23262B]">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1D23] text-[#A1A1AA] border border-[#2D3139] font-medium">#Leadership</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1D23] text-[#A1A1AA] border border-[#2D3139] font-medium">#GrowthMindset</span>
                  </div>
                </div>

                <div className="rounded-lg bg-[#12151B] border border-[#23262B]/60 p-3 text-xs text-[#8E9AAF] flex items-center justify-between">
                  <span>Isolated path: /users/[userId]/entries/...</span>
                  <ShieldCheck className="w-4 h-4 text-[#C8AA6E]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#23262B] bg-[#0A0B0D] py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-[#D1D1D1]">ReflectAI</span>
            <span>&bull;</span>
            <span>Secured with Firebase Authentication & Cloud Firestore</span>
          </div>
          <div className="flex items-center gap-4">
            <span>OWASP Secure Coding</span>
            <span>&bull;</span>
            <span>Zero Password Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
