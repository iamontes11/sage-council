import Groq from 'groq-sdk';
import { CREATORS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse, CouncilChoice } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Free model ──– excellent quality, very fast
const MODEL = 'llama-3.3-70b-versatile';

// ── Build context from each creator's transcripts ── ─────────────;
  
async function buildCreatorContexts(userMessage: string) {
  const contexts = await Promise.all(
    CREATORS.map(async (creator) => {
      try {
        const chunks = await searchTranscriptChunks(creator.id, userMessage, 4);
        return { creator, chunks };
      } catch {
        return { creator, chunks: [] };
      }
    }),
  );
  return contexts;
}

function formatCreatorContext(
  creator: (typeof CREATORS)[number],
  chunks: Array<{ chunk_text: string; video_title: string }>,
): string {
  if (chunks.length === 0) return '';
  const excerpts = chunks
    .map((c) => `  • [${c.video_title || 'video'}] ${c.chunk_text.slice(0, 300)}...`)
    .join('\n');
  return `### ${creator.name} (${creator.tagline})\n${excerpts}`;
}

// ── System prompt ────────────────────────────────────────────────────────────────

const COUNCIL_SYSTEM_PROMPT = `You are the SAGE COUNCIL — a collaborative group of 9 distinct thinkers, each channeling the worldview of a specific creator. When Ignacio brings you a question, challenge, or decision, you work together to generate exactly 3 distinct, deeply personalized responses.

THE COUNCIL MEMBERS:
${CREATORS.map((c) => `• ${c.name} (${c.emoji}): ${c.philosophy}`).join('\n')}

YOUR TASK:
When given context from each council member's video transcripts + Ignacio's question, produce exactly 3 choices. Each choice must:
1. Take a meaningfully DIFFERENT philosophical stance or approach
2. Be clearly inspired by specific council members (cite 2-3 per choice)
3. Weave in specific wisdom from the provided transcript excerpts naturally
4. Give concrete, actionable advice — not platitudes
5. Have a memorable title and one clear first step

IMPORTANT RULES:
- Each of the 3 choices must feel genuinely different — not variations of the same advice
- Choice 1: lean toward radical honesty / cutting through BS
- Choice 2: lean toward systems / structure / clarity
- Choice 3: lean toward inner work / purpose / long view
- Tailor everything to Ignacio's specific situation — no generic advice
- Integrate transcript excerpts as lived insight, not as quotes
- You MUST respond with ONLY valid JSON — no markdown, no prose outside the JSON

RESPONSE FORMAT (strict JSON, nothing else):
{
  "choices": [
    {
      "id": 1,
      "title": "Memorable title (5-8 words)",
      "inspired_by": ["Creator Name 1", "Creator Name 2"],
      "tagline": "One-line essence of this path",
      "perspective": "The core philosophical stance of this choice (2 sentences)",
      "advice": "The full, rich, personalized advice (3-5 paragraphs separated by newlines)",
      "first_step": "One concrete action Ignacio can take TODAY"
    },
    { "id": 2, ... },
    { "id": 3, ... }
  ],
  "council_note": "Optional: a brief note from the Council (1 sentence)"
}`;

// ── Generate a council response ───────────────────────────────

export async function generateCouncilResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<CouncilResponse> {
  // 1. Gather relevant transcript excerpts for each creator
  const creatorContexts = await buildCreatorContexts(userMessage);

  // 2. Format context block
  const contextSections = creatorContexts
    .map(({ creator, chunks }) => formatCreatorContext(creator, chunks))
    .filter(Boolean);

  const contextBlock =
    contextSections.length > 0
      ? `## TRANSCRIPT WISDOM FROM THE COUNCIL\n\n${contextSections.join('\n\n')}`
      : `## TRANSCRIPT WISDOM \nNo transcripts ingested yet — council will rely on their core philosophuies.`;

  // 3. Build conversation history (last 6 turns)
  const recentHistory = chatHistory.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));

  // 4. Build user prompt
  const userPrompt = `${contextBlock}

---

#" IGNACIO'S QUESTION / CHALLENGE:
"${userMessage}"

---

Respond with ONLY the JSON object. No markdown code blocks, no explanation — just the raw JSON.`;

  // 5. Call Groq
  let response;
  try {
    response = await groq.chat.completions.create({
      model: MODEL, 
    ax_tokens: 4000,
      temperature: 0.75,
      messages: [
        { role: 'system', content: COUNCIL_SYSTEM_PROMPT },
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to reach the Sage Council. Please try again.');
  }

  const rawText = response.choices[0]?.message?.content || '';

  // 6. Parse — strip any accidental markdown fences
  const clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(clean) as CouncilResponse;
    if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length !== 3) {
      throw new Error('Invalid council response structure');
    }
    return parsed;
  } catch {
    console.error('Failed to parse council response:', rawText);
    return buildFallbackResponse();
  }
}

