import Groq from 'groq-sdk';
import { CREATORS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse, CouncilChoice } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});
const MODEL = 'llama-3.3-70b-versatile';
async function buildCreatorContexts(userMessage: string) {
  const contexts = await Promise.all(CREATORS.map(async (creator) => { try { const chunks = await searchTranscriptChunks(creator.id, userMessage, 4); return { creator, chunks }; } catch { return { creator, chunks: [] }; } })); return contexts; }
function formatCreatorContext(creator: (typeof CREATORS)[number], chunks: Array<{ content: string; video_title: string }>): string { if (chunks.length === 0) return ''; const excerpts = chunks.map((c) => `  Ã¢ÂÂ¢ [${c.video_title || 'video'}] ${c.content.slice(0, 300)}...`).join('\n'); return `### ${creator.name} (${creator.tagline})\n${excerpts}`; }
const COUNCIL_SYSTEM_PROMPT = `You are the SAGE COUNCIL Ã¢ÂÂ a collaborative group of 9 distinct thinkers. Produce exactly 3 distinct choices as JSON only.`;
export async function generateCouncilResponse(userMessage: string, chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<CouncilResponse> {
  const creatorContexts = await buildCreatorContexts(userMessage);
  const contextSections = creatorContexts.map(({ creator, chunks }) => formatCreatorContext(creator, chunks)).filter(Boolean);
  const contextBlock = contextSections.length > 0 ? `## TRANSCRIPT\n\n${contextSections.join('\n\n')}` : `## No transcripts yet`;
  const recentHistory = chatHistory.slice(-6).map((m) => ({ role: m.role as 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }));
  const userPrompt = `${contextBlock}\n\nIgnacios question: "${userMessage}"\n\nRespond with ONLY Json.`;
  let response;
  try { response = await groq.chat.completions.create({ model: MODEL, max_tokens: 4000, temperature: 0.75, messages: [{ role: 'system', content: COUNCIL_SYSTEM_PROMPT }, ...recentHistory, { role: 'user', content: userPrompt }] }); } catch (error) { throw new Error('Failed to reach the Sage Council.'); }
  const rawText = response.choices[0]?.message?.content || '';
  const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try { const parsed = JSON.parse(clean) as CouncilResponse; if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length !== 3) throw new Error('Invalid structure'); return parsed; } catch { return buildFallbackResponse(); }
}
function buildFallbackResponse(): CouncilResponse {
  return {
    question: 'How can I improve my life?',
    choices: [
      {
        creatorId: 'mark-manson',
        creatorName: 'Mark Manson',
        emoji: 'ð¥',
        color: '#ef4444',
        title: 'Start With Radical Honesty',
        advice: 'Stop avoiding the uncomfortable truth. Real growth begins when you confront what you have been dodging.',
        actionStep: 'Write down one uncomfortable truth you have been avoiding and what it would mean to fully accept it.',
      },
      {
        creatorId: 'jay-shetty',
        creatorName: 'Jay Shetty',
        emoji: 'ð§',
        color: '#8b5cf6',
        title: 'Let Purpose Lead',
        advice: 'Every challenge is an invitation to reconnect with your deeper why. Purpose transforms obstacles into teachers.',
        actionStep: 'Write three sentences about why this situation matters to your larger life mission.',
      },
      {
        creatorId: 'sabrina-ramonov',
        creatorName: 'Sabrina Ramonov',
        emoji: 'â¡',
        color: '#06b6d4',
        title: 'Design a System',
        advice: 'Motivation fades but systems endure. Build an environment that makes the right action the default action.',
        actionStep: 'Identify one friction point and redesign it to make the desired behavior automatic.',
      },
    ],
  };
}
export async function generateChatTitle(userMessage: string): Promise<string> { try { const response = await groq.chat.completions.create({ model: 'llama-3.1-8b-instant', max_tokens: 30, messages: [{ role: 'user', content: `Create a short title (4-7 words) for: "${userMessage}". Return ONLY the title.` }] }); const title = response.choices[0]?.message?.content?.trim() || userMessage.slice(0, 50); return title.replace(/^["']|["']$/g, '').slice(0, 80); } catch { return userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''); } }
