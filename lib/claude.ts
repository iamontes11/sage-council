import Groq from 'groq-sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

/** Fetch transcript chunks for all council members in parallel */
async function buildCreatorContexts(userMessage: string) {
  const contexts = await Promise.all(
    CREATORS.map(async (creator) => {
      try {
        const chunks = await searchTranscriptChunks(creator.id, userMessage, 3);
        return { creator, chunks };
      } catch {
        return { creator, chunks: [] };
      }
    })
  );
  return contexts;
}

/** Fetch framework context */
async function buildFrameworkContext(userMessage: string): Promise<string> {
  const sections: string[] = [];
  for (const fw of FRAMEWORKS) {
    try {
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 3);
      if (chunks.length > 0) {
        const text = chunks.map((c) => c.chunk_text).join(' ').substring(0, 600);
        sections.push(`[${fw.name}] ${text}`);
      }
    } catch {
      // framework context is optional
    }
  }
  return sections.length > 0 ? sections.join('\n\n') : '';
}

function formatCreatorContext(
  creator: (typeof CREATORS)[number],
  chunks: Array<{ chunk_text: string; video_title: string }>
): string {
  if (chunks.length === 0) return '';
  const excerpts = chunks
    .map((c) => c.chunk_text)
    .join(' ')
    .substring(0, 600);
  return `[${creator.name}] ${excerpts}`;
}

const COUNCIL_SYSTEM_PROMPT = `Eres el SAGE COUNCIL — una inteligencia colectiva sintetizada de 12 pensadores distintos que habla con UNA sola voz directa y clara a Ignacio.

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español
- Da UNA sola respuesta directa y concisa — nunca múltiples opciones ni listas de caminos
- NO menciones nombres de creadores ni de dónde viene el consejo. Solo da la respuesta
- NO digas "según Mark Manson" ni "como dice X". La sabiduría se aplica directamente
- Habla directo a Ignacio usando "tú" — personal, específico a su situación
- Sé conciso: 2-4 párrafos máximo para la respuesta principal
- Si la conversación tiene historial, mantén el contexto completo y sé coherente con lo ya dicho
- Al final, da UN paso concreto ejecutable en las próximas 24 horas

FORMATO DE SALIDA (solo JSON válido, sin markdown, sin backticks):
{
  "answer": "Respuesta directa en 2-4 párrafos. Sin atribuciones. Sin rodeos. Directo al grano con la sabiduría aplicada a la situación específica de Ignacio.",
  "first_step": "Un solo paso concreto que Ignacio puede tomar en las próximas 24 horas. Específico, ejecutable, claro."
}`;

/** Convert stored assistant content (JSON or plain text) to readable text for history */
function extractAnswerText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.answer) return parsed.answer;
    if (parsed.choices && Array.isArray(parsed.choices)) {
      // Legacy format: extract first choice perspective
      return parsed.choices.map((c: { title?: string; perspective?: string; advice?: string }) =>
        [c.title, c.perspective, c.advice].filter(Boolean).join('\n\n')
      ).join('\n\n---\n\n').substring(0, 1000);
    }
  } catch {
    // Not JSON, return as-is
  }
  return content;
}

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
      ? `## CONTEXTO INTERNO (usa esto para fundamentar tu respuesta — NO lo cites explícitamente)\n\n${contextSections.join('\n\n')}`
      : '## Sin transcripts — usa los frameworks de los pensadores que conoces.';

  const frameworkBlock = frameworkContext
    ? `## FRAMEWORKS DE FONDO\n\n${frameworkContext}`
    : '';

  // Build clean history — convert assistant JSON to readable text
  const recentHistory = chatHistory.slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? extractAnswerText(m.content) : m.content,
  }));

  const userPrompt = `${transcriptBlock}

${frameworkBlock}

Pregunta de Ignacio: "${userMessage}"

Responde con SOLO JSON válido.`;

  let response;
  try {
    response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
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
  const clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(clean) as CouncilResponse;
    if (!parsed.answer) throw new Error('Missing answer field');
    return parsed;
  } catch {
    console.error('Failed to parse council response:', clean.substring(0, 200));
    return buildFallbackResponse();
  }
}

function buildFallbackResponse(): CouncilResponse {
  return {
    answer:
      'El Consejo ve tu situación con claridad. La mayoría de las veces, la confusión no viene de falta de información sino de resistencia a actuar sobre lo que ya sabes. El primer movimiento siempre es el más importante — no porque sea perfecto, sino porque rompe la inercia.\n\nLo que necesitas no es más análisis. Necesitas ejecutar algo concreto hoy, observar qué pasa, y ajustar. La claridad llega con la acción, no antes.',
    first_step:
      'Identifica la UNA cosa que has estado evitando y hazla en las próximas 2 horas. No la planifiques — ejecútala.',
    choices: [],
  };
}

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Genera un título muy corto (3-5 palabras) en español para una conversación que empieza con: "${userMessage.slice(0, 200)}". Responde solo el título, sin comillas.`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() || 'Nueva Consulta';
  } catch {
    return 'Nueva Consulta';
  }
}
