import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Standard Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy GoogleGenAI Initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. AI features will fallback gracefully.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Executes content generation with automatic model fallback ladder upon transient or availability errors.
 */
async function generateContentWithFallback(
  contents: any,
  systemInstruction?: string,
  responseSchema?: any
): Promise<FallbackResult> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini] Attempting content generation with model: ${modelName}`);
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config,
      });

      const responseText = response.text || '';
      return {
        text: responseText,
        modelUsed: modelName,
      };
    } catch (err: any) {
      console.warn(`[Gemini] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      // Continue to next model in the fallback ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ---------------- API Routes ----------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Reflect / Chat with Gemini on a Journal Entry
app.post('/api/reflect', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const {
      entryContent = '',
      title = '',
      userPrompt = '',
      history = [],
      mode = 'reflection',
    } = body;

    const modePrompts: Record<string, string> = {
      reflection: 'Act as a compassionate, deeply insightful journal companion. Provide thoughtful perspectives, empathetic resonance, and gentle inquiry into the user\'s thoughts.',
      summary: 'Act as an executive summarizer. Condense the key emotional beats, central challenges, and core realizations into a crisp, high-impact overview.',
      brainstorm: 'Act as a creative brainstormer. Expand on the ideas presented, offering fresh angles, creative solutions, and lateral thinking opportunities.',
      socratic: 'Act as a Socratic guide. Challenge assumptions gently with 2-3 deep, exploratory questions designed to uncover deeper subconscious insights.',
      stoic: 'Act as a modern Stoic mentor (in the vein of Marcus Aurelius and Epictetus). Help separate what is within control from what is not, focusing on virtue, resilience, and calm perspective.',
      gratitude: 'Act as a mindfulness and gratitude coach. Highlight subtle positives, moments of appreciation, and grounded silver linings in the user\'s narrative.',
      action_planner: 'Act as a pragmatic strategic planner. Break down the user\'s reflections into clear, prioritized, and low-friction next actionable steps.',
      future_self: 'Act as the user\'s wise, compassionate, and fulfilled self from 5 years in the future. You have lived through this exact chapter of life, navigated these doubts and dilemmas, and emerged with profound clarity, resilience, and joy. Speak directly to your past self with deep warmth, perspective, emotional reassurance, and strategic foresight, advising them on what truly matters in the long arc of their life.',
    };

    const selectedModeInstruction = modePrompts[mode] || modePrompts.reflection;

    const systemInstruction = `
You are an intelligent, empathetic, and highly capable Journal Reflection AI assistant.
The user is maintaining their private journal and conversing with you.

Mode Specific Directive:
${selectedModeInstruction}

You will receive the journal entry context and conversation history.
You MUST output a JSON response conforming strictly to the requested schema.
`;

    // Construct conversation payload
    const formattedHistory: any[] = [];
    
    // Add current entry context as initial reference
    let initialContext = `--- User's Current Journal Entry ---
Title: ${title || 'Untitled Entry'}
Content:
${entryContent || '(No content written yet)'}
-------------------------------------`;

    if (history.length > 0) {
      formattedHistory.push({
        role: 'user',
        parts: [{ text: `${initialContext}\n\nUser Question/Reflection: ${history[0].text}` }],
      });

      for (let i = 1; i < history.length; i++) {
        formattedHistory.push({
          role: history[i].role === 'user' ? 'user' : 'model',
          parts: [{ text: history[i].text }],
        });
      }

      // Add latest prompt if not already in history
      if (userPrompt && (!history.length || history[history.length - 1].text !== userPrompt)) {
        formattedHistory.push({
          role: 'user',
          parts: [{ text: userPrompt }],
        });
      }
    } else {
      formattedHistory.push({
        role: 'user',
        parts: [{ text: `${initialContext}\n\nPlease reflect on this entry and provide meaningful thoughts.` }],
      });
    }

    const jsonSchema = {
      type: 'object',
      properties: {
        reply: {
          type: 'string',
          description: 'The in-depth, empathetic, or analytical reflection response in Markdown format.',
        },
        summary: {
          type: 'string',
          description: 'A 1-2 sentence concise executive summary of the journal entry context.',
        },
        detectedMood: {
          type: 'string',
          description: 'A 1-2 word detected mood (e.g. "Reflective", "Optimistic", "Vulnerable", "Determined", "Grateful", "Overwhelmed", "Calm", "Peaceful").',
        },
        moodCategory: {
          type: 'string',
          enum: ['calm', 'optimistic', 'reflective', 'determined', 'neutral'],
          description: 'One of the 5 primary mood categories for UI theme accents.',
        },
        suggestedTags: {
          type: 'array',
          items: { type: 'string' },
          description: '2 to 4 concise hashtag topics (e.g. ["#Mindset", "#Career", "#Growth"]).',
        },
        actionableInsights: {
          type: 'array',
          items: { type: 'string' },
          description: '2 to 3 concise, high-value actionable takeaways or self-reflection questions.',
        },
      },
      required: ['reply', 'summary', 'detectedMood', 'moodCategory', 'suggestedTags'],
    };

    const result = await generateContentWithFallback(
      formattedHistory,
      systemInstruction,
      jsonSchema
    );

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(result.text);
    } catch {
      // Fallback if JSON parsing fails
      parsedResponse = {
        reply: result.text,
        summary: title ? `Reflection on "${title}"` : 'Personal journal reflection',
        detectedMood: 'Thoughtful',
        moodCategory: 'reflective',
        suggestedTags: ['#Journal', '#Reflection'],
        actionableInsights: ['Take a moment to pause and integrate these thoughts.'],
      };
    }

    res.json({
      ...parsedResponse,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/reflect:', error);
    res.status(500).json({
      error: 'Failed to generate reflection',
      message: error?.message || 'Unknown internal server error',
    });
  }
});

