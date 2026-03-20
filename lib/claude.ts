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
function formatCreatorContext(creator: (typeof CREATORS)[number], chunks: Array<{ chunk_text: string; video_title: string }>): string { if (chunks.length === 0) return ''; const excerpts = chunks.map((c) => `  • [${c.video_title || 'video'}] ${c.chunk_text.slice(0, 300)}...`).join('\n'); return `### ${creator.name} (${creator.tagline})\n${excerpts}`; }
const COUNCIL_SYSTEM_PROMPT = `You are the SAGE COUNCIL — a collaborative group of 9 distinct thinkers. Produce exactly 3 distinct choices as JSON only.`;
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
function buildFallbackResponse(): CouncilResponse { return { choices: [{ id: 1, title: 'Start With Radical Honesty', inspired_by: ['Mark Manson'], tagline: 'Cut through noise', perspective: 'Be honest.', advice: 'Face it directly.', first_step: 'Write the truth.' }, { id: 2, title: 'Design a System', inspired_by: ['Sabrina Ramonov'], tagline: 'Structure wins', perspective: 'Build systems.', advice: 'Design your environment.', first_step: 'List constraints.' }, { id: 3, title: 'Let Purpose Lead', inspired_by: ['Jay Shetty'], tagline: 'Connect to why', perspective: 'Find purpose.', advice: 'Ask why.', first_step: 'Write your why.' }] }; }
export async function generateChatTitle(userMessage: string): Promise<string> { try { const response = await groq.chat.completions.create({ model: 'llama-3.1-8b-instant', max_tokens: 30, messages: [{ role: 'user', content: `Create a short title (4-7 words) for: "${userMessage}". Return ONLY the title.` }] }); const title = response.choices[0]?.message?.content?.trim() || userMessage.slice(0, 50); return title.replace(/^["']|["']$/g, '').slice(0, 80); } catch { return userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''); } }
