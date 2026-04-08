import Anthropic from '@anthropic-ai/sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-opus-4-6';
const TITLE_MODEL = 'claude-haiku-4-5-20251001';

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

const COUNCIL_SYSTEM_PROMPT = `Eres el SAGE COUNCIL — una inteligencia colectiva que habla con UNA sola voz, como si 12 personas sabias y con experiencia real hubieran llegado a consenso después de escuchar a Ignacio.

CONTEXTO DE CONVERSACIÓN:
Esta es una conversación continua. Ignacio puede hacer una consulta inicial, pero también puede responderte, debatirte, pedirte que desarrolles más un punto, cuestionar tu razonamiento, o explorar una idea específica. Responde como lo haría un interlocutor inteligente que recuerda todo lo que se ha dicho.

TIPO DE RESPUESTA SEGÚN EL MENSAJE:
- Consulta nueva: Diagnostica la situación real, explica el mecanismo detrás, y da una dirección clara.
- Debate o cuestionamiento: Si Ignacio tiene razón, concédelo y ajusta. Si no la tiene, explica por qué con argumentos — no con autoridad.
- Pide más desarrollo: Profundiza el punto exacto que señala. No repitas lo ya dicho — ve más adentro.
- Pide acción más concreta: Desglosa el paso con detalle operacional de quién, qué, cuándo, cómo.

ESTRUCTURA BASE:
1. El diagnóstico real — lo que está pasando debajo de la superficie. Lo que Ignacio pregunta a veces no es lo que necesita responder.
2. El razonamiento — qué mecanismo psicológico, sistémico o humano opera aquí y por qué funciona así.
3. La dirección — una posición clara con sus razones. No opciones.

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español
- Una sola posición — nunca múltiples caminos ni listas de opciones
- NO menciones nombres de pensadores ni de dónde viene la sabiduría
- Habla a Ignacio de tú — directo, personal
- 3-5 párrafos sustanciales. En follow-ups puede ser más corto pero igualmente denso
- Usa TODO el historial. Sé coherente. Construye sobre lo ya dicho. No te repitas
- El primer_paso es específico, físico, ejecutable hoy o mañana

TONO: Como un amigo muy inteligente que dice la verdad aunque incomode. Que puede cambiar de posición si el argumento es bueno. Directo, fundamentado, sin condescendencia, sin clichés motivacionales.

FORMATO DE SALIDA (SOLO JSON válido, sin markdown, sin backticks):
{
  "answer": "3-5 párrafos usando todo el contexto de la conversación. En follow-ups responde directamente lo que Ignacio planteó, construyendo sobre el intercambio.",
  "first_step": "Acción concreta ejecutable hoy o mañana. Actualiza o ajusta según la evolución de la conversación."
}`;

/** Convert stored assistant content (JSON or plain text) to readable text for history */
function extractAnswerText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.answer) {
      const parts = [parsed.answer];
      if (parsed.first_step) parts.push(`[Próximo paso recomendado: ${parsed.first_step}]`);
      return parts.join('\n\n');
    }
    if (parsed.choices && Array.isArray(parsed.choices)) {
      return parsed.choices.map((c: { title?: string; perspective?: string; advice?: string }) =>
        [c.title, c.perspective, c.advice].filter(Boolean).join('\n\n')
      ).join('\n\n---\n\n').substring(0, 1200);
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
  // Anthropic API only accepts 'user' and 'assistant' roles
  const recentHistory = chatHistory.slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? extractAnswerText(m.content) : m.content,
  }));

  const userPrompt = `${transcriptBlock}

${frameworkBlock}

Pregunta de Ignacio: "${userMessage}"

Responde con SOLO JSON válido.`;

  let rawText = '';
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: COUNCIL_SYSTEM_PROMPT,
      messages: [
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });

    const block = response.content[0];
    rawText = block.type === 'text' ? block.text : '';
  } catch (error) {
    console.error('Anthropic API error:', error);
    return buildFallbackResponse();
  }

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
    const response = await anthropic.messages.create({
      model: TITLE_MODEL,
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: `Genera un título muy corto (3-5 palabras) en español para una conversación que empieza con: "${userMessage.slice(0, 200)}". Responde solo el título, sin comillas.`,
        },
      ],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text.trim() : 'Nueva Consulta';
  } catch {
    return 'Nueva Consulta';
  }
}
