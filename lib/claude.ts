import Anthropic from '@anthropic-ai/sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-opus-4-6';
const TITLE_MODEL = 'claude-haiku-4-5-20251001';
const THINKING_BUDGET = 10000;

// ─── Context builders ──────────────────────────────────────────────────────

async function buildCreatorContext(userMessage: string) {
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

async function buildIgnacioMindset(userMessage: string): Promise<string> {
  // book-ideas = cómo piensa Ignacio. Siempre incluir si hay contenido.
  const bookChunks = await searchTranscriptChunks('book-ideas', userMessage, 6).catch(() => []);
  if (bookChunks.length === 0) return '';
  return bookChunks.map((c) => c.chunk_text).join('\n').substring(0, 1800);
}

async function buildFrameworkContext(userMessage: string): Promise<string> {
  const sections: string[] = [];
  const nonBookFrameworks = FRAMEWORKS.filter((fw) => fw.id !== 'book-ideas');
  for (const fw of nonBookFrameworks) {
    try {
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 3);
      if (chunks.length > 0) {
        sections.push(chunks.map((c) => c.chunk_text).join(' ').substring(0, 700));
      }
    } catch {
      // optional
    }
  }
  return sections.join('\n\n');
}

// ─── Council members as known identities ──────────────────────────────────

function buildCouncilRoster(): string {
  return CREATORS.map((c) => `• ${c.name} — ${c.philosophy}`).join('\n');
}

function buildTranscriptBlock(
  contexts: Array<{ creator: (typeof CREATORS)[number]; chunks: Array<{ chunk_text: string; video_title: string }> }>
): string {
  const lines = contexts
    .filter(({ chunks }) => chunks.length > 0)
    .map(({ creator, chunks }) => {
      const text = chunks.map((c) => c.chunk_text).join(' ').substring(0, 800);
      return `[${creator.name}]\n${text}`;
    });
  return lines.join('\n\n');
}

// ─── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(councilRoster: string): string {
  return `Eres el SAGE COUNCIL — la voz unificada de 12 mentes que deliberan en privado y hablan con una sola respuesta. Los miembros del consejo son:

${councilRoster}

CÓMO FUNCIONA EL CONSEJO:
Cada miembro aporta su perspectiva basada en sus propios transcripts y enseñanzas. Internamente debaten. Donde hay tensión real entre perspectivas, el consejo la resuelve hacia la posición más honesta y útil para Ignacio específicamente — no hacia el consenso más cómodo. La respuesta final es UNA sola voz, no un resumen de opiniones.

QUIÉN ES IGNACIO (crítico — nunca respondas sin esto en mente):
Tienes acceso a sus ideas de libro — la forma en que estructura el pensamiento, los principios que ha construido, cómo conecta conceptos. Úsalo para hablarle exactamente en su lenguaje mental, no en el lenguaje genérico de autoayuda. Ignacio piensa en sistemas, odia las listas de opciones, y necesita que lo traten como alguien capaz de ejecutar cosas difíciles.

DOS REGLAS QUE NUNCA SE ROMPEN:
1. ELIMINAR DECISIONES — nunca presentes múltiples caminos. El consejo ya deliberó. Da UNA posición, una sola dirección. No "puedes hacer X o Y". Solo: esto es lo que el consejo ve claro.
2. TRADUCIR A ACCIÓN — toda respuesta termina en un paso concreto ejecutable en 24 horas. No un plan. No una reflexión. Un acto específico con suficiente detalle para que no haya ambigüedad sobre qué hacer.

CÓMO CONSTRUIR LA RESPUESTA:
— Primero: diagnostica qué está pasando realmente debajo de la pregunta. Lo que Ignacio pregunta a veces enmarca mal el problema real.
— Segundo: explica el mecanismo — por qué funciona así, qué fuerza psicológica, sistémica o humana opera aquí.
— Tercero: da la dirección del consejo. Fundamentada. Sin hedging. Como alguien que ya deliberó y llegó a una conclusión.
— El tono es el de un amigo muy inteligente que te dice la verdad aunque incomode, no el de un coach que valida todo.

EN CONVERSACIONES CON HISTORIAL:
Construye sobre lo ya dicho. Si Ignacio debate, responde al debate. Si pide más desarrollo, ve más adentro del mismo punto — no lo repitas con otras palabras.

IDIOMA: Siempre español. Siempre de tú.

LONGITUD: 4-6 párrafos densos para consultas nuevas. En follow-ups: más corto pero igual de preciso.

FORMATO DE SALIDA — prosa continua sin encabezados. Al final de la respuesta, en línea nueva:
PRIMER_PASO: [un solo acto, específico, con suficiente detalle para ejecutarlo hoy o mañana sin tener que pensar más]`;
}

// ─── History extraction ────────────────────────────────────────────────────

function extractAnswerText(content: string): string {
  if (content.includes('PRIMER_PASO:')) {
    return content.split(/\nPRIMER_PASO:/)[0].trim();
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed.answer) {
      const parts = [parsed.answer];
      if (parsed.first_step) parts.push(`[Próximo paso: ${parsed.first_step}]`);
      return parts.join('\n\n');
    }
    if (parsed.choices && Array.isArray(parsed.choices)) {
      return parsed.choices
        .map((c: { title?: string; perspective?: string; advice?: string }) =>
          [c.title, c.perspective, c.advice].filter(Boolean).join('\n\n')
        )
        .join('\n\n---\n\n')
        .substring(0, 1200);
    }
  } catch {
    // plain text
  }
  return content;
}

function parseResponse(rawText: string): CouncilResponse {
  const parts = rawText.split(/\nPRIMER_PASO:\s*/);
  if (parts.length >= 2) {
    return {
      answer: parts[0].trim(),
      first_step: parts[1].trim(),
    };
  }
  return {
    answer: rawText.trim(),
    first_step: 'Ejecuta el movimiento más obvio que surgió de esta conversación. Hoy.',
  };
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function generateCouncilResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<CouncilResponse> {

  // Fetch all context in parallel
  const [creatorContexts, ignacioMindset, frameworkContext] = await Promise.all([
    buildCreatorContext(userMessage),
    buildIgnacioMindset(userMessage),
    buildFrameworkContext(userMessage),
  ]);

  const transcriptBlock = buildTranscriptBlock(creatorContexts);
  const councilRoster = buildCouncilRoster();
  const systemPrompt = buildSystemPrompt(councilRoster);

  // Build the user prompt with layered context
  const parts: string[] = [];

  if (ignacioMindset) {
    parts.push(
      `CÓMO PIENSA IGNACIO — sus propias ideas y principios (usa esto para hablarle en su lenguaje):\n${ignacioMindset}`
    );
  }

  if (transcriptBlock) {
    parts.push(
      `SABIDURÍA DE LOS MIEMBROS DEL CONSEJO — extraída de sus propios transcripts para esta consulta (no cites de dónde viene, intégrala como perspectiva):\n${transcriptBlock}`
    );
  }

  if (frameworkContext) {
    parts.push(`CONTEXTO ADICIONAL:\n${frameworkContext}`);
  }

  parts.push(`CONSULTA DE IGNACIO:\n"${userMessage}"`);

  const userPrompt = parts.join('\n\n---\n\n');

  // Clean history
  const recentHistory = chatHistory.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? extractAnswerText(m.content) : m.content,
  }));

  let rawText = '';
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET,
      },
      system: systemPrompt,
      messages: [
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });

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
