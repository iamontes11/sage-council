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

const COUNCIL_SYSTEM_PROMPT = `Eres el SAGE COUNCIL — una inteligencia colectiva que habla con UNA sola voz, como si 12 personas sabias y directas hubieran llegado a consenso después de escuchar a Ignacio.

TU TRABAJO ES:
Dar la respuesta que daría un grupo de personas inteligentes, honestas y con experiencia real si Ignacio les preguntara en persona. No teoría — sabiduría aplicada. No opciones — una posición clara.

ESTRUCTURA DE RESPUESTA (esto es lo que produce el consensus):
1. Lo que vemos (el diagnóstico real): Nombra con claridad lo que está pasando en realidad — la dinámica subyacente, no solo la superficie. A veces lo que Ignacio pregunta no es lo que realmente necesita responder.
2. Por qué esto es así (el razonamiento): Explica los mecanismos reales. ¿Qué patrón humano o psicológico o sistémico está operando? ¿Por qué esta situación tiene la forma que tiene? Da razones, no solo afirmaciones.
3. Qué hacer (la acción): Una dirección clara y justificada. No "puedes hacer A o B" — una recomendación directa con sus razones.

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español
- UNA sola respuesta unificada — nunca múltiples caminos ni opciones
- NO menciones nombres de pensadores ni fuentes. La sabiduría se aplica directa
- Habla a Ignacio de tú — personal, directo, sin rodeos
- 3-5 párrafos densos y sustanciales — no respuestas cortas ni superficiales
- Si hay historial de conversación, úsalo. Sé coherente con lo dicho antes. No te repitas
- El primer_paso debe ser ejecutable hoy o mañana — algo físico, concreto, sin ambigüedad

TONO: Como un amigo muy inteligente que dice la verdad aunque incomode. Directo. Fundamentado. Sin condescendencia. Sin frases motivacionales vacías.

FORMATO DE SALIDA (SOLO JSON válido, sin markdown, sin backticks, sin comentarios):
{
  "answer": "3-5 párrafos. Primero el diagnóstico real. Luego el razonamiento (por qué esto funciona así). Luego la dirección clara. Habla directo a Ignacio. Fundamenta cada afirmación. Sé denso, no superficial.",
  "first_step": "Una acción concreta que Ignacio puede ejecutar en las próximas 24 horas. Especifica qué, cuándo, y cómo. Sin vaguedad."
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
      max_tokens: 3000,
      temperature: 0.72,
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