function buildFallbackResponse(): CouncilResponse {
  const choices: CouncilChoice[] = [
    {
      id: 1,
      title: 'Start With Radical Honesty',
      inspired_by: ['Mark Manson', 'Derek Sivers'],
      tagline: 'Cut through the noise to what actually matters',
      perspective:
        "Before strategizing, get brutally honest about what this situation is actually about. Most problems persist because we're solving the wrong thing.",
      advice:
        "Take 10 minutes and write down, without filters, what you're actually afraid of here. Not what you think you should be afraid of — what you genuinely feel.\n\nMark Manson would say your emotions are data. Derek Sivers would ask: what happens if you simply don't? Sometimes the answer to that question reveals everything.\n\nThe discomfort you feel around this question is exactly where the real answer lives.",
      first_step: 'Write one uncensored paragraph about your actual feelings on this — no editing.',
    },
    {
      id: 2,
      title: 'Design a System, Not a Decision',
      inspired_by: ['Sabrina Ramonov', 'Professor Jiang', 'Steven Bartlett'],
      tagline: 'Structure outlasts motivation every time',
      perspective:
        "One-time decisions are weak. A well-designed system makes the right choice automatic. The goal is to build the environment, not just find the answer.",
      advice:
        "Instead of asking 'what should I do?' ask 'what system would make this choice obvious going forward?' Break the problem to its first principles: what are the actual variables you control?\n\nBuild around those constraints deliberately. Steven Bartlett calls this 'designing your defaults' — the choices you make when you're not thinking.\n\nSabrina would add: automate or eliminate before you optimize. What can be removed entirely from this equation?",
      first_step: 'List the 3 real constraints that define your situation, then design within them.',
    },
    {
      id: 3,
      title: 'Let Purpose Lead the Way',
      inspired_by: ['Jay Shetty', 'theMITmonk', 'Jett Franzen'],
      tagline: 'The right path becomes clear when you reconnect to why',
      perspective:
        "Every significant decision has a deeper current beneath it — your values, your purpose, what you want your life to mean. Reconnecting to that transforms the question.",
      advice:
        "Jay Shetty would ask: 'Does this choice serve the person you're trying to become, or the person you're trying to escape from?' Sit with that honestly before taking any action.\n\nThe monk's insight is that most indecision comes from serving two masters — who you are and who others expect you to be. Clarity comes from choosing one.\n\nJett Franzen would frame it creatively: treat this moment as raw material, not a problem to solve. What would you make from it?",
      first_step: "Ask yourself: in 5 years, which choice will I be proud I made? Write that answer down.",
    },
  ];

  return {
    choices,
    council_note: 'The Council encountered a brief difficulty but offers these foundational perspectives.',
  };
}

// ── Generate a chat title ─────────────────────────────────────

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Fast small model for titles
      max_tokens: 30,
      messages: [
        {
          role: 'user',
          content: `Create a short, specific title (4-7 words) for a conversation that starts with this message. Return ONLY the title, no quotes, no punctuation at the end:\n\n"${userMessage}"`,
        },
      ],
    });
    const title = response.choices[0]?.message?.content?.trim() || userMessage.slice(0, 50);
    return title.replace(/^["']|["']$/g, '').slice(0, 80);
  } catch {
    return userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
  }
}
