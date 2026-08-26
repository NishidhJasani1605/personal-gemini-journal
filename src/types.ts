export type ReflectionMode =
  | 'reflection'
  | 'summary'
  | 'brainstorm'
  | 'socratic'
  | 'stoic'
  | 'gratitude'
  | 'action_planner'
  | 'future_self';

export type MoodCategory = 'calm' | 'optimistic' | 'reflective' | 'determined' | 'neutral';

export interface SmartGoal {
  id: string;
  title: string;
  category: string;
  deadline?: string;
  completed: boolean;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  mood?: string;
  moodCategory?: MoodCategory;
  summary?: string;
  actionableInsights?: string[];
  smartGoals?: SmartGoal[];
  messages: ChatMessage[];
  lastModelUsed?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface AIResponsePayload {
  reply: string;
  summary?: string;
  suggestedTags?: string[];
  detectedMood?: string;
  moodCategory?: MoodCategory;
  actionableInsights?: string[];
  extractedGoals?: SmartGoal[];
  modelUsed: string;
}

export interface SynthesisResult {
  overallTheme: string;
  emotionalTrends: string;
  keyTakeaways: string[];
  recommendedFocus: string;
  modelUsed: string;
}

export interface SemanticSearchResult {
  entryId: string;
  title: string;
  relevanceScore: number;
  explanation: string;
  matchingQuote?: string;
  date: number;
  mood?: string;
}

export interface MoodDistribution {
  category: MoodCategory;
  label: string;
  count: number;
  percentage: number;
  color: string;
}