// Automated SMART Goal Checklist Extractor
app.post('/api/extract-smart-goals', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { title = '', content = '', messages = [] } = body;

    if (!content.trim() && messages.length === 0) {
      return res.status(400).json({ error: 'Entry content or dialogue is required to extract SMART goals.' });
    }

    const conversationContext = (messages || [])
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const prompt = `--- Journal Entry ---
Title: ${title || 'Untitled'}
Content:
${content}

--- Dialogue Context ---
${conversationContext || '(No additional dialogue)'}

Task:
Analyze this personal journal entry and reflection dialogue. Extract 2 to 5 SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals or actionable commitments that the user explicitly articulated or implicitly needs.
For each goal, provide a crisp title, a standard category (e.g. "Career", "Mindset", "Health", "Habits", "Relationships"), a realistic deadline or timeframe suggestion (e.g., "Within 3 days", "This Sunday", "Next 2 weeks"), and optional brief notes.`;

    const systemInstruction = `You are an elite executive productivity and cognitive coach specializing in SMART goal formulation from unstructured personal reflections.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique slug or id like goal-1' },
              title: { type: 'string', description: 'Clear, actionable, SMART-formatted goal statement' },
              category: { type: 'string', description: 'Category such as Mindset, Career, Health, Habits, Relationships' },
              deadline: { type: 'string', description: 'Suggested timeframe or deadline' },
              notes: { type: 'string', description: 'Brief rationale or execution tip' },
            },
            required: ['title', 'category'],
          },
        },
      },
      required: ['goals'],
    };

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      jsonSchema
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = { goals: [] };
    }

    const formattedGoals = (parsed.goals || []).map((g: any, idx: number) => ({
      id: g.id || `goal-${Date.now()}-${idx}`,
      title: g.title || 'Action item',
      category: g.category || 'Mindset',
      deadline: g.deadline || 'This week',
      notes: g.notes || '',
      completed: false,
    }));

    res.json({
      goals: formattedGoals,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/extract-smart-goals:', error);
    res.status(500).json({
      error: 'Failed to extract SMART goals',
      message: error?.message || 'Unknown internal server error',
    });
  }
});

// Natural Language Semantic Search across Journal Entries
app.post('/api/semantic-search', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { query = '', entries = [] } = body;

    if (!query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.json({ results: [], query, message: 'No entries to search through.' });
    }

    // Format top 30 entries for semantic ranking
    const corpus = entries.slice(0, 30).map((e: any, idx: number) => ({
      index: idx,
      id: e.id,
      title: e.title || 'Untitled',
      date: e.createdAt,
      mood: e.mood || 'Unspecified',
      tags: (e.tags || []).join(', '),
      contentSnippet: (e.content || '').slice(0, 600),
      summarySnippet: (e.summary || '').slice(0, 300),
    }));

    const prompt = `User Query: "${query}"

Here is the catalog of the user's journal entries:
${JSON.stringify(corpus, null, 2)}

Task:
Evaluate each journal entry against the semantic intent of the user's query (which may be a question like "When did I feel stressed about work?", "Moments of gratitude", "Lessons about failure", etc.).
Return the top relevant matching entries (up to 8 entries), sorted by relevance score (1-100). For each match, provide:
1. entryId: string ID of matching entry
2. relevanceScore: integer between 1 and 100
3. explanation: 1 sentence explaining why this entry matches the user's inquiry
4. matchingQuote: a short direct quote excerpt from the content or summary illustrating the match`;

    const systemInstruction = `You are a precision semantic retrieval and biographical search assistant. Your job is to accurately match conversational natural language inquiries with relevant personal journal entries based on emotions, topics, themes, and implicit context.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entryId: { type: 'string' },
              relevanceScore: { type: 'integer' },
              explanation: { type: 'string' },
              matchingQuote: { type: 'string' },
            },
            required: ['entryId', 'relevanceScore', 'explanation'],
          },
        },
      },
      required: ['matches'],
    };

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      jsonSchema
    );

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = { matches: [] };
    }

    // Join with entry metadata
    const results = (parsed.matches || [])
      .filter((m: any) => m.relevanceScore >= 30)
      .map((m: any) => {
        const matchingEntry = entries.find((e: any) => e.id === m.entryId);
        return {
          entryId: m.entryId,
          title: matchingEntry?.title || 'Journal Entry',
          relevanceScore: m.relevanceScore,
          explanation: m.explanation,
          matchingQuote: m.matchingQuote || matchingEntry?.summary || matchingEntry?.content?.slice(0, 150),
          date: matchingEntry?.createdAt || Date.now(),
          mood: matchingEntry?.mood,
        };
      });

    res.json({
      results,
      query,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/semantic-search:', error);
    res.status(500).json({
      error: 'Semantic search failed',
      message: error?.message || 'Unknown internal server error',
    });
  }
});

