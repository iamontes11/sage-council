import Anthropic from '@anthropic-ai/sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-opus-4-6';
const TITLE_MODEL = 'claude-haiku-4-5-20251001';

// Extended thinking: Claude razona internamente antes de responder
const THINKING_BUDGET = 8000;

/** Fetch transcript chunks for all council members in parallel */
async function buildCreatorContexts(userMessage: string) {
  const contexts = await Promise.all(
    CREATORS.map(async (creator) => {
      try {
        const chunks = await searchTranscriptChunks(creator.id, userMessage, 5);
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
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 4);
      if (chunks.length > 0) {
        const text = chunks.map((c) => c.chunk_text).join(' ').substring(0, 900);
        sections.push(`[${fw.name}] ${text}`);
      }
    } catch {
      // optional
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
    .substring(0, 900);
  return `[${creator.name}]: ${excerpts}`;
}

const COUNCIL_SYSTEM_PROMPT = `Eres el SAGE COUNCIL — doce mentes distintas que hablan con una sola voz después de llegar a consenso real. No eres un asistente. Eres el interlocutor más honesto e inteligente que Ignacio tiene.

QUIÉN ES IGNACIO:
Un individuo de alto rendimiento con fuerte pensamiento sistémico, mucha ambición, y una tendencia a sobreanalizar en lugar de ejecutar. Se frustra con respuestas genéricas. Lo que necesita es alguien que entienda exactamente qué está pasando en su situación específica y le hable con precisión quirúrgica.

CÓMO RESPONDER:
Antes de responder, diagnostica la pregunta real. A veces lo que Ignacio pregunta no es lo que necesita resolver. Identifica la tensión de fondo, el mecanismo que opera debajo de la superficie, y habla desde ahí.

Tu respuesta debe:
- Demostrar que entendiste exactamente la situación específica de Ignacio — no una situación genérica similar
- Explicar el mecanismo real: por qué funciona así, qué está generando lo que describe
- Dar una posición clara y fundamentada — no opciones, no listas, no frameworks con nombre
- Construir sobre el historial de conversación si existe — nunca repetir, siempre profundizar
- Ser incómoda si la verdad lo requiere — no validar por validar

TIPO DE RESPUESTA SEGÚN EL MENSAJE:
- Consulta nueva: diagnóstico → mecanismo → dirección clara
- Debate: si Ignacio tiene razón, concédelo con argumento. Si no la tiene, explica por qué con lógica
- Pide más desarrollo: ve más adentro del punto exacto, no repitas lo dicho
- Pide acción concreta: operacionaliza con quién, qué, cuándo, dónde, cómo

TONO: Amigo muy inteligente que dice la verdad aunque incomode. Directo. Sin condescendencia. Sin clichés motivacionales. Sin frases vacías. Cada oración debe ganar su lugar.

IDIOMA: Siempre en español. Siempre de tú.

LONGITUD: 4-6 párrafos sustanciales para consultas nuevas. Más corto en follow-ups, igual de denso.

FORMATO DE SALIDA — escribe en prosa continua, sin encabezados visibles. Al terminar el cuerpo de la respuesta, en una nueva línea escribe exactamente esto:
PRIMER_PASO: [una sola acción específica, física, ejecutable en las próximas 24 horas — no un plan, un acto]`;

/** Convert stored assistant content to readable text for history */
function extractAnswerText(content: string): string {
  // Handle new delimited format
  if (content.includes('PRIMER_PASO:')) {
    return content.split(/\nPRIMER_PASO:/)[0].trim();
  }
  // Handle legacy JSON format
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
    // plain text
  }
  return content;
}

/** Parse delimited response into answer + first_step */
function parseResponse(rawText: string): CouncilResponse {
  const primer = /\nPRIMER_PASO:\s*/;
  const parts = rawText.split(primer);

  if (parts.length >= 2) {
    return {
      answer: parts[0].trim(),
      first_step: parts[1].trim(),
    };
  }

  // No delimiter found — treat all as answer
  return {
    answer: rawText.trim(),
    first_step: 'Define el próximo movimiento concreto basado en la respuesta anterior y ejecútalo hoy.',
  };
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

  const contextBlock = contextSections.length > 0
    ? `INFORMACIÓN DE REFERENCIA (usa para fundamentar — nunca cites explícitamente de dónde viene):\n\n${contextSections.join('\n\n')}`
    : '';

  const frameworkBlock = frameworkContext
    ? `FRAMEWORKS RELEVANTES:\n\n${frameworkContext}`
    : '';

  // Build clean history
  const recentHistory = chatHistory.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? extractAnswerText(m.content) : m.content,
  }));

  // Build the user message with context
  const contextParts = [contextBlock, frameworkBlock].filter(Boolean).join('\n\n');
  const userPrompt = contextParts
    ? `${contextParts}\n\n---\n\nIgnacio dice: "${userMessage}"`
    : `Ignacio dice: "${userMessage}"`;

  let rawText = '';
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET,
      },
      system: COUNCIL_SYSTEM_PROMPT,
      messages: [
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });

    // Extract only text blocks — skip thinking blocks
    const textBlock = response.content.find((b) => b.type === 'text');
    rawText = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  } catch (error) {
    console.error('Anthropic API error:', error);
    return buildFallbackResponse();
  }

  if (!rawText) return buildFallbackResponse();

  return parseResponse(rawText);
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
          content: `Genera un título muy corto (3-5 palabras) en español para una conversación que empieza con: "${userMessage.slice(0, 200)}". Responde solo el título, sin comillas ni puntuación.`,
        },
      ],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text.trim() : 'Nueva Consulta';
  } catch {
    return 'Nueva Consulta';
  }
}
