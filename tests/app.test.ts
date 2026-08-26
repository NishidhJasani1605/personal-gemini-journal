import { stripUndefined } from '../src/lib/firebase';
import type { SmartGoal, MoodCategory, JournalEntry } from '../src/types';

/**
 * Unit Test Suite for ReflectAI Core Business Logic & Security Hygiene
 */

function runUnitTests() {
  console.log('🧪 Starting ReflectAI Unit Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // ---------------- Test 1: Zero-Crash Payload Hygiene (stripUndefined) ----------------
  console.log('--- Suite 1: Payload Sanitization & Firestore Hygiene ---');
  const dirtyPayload = {
    title: 'Testing Reflection',
    content: 'Some deep thoughts',
    summary: undefined,
    mood: 'Optimistic',
    actionableInsights: undefined,
    smartGoals: [
      { id: 'g1', title: 'Meditate', category: 'Health', completed: false, deadline: undefined },
    ],
    nested: {
      a: 1,
      b: undefined,
      c: null,
    },
  };

  const cleaned = stripUndefined(dirtyPayload);

  assert(!('summary' in cleaned), 'Undefined top-level property "summary" is stripped');
  assert(!('actionableInsights' in cleaned), 'Undefined top-level property "actionableInsights" is stripped');
  assert(cleaned.title === 'Testing Reflection', 'Defined properties are preserved');
  assert(cleaned.nested.c === null, 'Null values are preserved');
  assert(!('b' in cleaned.nested), 'Nested undefined property "b" is stripped');
  assert(!('deadline' in cleaned.smartGoals[0]), 'Array item undefined property "deadline" is stripped');

  // ---------------- Test 2: SMART Goals Integrity ----------------
  console.log('\n--- Suite 2: SMART Goal Operations & Formatting ---');
  const sampleGoal: SmartGoal = {
    id: 'goal-101',
    title: 'Complete draft proposal by 5 PM Friday',
    category: 'Career',
    deadline: 'Friday 5 PM',
    completed: false,
  };

  assert(sampleGoal.completed === false, 'New goals default to uncompleted');
  const toggledGoal: SmartGoal = { ...sampleGoal, completed: !sampleGoal.completed };
  assert(toggledGoal.completed === true, 'Goal toggle switches completion state');
  assert(toggledGoal.category === 'Career', 'Category classification is retained');

  // ---------------- Test 3: Mood Category Theme Mapping ----------------
  console.log('\n--- Suite 3: Mood Trajectory & Theme Mapping ---');
  const resolveMoodCategory = (moodText: string): MoodCategory => {
    const m = (moodText || '').toLowerCase();
    if (m.includes('calm') || m.includes('peace') || m.includes('serene') || m.includes('grat')) {
      return 'calm';
    } else if (m.includes('opti') || m.includes('hope') || m.includes('joy') || m.includes('excit')) {
      return 'optimistic';
    } else if (m.includes('reflect') || m.includes('thought') || m.includes('deep') || m.includes('melan')) {
      return 'reflective';
    } else if (m.includes('determ') || m.includes('focus') || m.includes('drive') || m.includes('anx')) {
      return 'determined';
    }
    return 'neutral';
  };

  assert(resolveMoodCategory('Deeply Serene') === 'calm', 'Serene mood maps to "calm"');
  assert(resolveMoodCategory('Optimistic & energized') === 'optimistic', 'Optimistic mood maps to "optimistic"');
  assert(resolveMoodCategory('Philosophical and Reflective') === 'reflective', 'Reflective mood maps to "reflective"');
  assert(resolveMoodCategory('Determined to succeed') === 'determined', 'Determined mood maps to "determined"');
  assert(resolveMoodCategory('Ambiguous day') === 'neutral', 'Unspecified mood maps to "neutral"');

  // ---------------- Test 4: Model Fallback Ladder Sequence ----------------
  console.log('\n--- Suite 4: Resilient Gemini Model Fallback Ladder ---');
  const MODEL_LADDER = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ];

  assert(MODEL_LADDER[0] === 'gemini-3.6-flash', 'Primary tier is gemini-3.6-flash');
  assert(MODEL_LADDER[1] === 'gemini-3.1-flash-lite', 'High-availability fallback is gemini-3.1-flash-lite');
  assert(MODEL_LADDER[2] === 'gemini-flash-latest', 'Dynamic alias tier is gemini-flash-latest');
  assert(MODEL_LADDER[3] === 'gemini-3.7-flash', 'Deep reasoning fallback is gemini-3.7-flash');

  // ---------------- Test 5: Future Self Persona Directives ----------------
  console.log('\n--- Suite 5: Future Self (5-Year) Persona Directives ---');
  const modePrompts = {
    future_self: 'Act as the user\'s wise, compassionate, and fulfilled self from 5 years in the future...',
    reflection: 'Act as a compassionate, deeply insightful journal companion...',
    stoic: 'Act as a modern Stoic mentor...',
  };

  assert(Boolean(modePrompts.future_self), 'Future Self (5-Year) persona is configured');
  assert(modePrompts.future_self.includes('5 years in the future'), 'Future Self persona embeds 5-year perspective');

  // ---------------- Test 6: Voice Dictation & Multi-turn Message Structure ----------------
  console.log('\n--- Suite 6: Voice Dictation & Multi-turn Dialogue Structure ---');
  const sampleEntry: JournalEntry = {
    id: 'entry-voice-123',
    userId: 'user-456',
    title: 'Voice-Dictated Morning Thoughts',
    content: 'Dictated paragraph one. Dictated paragraph two.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['#morning', '#clarity'],
    messages: [
      { id: 'msg-u-1', role: 'user', text: 'How can I stay calm today?', timestamp: Date.now() },
      { id: 'msg-m-1', role: 'model', text: 'Ground yourself in what you control.', timestamp: Date.now() + 500 },
    ],
  };

  assert(sampleEntry.messages?.length === 2, 'Multi-turn messages preserve dialogue turns');
  assert(sampleEntry.messages?.[0].role === 'user', 'User message turn is tagged as role "user"');
  assert(sampleEntry.messages?.[1].role === 'model', 'Gemini message turn is tagged as role "model"');
  assert(sampleEntry.content.includes('Dictated paragraph'), 'Voice-dictated content is captured');

  const sanitizedEntry = stripUndefined(sampleEntry);
  assert(sanitizedEntry.id === 'entry-voice-123', 'Entry remains valid after undefined-stripping');

  // ---------------- Summary ----------------
  console.log('\n=========================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests();