// Synthesize Across Multiple Entries
app.post('/api/synthesize-journal', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { entries = [] } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one journal entry is required for synthesis.' });
    }

    const entriesSummary = entries
      .slice(0, 15) // Limit to 15 recent entries for token hygiene
      .map((e: any, idx: number) => {
        return `Entry #${idx + 1}:
Date: ${new Date(e.createdAt || Date.now()).toLocaleDateString()}
Title: ${e.title || 'Untitled'}
Mood: ${e.mood || 'Unspecified'}
Tags: ${(e.tags || []).join(', ')}
Content Snippet: ${(e.content || '').slice(0, 500)}
---`;
      })
      .join('\n\n');

    const systemInstruction = `
You are a master psychological coach and analytical biographer.
Analyze the user's series of journal entries to produce an executive synthesis of their recent emotional patterns, overarching life themes, recurring mental blocks, and empowering recommendations for forward momentum.
`;

    const prompt = `Here are the user's recent journal entries:\n\n${entriesSummary}\n\nProvide an executive synthesis.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        overallTheme: {
          type: 'string',
          description: 'A 2-3 sentence overview of the dominant narrative or central focus across these entries.',
        },
        emotionalTrends: {
          type: 'string',
          description: 'Analysis of emotional trajectory, resilience patterns, and mood shifts over time.',
        },
        keyTakeaways: {
          type: 'array',
          items: { type: 'string' },
          description: '3 to 5 core insights or recurring themes identified.',
        },
        recommendedFocus: {
          type: 'string',
          description: 'A specific, empowering focus area or mindful habit for the upcoming week.',
        },
      },
      required: ['overallTheme', 'emotionalTrends', 'keyTakeaways', 'recommendedFocus'],
    };

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      jsonSchema
    );

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(result.text);
    } catch {
      parsedResponse = {
        overallTheme: 'Consistent dedication to introspection and growth.',
        emotionalTrends: 'Demonstrates reflective awareness and continuous adaptability.',
        keyTakeaways: ['Cultivating self-awareness through regular reflection.'],
        recommendedFocus: 'Maintain steady daily check-ins and celebrate small milestones.',
      };
    }

    res.json({
      ...parsedResponse,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/synthesize-journal:', error);
    res.status(500).json({
      error: 'Failed to synthesize journal entries',
      message: error?.message || 'Unknown internal server error',
    });
  }
});

// ---------------- Server & Vite Middleware Bootstrap ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
