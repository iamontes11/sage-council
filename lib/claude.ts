import Groq from 'groq-sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse, CouncilChoice } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

/** Fetch transcript chunks for all 12 council members in parallel */
async function buildCreatorContexts(userMessage: string) {
  const contexts = await Promise.all(
    CREATORS.map(async (creator) => {
      try {
        const chunks = await searchTranscriptChunks(creator.id, userMessage, 4);
        return { creator, chunks };
      } catch {
        return { creator, chunks: [] };
      }
    })
  );
  return contexts;
}

/** Fetch framework context from Sabrina (AI approach) + BookIdeas (principles) */
async function buildFrameworkContext(userMessage: string): Promise<string> {
  const sections: string[] = [];
  for (const fw of FRAMEWORKS) {
    try {
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 3);
      if (chunks.length > 0) {
        const text = chunks.map((c) => c.content).join(' ').substring(0, 600);
        sections.push(`[${fw.name} — ${fw.role}]
${text}`);
      }
    } catch {
      // framework context is optional; continue silently
    }
  }
  return sections.length > 0 ? sections.join('\n\n') : '';
}

function formatCreatorContext(
  creator: (typeof CREATORS)[number],
  chunks: Array<{ content: string; video_title: string }>
): string {
  if (chunks.length === 0) return '';
  const excerpts = chunks
    .map((c) => c.content)
    .join(' ')
    .substring(0, 800);
  return `[${creator.name}]
${creator.systemPrompt}
Relevant wisdom: ${excerpts}`;
}

const COUNCIL_SYSTEM_PROMPT = `You are the SAGE COUNCIL — a collaborative group of 12 distinct thinkers. Produce exactly 3 distinct choices as JSON only.

Each choice must represent a genuinely different perspective or path. Vary the council members who speak across responses.

CRITICAL: Output ONLY valid JSON in this exact format, no other text:
{
  "choices": [
    {
      "creatorId": "creator-id-slug",
      "creatorName": "Creator Name",
      "emoji": "🔥",
      "color": "#hexcolor",
      "title": "Short Action Title",
      "advice": "2-3 sentences of specific, actionable advice in this creator's distinct voice.",
      "actionStep": "One concrete first step the person can take today."
    }
  ]
}`;

export async function generateCouncilResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<CouncilResponse> {
  const [creatorContexts, frameworkContext] = await Promise.all([
    buildCreatorContexts(userMessage),
    buildFrameworkContext(userMessage),
  ]);

  const contextSections = creatorContexts
    .map(({ creator, chunks }) => formatCreatorContext(creator, chunks))
    .filter(Boolean);

  const transcriptBlock =
    contextSections.length > 0
      ? `## TRANSCRIPT WISDOM

${contextSections.join('\n\n')}`
      : '## No transcripts yet — draw on your deep knowledge of each thinker.';

  const frameworkBlock =
    frameworkContext
      ? `## BACKGROUND FRAMEWORK (shape your thinking — do not quote directly)

${frameworkContext}`
      : '';

  const recentHistory = chatHistory.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));

  const userPrompt = `${transcriptBlock}

${frameworkBlock}

Ignacio's question: "${userMessage}"

Respond with ONLY valid JSON.`;

  let response;
  try {
    response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.75,
      messages: [
        { role: 'system', content: COUNCIL_SYSTEM_PROMPT },
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (error) {
    console.error('Groq API error:', error);
    return buildFallbackResponse();
  }

  const rawText = response.choices[0]?.message?.content || '';
  const clean = rawText.replace(/^```jsons*/i, '').replace(/^```s*/i, '').replace(/s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(clean) as CouncilResponse;
    if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length !== 3) {
      throw new Error('Invalid structure');
    }
    return parsed;
  } catch {
    console.error('Failed to parse council response:', clean.substring(0, 200));
    return buildFallbackResponse();
  }
}

function buildFallbackResponse(): CouncilResponse {
  return {
    question: 'How can I improve my situation?',
    choices: [
      {
        creatorId: 'mark-manson',
        creatorName: 'Mark Manson',
        emoji: '🪨',
        color: '#E74C3C',
        title: 'Start With Radical Honesty',
        advice: 'Stop avoiding the uncomfortable truth. Real growth begins when you confront what you have been dodging.',
        actionStep: 'Write down one uncomfortable truth you have been avoiding and what it would mean to fully accept it.',
      },
      {
        creatorId: 'jay-shetty',
        creatorName: 'Jay Shetty',
        emoji: '🧘',
        color: '#795548',
        title: 'Let Purpose Lead',
        advice: 'Every challenge is an invitation to reconnect with your deeper why. Purpose transforms obstacles into teachers.',
        actionStep: 'Write three sentences about why this situation matters to your larger life mission.',
      },
      {
        creatorId: 'rick-rubin',
        creatorName: 'Rick Rubin',
        emoji: '🎨',
        color: '#7F8C8D',
        title: 'Strip It to the Signal',
        advice: 'Remove everything that is noise. The clearest path forward only becomes visible once you stop adding and start subtracting.',
        actionStep: 'Identify one thing you can stop doing this week that is not essential.',
      },
    ],
  };
}
