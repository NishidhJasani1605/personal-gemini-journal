export type ReflectionMode =
  | 'reflection'
  | 'summary'
  | 'brainstorm'
  | 'socratic'
  | 'stoic'
  | 'gratitude'
  | 'action_planner';

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
  summary?: string;
  actionableInsights?: string[];
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
  actionableInsights?: string[];
  modelUsed: string;
}

export interface SynthesisResult {
  overallTheme: string;
  emotionalTrends: string;
  keyTakeaways: string[];
  recommendedFocus: string;
  modelUsed: string;
}
